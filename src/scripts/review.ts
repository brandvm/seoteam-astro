import reviewStyles from '../styles/review.css?inline';
import {dragBounds,isAreaDrag,contains,normalizeSelection,projectSelection,edgeScrollSpeed,type Point,type Bounds} from './review-geometry';
const reviewStyle=document.createElement('style');reviewStyle.textContent=reviewStyles;document.head.append(reviewStyle);

type Reaction={emoji:string;count:number;mine:boolean};
type Message={id:number;thread_id:number;name:string;body:string;created_at:number;reactions:Reaction[]};
type Thread={id:number;anchor:string;anchor_label:string;x:number;y:number;resolved:number;resolved_by:string|null;resolved_at:number|null;created_at:number;width:number;height:number;selection_type:'point'|'area'};
type Summary=Thread&{name:string;body:string;message_id:number;reply_count:number;reactions:Reaction[]};
type Detail={thread:Thread;root:Message;replies:Message[];next:number|null};
type Anchor={anchor:string;anchorLabel:string;x:number;y:number;width?:number;height?:number;selectionType?:'point'|'area'};
const API=(import.meta.env.PUBLIC_REVIEW_API||'https://seo-team-toronto-redesign.brandvision.chatgpt.site/api/review').replace(/\/$/,'');
const storage={get(key:string){try{return localStorage.getItem(key);}catch{return null;}},set(key:string,value:string){try{localStorage.setItem(key,value);}catch{/* Identity and drafts still work for this visit. */}}};
let visitor=storage.get('seo-review-visitor');
if(!visitor||!/^[0-9a-f-]{36}$/i.test(visitor)){visitor=crypto.randomUUID();storage.set('seo-review-visitor',visitor);}
const visitorId=visitor;
function el<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text=''):HTMLElementTagNameMap[K]{const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;}
function button(text:string,fn:()=>void,className='rv-button'){const b=el('button',className,text);b.type='button';b.addEventListener('click',fn);return b;}
function time(value:number){return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(value);}
const root=el('div','rv-root');root.id='review-root';document.body.append(root);
const anchors=new Map<string,HTMLElement>();
const locations=[['page','Entire page'],['header','Navigation'],['hero','Hero'],['services','Services'],['why-seo-team','Why SEO Team'],['approach','Our approach'],['case-studies','Case studies'],['industries','Industries'],['research','Research'],['testimonials','Testimonials'],['contact','Contact'],['footer','Footer']];
for(const [key] of locations){
 const scope=key==='page'?document.body:key==='header'?document.querySelector<HTMLElement>('.site-header'):key==='footer'?document.querySelector<HTMLElement>('.site-footer'):document.getElementById(key);
 if(!scope)continue;anchors.set(key,scope);if(key==='page')continue;scope.dataset.reviewAnchor=key;
 const counters:Record<string,number>={};
 scope.querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,img,a,article').forEach(node=>{const tag=node.tagName.toLowerCase();const n=counters[tag]||0;counters[tag]=n+1;const anchor=`${key}:${tag}:${n}`;node.dataset.reviewAnchor=anchor;anchors.set(anchor,node);});
}
let list:Summary[]=[],counts={total:0,open:0,resolved:0},filter='open',listPages=1,listNext:number|null=null;
let selected:number|null=null,detail:Detail|null=null,replyPages=1,panelOpen=true,picking=false,busy=false;
let draftAnchor:Anchor|null=null,listSequence=0,detailSequence=0,detailSignature='',listSignature='';
const drafts=new Map<string,string>(),requests=new Map<string,{fingerprint:string;id:string}>();
const canvas=el('div','rv-canvas');canvas.hidden=true;canvas.setAttribute('aria-hidden','true');root.append(canvas);
const regions=el('div','rv-regions');const pins=el('div','rv-pins');root.append(regions,pins);
const draftRegion=el('div','rv-region rv-region-draft');draftRegion.hidden=true;regions.append(draftRegion);
const draftPin=el('div','rv-pin rv-draft-pin','+');draftPin.setAttribute('aria-hidden','true');draftPin.hidden=true;pins.append(draftPin);
const panel=el('aside','rv-panel');panel.id='review-panel';panel.setAttribute('aria-label','Shared page comments');root.append(panel);
const top=el('div','rv-top');const title=el('div');title.append(el('span','rv-eyebrow','WEBSITE REVIEW'),el('h2','','Comments'));
const close=button('×',dismissPanel,'rv-icon-button');close.setAttribute('aria-label','Hide comment panel');top.append(title,close);panel.append(top);
panel.append(el('p','rv-intro','Shared feedback. No sign-in required.'));
const identity=el('label','rv-identity');identity.append(el('span','','Your display name'));
const nameInput=el('input');nameInput.type='text';nameInput.setAttribute('autocomplete','nickname');nameInput.maxLength=50;nameInput.placeholder='Enter your name';nameInput.value=storage.get('seo-review-name')||'';identity.append(nameInput);panel.append(identity);
nameInput.addEventListener('input',()=>storage.set('seo-review-name',nameInput.value));
const status=el('div','rv-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.hidden=true;panel.append(status);
const noticeText=el('span');const retry=button('Retry connection',()=>{notify('Refreshing comments…');void sync().then(()=>{if(noticeText.textContent==='Refreshing comments…')notify();});},'rv-inline');status.append(noticeText,retry);
const listView=el('div','rv-list-view');panel.append(listView);
const filters=el('div','rv-filters');filters.setAttribute('aria-label','Filter comments');listView.append(filters);
for(const value of ['open','resolved','all']){const b=button(value[0].toUpperCase()+value.slice(1),()=>{filter=value;listPages=1;listSignature='';void loadList();},'rv-filter');b.dataset.filter=value;b.setAttribute('aria-pressed',String(value===filter));filters.append(b);}
const listBody=el('div','rv-list');listBody.setAttribute('aria-label','Comment threads');listView.append(listBody);
const listMore=button('Load more comments',()=>{listPages++;void loadList();},'rv-load-more');listMore.hidden=true;listView.append(listMore);
const listActions=el('div','rv-list-actions');listActions.append(button('Click or drag to comment',startPicking,'rv-primary'),button('General page comment',()=>compose({anchor:'page',anchorLabel:'Entire page',x:5000,y:0}),'rv-button'));listView.append(listActions);
const threadView=el('div','rv-thread-view');threadView.hidden=true;panel.append(threadView);
const threadNav=el('div','rv-thread-nav');threadNav.append(button('← All comments',showList,'rv-inline'));
const share=button('Copy link',()=>void copyLink(),'rv-inline');threadNav.append(share);threadView.append(threadNav);
const threadHeading=el('div','rv-thread-heading');threadView.append(threadHeading);
const threadActions=el('div','rv-thread-actions');const resolveButton=button('Resolve thread',()=>void resolveThread(),'rv-button');threadActions.append(resolveButton);threadView.append(threadActions);
const messages=el('div','rv-messages');threadView.append(messages);
const replyForm=el('form','rv-compose');const replyLabel=el('label','','Reply to this thread');replyLabel.htmlFor='review-reply';const replyInput=el('textarea');replyInput.id='review-reply';replyInput.maxLength=3000;replyInput.rows=3;replyInput.placeholder='Add to the conversation…';replyInput.required=true;
const replySubmit=el('button','rv-primary','Post reply');replySubmit.type='submit';replyForm.append(replyLabel,replyInput,replySubmit);threadView.append(replyForm);
replyInput.addEventListener('input',()=>{if(selected)drafts.set('reply:'+selected,replyInput.value);});
replyForm.addEventListener('submit',e=>{e.preventDefault();void postReply();});
const composeView=el('div','rv-new-view');composeView.hidden=true;panel.append(composeView);
composeView.append(button('← Back to comments',showList,'rv-inline'),el('h3','','New comment'));
const newForm=el('form','rv-compose');const locationLabel=el('label','','Comment location');locationLabel.htmlFor='review-location';const locationSelect=el('select');locationSelect.id='review-location';
for(const [key,label] of locations){const o=el('option','',label);o.value=key;locationSelect.append(o);}
const pinLabel=el('p','rv-pin-label');const repin=button('Change location',startPicking,'rv-inline');
locationSelect.addEventListener('change',()=>{draftAnchor={anchor:locationSelect.value,anchorLabel:locations.find(v=>v[0]===locationSelect.value)?.[1]||'Page',x:5000,y:0};pinLabel.textContent=draftAnchor.anchorLabel;positionPins();});
const newLabel=el('label','','Your comment');newLabel.htmlFor='review-new-comment';const newInput=el('textarea');newInput.id='review-new-comment';newInput.rows=5;newInput.maxLength=3000;newInput.required=true;newInput.placeholder='What would you like to change or discuss?';newInput.addEventListener('input',()=>drafts.set('new',newInput.value));
const newSubmit=el('button','rv-primary','Post comment');newSubmit.type='submit';const locationOptions=el('details','rv-location-options');locationOptions.append(el('summary','','Choose a section instead'),locationLabel,locationSelect);newForm.append(pinLabel,repin,newLabel,newInput,newSubmit,locationOptions);newForm.addEventListener('submit',e=>{e.preventDefault();void postThread();});composeView.append(newForm);
const footer=el('div','rv-panel-footer','Anyone with this link can comment, reply, react, and resolve threads.');panel.append(footer);
const toolbar=el('div','rv-toolbar');root.append(toolbar);
const launcher=button('Comments',()=>panelOpen?dismissPanel():showList(),'rv-launcher');launcher.setAttribute('aria-controls','review-panel');launcher.setAttribute('aria-expanded','true');
const browseButton=button('↖ Browse',()=>{stopPicking();dismissPanel();},'rv-toolbar-tool');browseButton.setAttribute('aria-label','Browse the page (V)');browseButton.setAttribute('aria-pressed','true');
const pinButton=button('Comment',startPicking,'rv-toolbar-pin');pinButton.setAttribute('aria-label','Comment: click for a pin, drag for an area (C)');pinButton.setAttribute('aria-pressed','false');
const exitLink=el('a','rv-exit','Exit review');const exitURL=new URL(location.href);exitURL.searchParams.delete('view');exitURL.searchParams.delete('thread');exitLink.href=exitURL.href;toolbar.append(browseButton,pinButton,launcher,exitLink);
const pickingBanner=el('div','rv-picking-banner');pickingBanner.hidden=true;pickingBanner.append(el('span','','Click to pin · Drag to select an area'),button('Browse instead',stopPicking,'rv-inline'));root.append(pickingBanner);
function notify(message='',error=false){noticeText.textContent=message;status.hidden=!message;status.classList.toggle('rv-error',error);retry.hidden=!error;}
function displayName(){const name=nameInput.value.trim();if(!name){setPanel(true);nameInput.focus();notify('Enter a display name to join the conversation.');return null;}return name;}
function setPanel(open:boolean,focus=true){panelOpen=open;panel.hidden=!open;launcher.setAttribute('aria-expanded',String(open));if(!open&&focus)launcher.focus({preventScroll:true});if(open)schedulePins();}
function threadURL(threadId:number|null){const url=new URL(location.href);if(threadId)url.searchParams.set('thread',String(threadId));else url.searchParams.delete('thread');return url;}
function setURL(threadId:number|null){history.replaceState(null,'',threadURL(threadId));}
function contextual(on:boolean,thread=false){panel.classList.toggle('rv-contextual',on);panel.classList.toggle('rv-thread-popover',on&&thread);title.querySelector('h2')!.textContent=on?(thread?'Conversation':'New comment'):'Comments';if(!on){panel.style.left='';panel.style.top='';}}
function dismissPanel(){cancelGesture();selected=null;detail=null;detailSequence++;draftAnchor=null;listView.hidden=false;threadView.hidden=true;composeView.hidden=true;contextual(false);setURL(null);setPanel(false);renderPins();}
function showList(){cancelGesture();selected=null;detail=null;detailSequence++;draftAnchor=null;listView.hidden=false;threadView.hidden=true;composeView.hidden=true;contextual(false);setURL(null);setPanel(true);renderPins();void loadList();}
function compose(anchor:Anchor){cancelGesture();draftAnchor=anchor;selected=null;detail=null;detailSequence++;listView.hidden=true;threadView.hidden=true;composeView.hidden=false;locationSelect.value=anchor.anchor.split(':')[0];pinLabel.textContent=(anchor.selectionType==='area'?'Selected area · ':'Pin · ')+anchor.anchorLabel;newInput.value=drafts.get('new')||'';contextual(anchor.anchor!=='page'||anchor.selectionType==='area');setPanel(true);setURL(null);renderPins();newInput.focus({preventScroll:true});}
function startPicking(){cancelGesture();selected=null;detail=null;detailSequence++;draftAnchor=null;setURL(null);picking=true;setPanel(false);canvas.hidden=false;pickingBanner.hidden=false;pinButton.setAttribute('aria-pressed','true');browseButton.setAttribute('aria-pressed','false');document.documentElement.classList.add('rv-picking');renderPins();notify();}
function stopPicking(){cancelGesture();picking=false;canvas.hidden=true;pickingBanner.hidden=true;pinButton.setAttribute('aria-pressed','false');browseButton.setAttribute('aria-pressed','true');document.documentElement.classList.remove('rv-picking');}
type Gesture={pointerId:number;start:Point;end:Point;clientX:number;clientY:number;target:HTMLElement};
let gesture:Gesture|null=null,autoScrollFrame=0;
const docPoint=(e:PointerEvent):Point=>({x:e.clientX+scrollX,y:e.clientY+scrollY});
function boundsOf(node:HTMLElement,documentSpace=false):Bounds{const r=node.getBoundingClientRect();return {x:r.left+(documentSpace?scrollX:0),y:r.top+(documentSpace?scrollY:0),width:r.width,height:r.height};}
function hitAnchor(x:number,y:number){for(const element of document.elementsFromPoint(x,y)){if(root.contains(element))continue;const node=element.closest<HTMLElement>('[data-review-anchor]');if(node)return node;}return document.body;}
function anchorForArea(box:Bounds){let best={key:'page',node:document.body,size:Number.POSITIVE_INFINITY};for(const [key,node] of anchors){const r=boundsOf(node,true);if(contains(r,box)&&r.width*r.height<best.size)best={key,node,size:r.width*r.height};}return best;}
function cancelGesture(){const previous=gesture;gesture=null;if(autoScrollFrame){cancelAnimationFrame(autoScrollFrame);autoScrollFrame=0;}if(previous&&canvas.hasPointerCapture(previous.pointerId))canvas.releasePointerCapture(previous.pointerId);paintDraft();}
function autoScroll(){autoScrollFrame=0;if(!gesture||!isAreaDrag(gesture.start,gesture.end))return;const speed=edgeScrollSpeed(gesture.clientY,innerHeight);if(speed){window.scrollBy({top:speed,behavior:'instant'});gesture.end={x:gesture.clientX+scrollX,y:gesture.clientY+scrollY};paintDraft();autoScrollFrame=requestAnimationFrame(autoScroll);}}
canvas.addEventListener('pointerdown',e=>{if(!picking||busy||!e.isPrimary||e.button!==0||gesture)return;e.preventDefault();const target=hitAnchor(e.clientX,e.clientY);const start=docPoint(e);draftAnchor=null;selected=null;detail=null;detailSequence++;setURL(null);setPanel(false,false);gesture={pointerId:e.pointerId,start,end:start,clientX:e.clientX,clientY:e.clientY,target};canvas.setPointerCapture(e.pointerId);renderPins();});
canvas.addEventListener('pointermove',e=>{if(!gesture||gesture.pointerId!==e.pointerId)return;e.preventDefault();gesture.end=docPoint(e);gesture.clientX=e.clientX;gesture.clientY=e.clientY;paintDraft();if(!autoScrollFrame)autoScrollFrame=requestAnimationFrame(autoScroll);});
canvas.addEventListener('pointerup',e=>{if(!gesture||gesture.pointerId!==e.pointerId)return;e.preventDefault();gesture.end=docPoint(e);const finished=gesture;const area=isAreaDrag(finished.start,finished.end);const anchor=area?anchorForArea(dragBounds(finished.start,finished.end)):{key:finished.target.dataset.reviewAnchor||'page',node:finished.target};cancelGesture();try{const geometry=normalizeSelection(finished.start,finished.end,boundsOf(anchor.node,true));const section=anchor.key.split(':')[0];const sectionLabel=locations.find(v=>v[0]===section)?.[1]||'Page';const label=area?sectionLabel:anchor.node instanceof HTMLImageElement?anchor.node.alt:anchor.node.textContent||sectionLabel;compose({anchor:anchor.key,anchorLabel:label.trim().replace(/\s+/g,' ').slice(0,120)||sectionLabel,...geometry});}catch{notify('Please select a visible area on the page.');setPanel(true);}});
canvas.addEventListener('pointercancel',cancelGesture);canvas.addEventListener('lostpointercapture',()=>{if(gesture)cancelGesture();});canvas.addEventListener('click',e=>e.preventDefault());
addEventListener('blur',cancelGesture);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(gesture)cancelGesture();else if(panelOpen||draftAnchor||selected)dismissPanel();else stopPicking();return;}if(e.ctrlKey||e.metaKey||e.altKey||e.target instanceof Element&&e.target.closest('input,textarea,select,[contenteditable="true"]'))return;if(e.key.toLowerCase()==='c'){e.preventDefault();startPicking();}if(e.key.toLowerCase()==='v'){e.preventDefault();stopPicking();dismissPanel();}});
async function api(path:string,method='GET',data?:unknown){
 const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(API+path,{method,headers:{'X-Review-Visitor':visitorId,...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:controller.signal,credentials:'omit',cache:'no-store'});const result=await response.json().catch(()=>null);if(!response.ok)throw new Error(result?.error||'Comments are temporarily unavailable. Please try again.');if(!result)throw new Error('Comments are temporarily unavailable. Please try again.');return result;}
 catch(e){if(e instanceof Error&&e.name!=='AbortError'&&e.message!=='Failed to fetch')throw e;throw new Error('Could not reach shared comments. Your draft is still here. Please try again.');}
 finally{clearTimeout(timer);}
}
function requestId(key:string,data:unknown){const fingerprint=JSON.stringify(data);const current=requests.get(key);if(current?.fingerprint===fingerprint)return current.id;const id=crypto.randomUUID();requests.set(key,{fingerprint,id});return id;}
async function action(fn:()=>Promise<void>){if(busy)return;busy=true;for(const b of [newSubmit,replySubmit,resolveButton])b.disabled=true;try{notify('Saving…');await fn();if(noticeText.textContent==='Saving…')notify();}catch(e){notify((e as Error).message,true);}finally{busy=false;for(const b of [newSubmit,replySubmit,resolveButton])b.disabled=false;}}
async function postThread(){const name=displayName();if(!name||!draftAnchor||!newInput.value.trim())return;const data={...draftAnchor,name,body:newInput.value.trim()};await action(async()=>{const result=await api('/threads','POST',{...data,requestId:requestId('new',data)});drafts.delete('new');newInput.value='';draftAnchor=null;await openThread(result.id,false);await loadList();});}
async function postReply(){const name=displayName();if(!name||!selected||!replyInput.value.trim())return;const threadId=selected,data={name,body:replyInput.value.trim()};await action(async()=>{await api(`/threads/${threadId}/replies`,'POST',{...data,requestId:requestId('reply:'+threadId,data)});drafts.delete('reply:'+threadId);replyInput.value='';await loadDetail();await loadList();messages.scrollTop=messages.scrollHeight;});}
async function resolveThread(){const name=displayName();if(!name||!detail)return;const target=detail.thread;await action(async()=>{await api(`/threads/${target.id}`,'PATCH',{name,resolved:!target.resolved});await loadDetail();await loadList();});}
async function copyLink(){if(!selected)return;try{await navigator.clipboard.writeText(threadURL(selected).href);notify('Thread link copied.');}catch{notify('Copy the page address to share this thread.');}}
async function openThread(threadId:number,scroll=true){cancelGesture();selected=threadId;detail=null;detailSignature='';replyPages=1;draftAnchor=null;composeView.hidden=true;listView.hidden=true;threadView.hidden=false;threadHeading.replaceChildren(el('h3','',`Comment #${threadId}`));messages.replaceChildren(el('p','rv-empty','Loading thread…'));replyInput.value=drafts.get('reply:'+threadId)||'';contextual(true,true);setPanel(true);setURL(threadId);await loadDetail();if(selected!==threadId)return;const loaded=detail as Detail|null;if(loaded){contextual(loaded.thread.anchor!=='page'||loaded.thread.selection_type==='area',true);schedulePins();}if(scroll&&loaded){const box=geometryFor(loaded.thread);if(box)window.scrollTo({top:Math.max(0,scrollY+box.y+box.height-innerHeight*.4),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});} }
async function loadList(){
 const seq=++listSequence;try{let before:number|null=null;const rows:Summary[]=[];let pageCounts=counts;
 for(let page=0;page<listPages;page++){const result=await api(`/threads?status=${filter}${before?'&before='+before:''}`);rows.push(...result.threads);pageCounts=result.counts;before=result.next;if(!before)break;}
 if(seq!==listSequence)return;list=rows;counts=pageCounts;listNext=before;renderList();renderPins();if(noticeText.textContent==='Loading shared comments…')notify();
 }catch(e){if(seq===listSequence)notify((e as Error).message,true);}
}
async function loadDetail(){
 if(!selected)return;const current=selected,seq=++detailSequence;try{let before:number|null=null,result:Detail|null=null;const replies:Message[]=[];
 for(let page=0;page<replyPages;page++){const next:Detail=await api(`/threads/${current}${before?'?before='+before:''}`);result=next;replies.unshift(...next.replies);before=next.next;if(!before)break;}
 if(seq!==detailSequence||selected!==current||!result)return;detail={...result,replies,next:before};renderDetail();renderPins();
 }catch(e){if(selected===current&&seq===detailSequence)notify((e as Error).message,true);}
}
function renderList(){
 launcher.textContent=`Comments · ${counts.total}`;
 for(const b of filters.querySelectorAll<HTMLButtonElement>('button')){const type=b.dataset.filter!;b.setAttribute('aria-pressed',String(type===filter));const count=type==='all'?counts.total:type==='open'?counts.open:counts.resolved;b.textContent=type[0].toUpperCase()+type.slice(1)+` (${count})`;}
 listMore.hidden=!listNext;
 const signature=JSON.stringify([filter,list]);if(signature===listSignature)return;listSignature=signature;
 listBody.replaceChildren();if(!list.length){listBody.append(el('h3','rv-empty-title',counts.total?'No '+filter+' threads':'Start the conversation'),el('p','rv-empty',counts.total?'Choose another filter, or leave a new comment.':'Click anywhere to pin a comment, or drag a box around an area.'));return;}
 for(const thread of list){
  const card=button('',()=>void openThread(thread.id),'rv-thread-card');card.setAttribute('aria-label',`Open comment ${thread.id} by ${thread.name}`);
  const meta=el('div','rv-card-meta');meta.append(el('strong','',`#${thread.id} · ${thread.name}`),el('span','',thread.resolved?'Resolved':'Open'));
  card.append(meta,el('p','rv-card-body',thread.body),el('span','rv-card-location',(thread.selection_type==='area'?'▧ Area · ':'')+thread.anchor_label));
  const foot=el('div','rv-card-foot');foot.append(el('span','',`${thread.reply_count} ${thread.reply_count===1?'reply':'replies'}`),el('time','',time(thread.created_at)));card.append(foot);listBody.append(card);
 }
}
function reactionButtons(message:Message){const row=el('div','rv-reactions');const labels:Record<string,string>={'👍':'Thumbs up','❤️':'Heart','👀':'Eyes'};
 for(const reaction of message.reactions){const b=button(`${reaction.emoji} ${reaction.count||''}`,()=>void action(async()=>{await api(`/messages/${message.id}/reactions`,'PUT',{emoji:reaction.emoji,active:!reaction.mine});await loadDetail();await loadList();}),'rv-reaction');b.setAttribute('aria-label',`${labels[reaction.emoji]}, ${reaction.count} ${reaction.count===1?'reaction':'reactions'}`);b.setAttribute('aria-pressed',String(reaction.mine));b.dataset.focusKey=`reaction-${message.id}-${reaction.emoji}`;row.append(b);}return row;}
function messageCard(message:Message,isRoot=false){const card=el('article','rv-message');const meta=el('div','rv-message-meta');const initials=message.name.trim().split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();const avatar=el('span','rv-avatar',initials);avatar.setAttribute('aria-hidden','true');const author=el('div');author.append(el('strong','',message.name),el('time','',time(message.created_at)));meta.append(avatar,author);if(isRoot)meta.append(el('span','rv-original','Original'));card.append(meta,el('p','rv-message-body',message.body),reactionButtons(message));return card;}
function renderDetail(){if(!detail)return;const signature=JSON.stringify(detail);if(signature===detailSignature)return;detailSignature=signature;
 const active=document.activeElement instanceof HTMLElement?document.activeElement.dataset.focusKey:null;const scroll=messages.scrollTop;
 const t=detail.thread;threadHeading.replaceChildren(el('h3','',`Comment #${t.id}`),el('p','rv-thread-location',(t.selection_type==='area'?'Selected area · ':'')+t.anchor_label));
 if(t.resolved)threadHeading.append(el('p','rv-resolved-note',`Resolved by ${t.resolved_by||'a reviewer'}${t.resolved_at?' · '+time(t.resolved_at):''}`));
 resolveButton.textContent=t.resolved?'Reopen thread':'✓ Resolve thread';resolveButton.setAttribute('aria-label',t.resolved?'Reopen this thread':'Resolve this thread');
 messages.replaceChildren(messageCard(detail.root,true));
 if(detail.next){const older=button('Load earlier replies',()=>{replyPages++;void loadDetail();},'rv-load-more');messages.append(older);}
 if(detail.replies.length)messages.append(el('div','rv-reply-divider','Replies'));
 for(const reply of detail.replies)messages.append(messageCard(reply));messages.scrollTop=scroll;
 if(active){for(const b of messages.querySelectorAll<HTMLButtonElement>('[data-focus-key]'))if(b.dataset.focusKey===active)b.focus({preventScroll:true});}
}
const pinElements=new Map<number,{button:HTMLButtonElement;region:HTMLDivElement;thread:Thread}>();
function renderPins(){const visible:Thread[]=[...list];if(detail&&!visible.some(t=>t.id===detail!.thread.id))visible.push(detail.thread);
 const ids=new Set(visible.map(t=>t.id));for(const [id,item] of pinElements)if(!ids.has(id)){item.button.remove();item.region.remove();pinElements.delete(id);}
 for(const thread of visible){if(thread.anchor==='page'&&thread.selection_type!=='area')continue;let item=pinElements.get(thread.id);if(!item){const b=button(String(thread.id),()=>void openThread(thread.id,false),'rv-pin');b.setAttribute('aria-label',`Open ${thread.selection_type==='area'?'area ':''}comment ${thread.id}: ${thread.anchor_label}`);const region=el('div','rv-region');region.setAttribute('aria-hidden','true');for(const event of ['mouseenter','focus'])b.addEventListener(event,()=>region.classList.add('rv-region-hover'));for(const event of ['mouseleave','blur'])b.addEventListener(event,()=>region.classList.remove('rv-region-hover'));pins.append(b);regions.append(region);item={button:b,region,thread};pinElements.set(thread.id,item);}item.thread=thread;item.button.classList.toggle('rv-pin-resolved',Boolean(thread.resolved));item.button.classList.toggle('rv-pin-selected',selected===thread.id);item.region.classList.toggle('rv-region-selected',selected===thread.id);item.region.classList.toggle('rv-region-resolved',Boolean(thread.resolved));}
 positionPins();
}
function placeBox(node:HTMLElement,box:Bounds){node.style.left=box.x+'px';node.style.top=box.y+'px';node.style.width=box.width+'px';node.style.height=box.height+'px';}
function geometryFor(anchor:{anchor:string;x:number;y:number;width?:number;height?:number}){const target=anchors.get(anchor.anchor)||anchors.get(anchor.anchor.split(':')[0]);if(!target)return null;const bounds=boundsOf(target);if(!bounds.width||!bounds.height)return null;return projectSelection(anchor,bounds);}
function paintDraft(){let box:Bounds|null=null,area=false;if(gesture){area=isAreaDrag(gesture.start,gesture.end);const doc=area?dragBounds(gesture.start,gesture.end):{...gesture.start,width:0,height:0};box={...doc,x:doc.x-scrollX,y:doc.y-scrollY};}else if(draftAnchor&&(draftAnchor.anchor!=='page'||draftAnchor.selectionType==='area')){box=geometryFor(draftAnchor);area=draftAnchor.selectionType==='area';}draftRegion.hidden=!box||!area;draftPin.hidden=!box;if(box){if(area)placeBox(draftRegion,box);draftPin.style.left=(box.x+box.width)+'px';draftPin.style.top=(box.y+box.height)+'px';}}
function positionPopover(){if(!panelOpen||!panel.classList.contains('rv-contextual'))return;const anchor=draftAnchor||detail?.thread;if(!anchor)return;const box=geometryFor(anchor);if(!box)return;const pinX=box.x+box.width,pinY=box.y+box.height;const {width,height}=panel.getBoundingClientRect();let left=pinX+24;if(left+width>innerWidth-16)left=pinX-width-24;left=Math.max(10,Math.min(innerWidth-width-10,left));const top=Math.max(12,Math.min(innerHeight-height-90,pinY-22));panel.style.left=left+'px';panel.style.top=top+'px';}
function positionPins(){for(const {button:b,region,thread:t} of pinElements.values()){const box=geometryFor(t);if(!box){b.hidden=true;region.hidden=true;continue;}const left=box.x+box.width,top=box.y+box.height;b.hidden=top<0||top>innerHeight||left<0||left>innerWidth;region.hidden=t.selection_type!=='area'||box.y+box.height<0||box.y>innerHeight||box.x+box.width<0||box.x>innerWidth;if(!b.hidden){b.style.left=`${Math.max(17,Math.min(innerWidth-17,left))}px`;b.style.top=`${Math.max(17,top)}px`;}if(!region.hidden)placeBox(region,box);}paintDraft();positionPopover();}
let frame=0;function schedulePins(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;positionPins();});}
addEventListener('scroll',()=>{if(gesture)gesture.end={x:gesture.clientX+scrollX,y:gesture.clientY+scrollY};schedulePins();},{passive:true});addEventListener('resize',schedulePins);new ResizeObserver(schedulePins).observe(document.body);document.fonts.ready.then(schedulePins);document.querySelectorAll('img').forEach(img=>img.addEventListener('load',schedulePins,{once:true}));
async function sync(){if(busy)return;await loadList();if(selected&&panelOpen)await loadDetail();}
addEventListener('online',()=>void sync());addEventListener('offline',()=>notify('You are offline. Your draft is still here.',true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelGesture();else void sync();});
window.setInterval(()=>{if(!document.hidden&&!gesture)void sync();},15000);
const initialThread=new URLSearchParams(location.search).get('thread');startPicking();notify('Loading shared comments…');void loadList();if(initialThread&&/^\d{1,12}$/.test(initialThread))void openThread(Number(initialThread));
