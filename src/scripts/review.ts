import reviewStyles from '../styles/review.css?inline';
const reviewStyle=document.createElement('style');reviewStyle.textContent=reviewStyles;document.head.append(reviewStyle);

type Reaction={emoji:string;count:number;mine:boolean};
type Message={id:number;thread_id:number;name:string;body:string;created_at:number;reactions:Reaction[]};
type Thread={id:number;anchor:string;anchor_label:string;x:number;y:number;resolved:number;resolved_by:string|null;resolved_at:number|null;created_at:number};
type Summary=Thread&{name:string;body:string;message_id:number;reply_count:number;reactions:Reaction[]};
type Detail={thread:Thread;root:Message;replies:Message[];next:number|null};
type Anchor={anchor:string;anchorLabel:string;x:number;y:number};
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
 const scope=key==='page'?document.querySelector<HTMLElement>('main'):key==='header'?document.querySelector<HTMLElement>('.site-header'):key==='footer'?document.querySelector<HTMLElement>('.site-footer'):document.getElementById(key);
 if(!scope)continue;anchors.set(key,scope);if(key==='page')continue;scope.dataset.reviewAnchor=key;
 const counters:Record<string,number>={};
 scope.querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,img,a,article').forEach(node=>{const tag=node.tagName.toLowerCase();const n=counters[tag]||0;counters[tag]=n+1;const anchor=`${key}:${tag}:${n}`;node.dataset.reviewAnchor=anchor;anchors.set(anchor,node);});
}
let list:Summary[]=[],counts={total:0,open:0,resolved:0},filter='open',listPages=1,listNext:number|null=null;
let selected:number|null=null,detail:Detail|null=null,replyPages=1,panelOpen=true,picking=false,busy=false;
let draftAnchor:Anchor|null=null,listSequence=0,detailSequence=0,detailSignature='',listSignature='';
const drafts=new Map<string,string>(),requests=new Map<string,{fingerprint:string;id:string}>();
const pins=el('div','rv-pins');root.append(pins);
const panel=el('aside','rv-panel');panel.id='review-panel';panel.setAttribute('aria-label','Shared page comments');root.append(panel);
const top=el('div','rv-top');const title=el('div');title.append(el('span','rv-eyebrow','WEBSITE REVIEW'),el('h2','','Comments'));
const close=button('×',()=>setPanel(false),'rv-icon-button');close.setAttribute('aria-label','Hide comment panel');top.append(title,close);panel.append(top);
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
const listActions=el('div','rv-list-actions');listActions.append(button('Pin a comment',startPicking,'rv-primary'),button('General page comment',()=>compose({anchor:'page',anchorLabel:'Entire page',x:5000,y:0}),'rv-button'));listView.append(listActions);
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
const pinLabel=el('p','rv-pin-label');const repin=button('Choose a point on the page',startPicking,'rv-inline');
locationSelect.addEventListener('change',()=>{draftAnchor={anchor:locationSelect.value,anchorLabel:locations.find(v=>v[0]===locationSelect.value)?.[1]||'Page',x:5000,y:0};pinLabel.textContent=draftAnchor.anchorLabel;});
const newLabel=el('label','','Your comment');newLabel.htmlFor='review-new-comment';const newInput=el('textarea');newInput.id='review-new-comment';newInput.rows=5;newInput.maxLength=3000;newInput.required=true;newInput.placeholder='What would you like to change or discuss?';newInput.addEventListener('input',()=>drafts.set('new',newInput.value));
const newSubmit=el('button','rv-primary','Post comment');newSubmit.type='submit';newForm.append(locationLabel,locationSelect,pinLabel,repin,newLabel,newInput,newSubmit);newForm.addEventListener('submit',e=>{e.preventDefault();void postThread();});composeView.append(newForm);
const footer=el('div','rv-panel-footer','Anyone with this link can comment, reply, react, and resolve threads.');panel.append(footer);
const toolbar=el('div','rv-toolbar');root.append(toolbar);
const launcher=button('Comments',()=>setPanel(!panelOpen),'rv-launcher');launcher.setAttribute('aria-controls','review-panel');launcher.setAttribute('aria-expanded','true');
const pinButton=button('+ Pin comment',startPicking,'rv-toolbar-pin');pinButton.setAttribute('aria-pressed','false');
const exitLink=el('a','rv-exit','Exit review');const exitURL=new URL(location.href);exitURL.searchParams.delete('view');exitURL.searchParams.delete('thread');exitLink.href=exitURL.href;toolbar.append(launcher,pinButton,exitLink);
const pickingBanner=el('div','rv-picking-banner');pickingBanner.hidden=true;pickingBanner.append(el('span','','Click a spot on the page to leave a comment.'),button('Cancel',stopPicking,'rv-inline'));root.append(pickingBanner);
function notify(message='',error=false){noticeText.textContent=message;status.hidden=!message;status.classList.toggle('rv-error',error);retry.hidden=!error;}
function displayName(){const name=nameInput.value.trim();if(!name){setPanel(true);nameInput.focus();notify('Enter a display name to join the conversation.');return null;}return name;}
function setPanel(open:boolean){panelOpen=open;panel.hidden=!open;launcher.setAttribute('aria-expanded',String(open));if(!open)launcher.focus();}
function threadURL(threadId:number|null){const url=new URL(location.href);if(threadId)url.searchParams.set('thread',String(threadId));else url.searchParams.delete('thread');return url;}
function setURL(threadId:number|null){history.replaceState(null,'',threadURL(threadId));}
function showList(){stopPicking();selected=null;detail=null;detailSequence++;draftAnchor=null;listView.hidden=false;threadView.hidden=true;composeView.hidden=true;setURL(null);setPanel(true);void loadList();}
function compose(anchor:Anchor){stopPicking();draftAnchor=anchor;selected=null;detailSequence++;listView.hidden=true;threadView.hidden=true;composeView.hidden=false;locationSelect.value=anchor.anchor.split(':')[0];pinLabel.textContent=anchor.anchorLabel;newInput.value=drafts.get('new')||'';setPanel(true);setURL(null);newInput.focus();}
function startPicking(){picking=true;setPanel(false);pickingBanner.hidden=false;pinButton.setAttribute('aria-pressed','true');document.documentElement.classList.add('rv-picking');notify();}
function stopPicking(){picking=false;pickingBanner.hidden=true;pinButton.setAttribute('aria-pressed','false');document.documentElement.classList.remove('rv-picking');}
function pick(event:MouseEvent){
 if(!picking||!(event.target instanceof Element)||root.contains(event.target))return;
 const target=event.target.closest<HTMLElement>('[data-review-anchor]');if(!target)return;
 event.preventDefault();event.stopImmediatePropagation();const rect=target.getBoundingClientRect();const anchor=target.dataset.reviewAnchor!;
 const label=target instanceof HTMLImageElement?target.alt:target.textContent||locations.find(v=>v[0]===anchor.split(':')[0])?.[1]||'Page';
 compose({anchor,anchorLabel:label.trim().replace(/\s+/g,' ').slice(0,120)||'Page location',x:Math.round(Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width)))*10000),y:Math.round(Math.max(0,Math.min(1,(event.clientY-rect.top)/Math.max(1,rect.height)))*10000)});
}
document.addEventListener('click',pick,true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(picking){stopPicking();setPanel(true);}else setPanel(false);}});
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
async function openThread(threadId:number,scroll=true){stopPicking();selected=threadId;detail=null;detailSignature='';replyPages=1;draftAnchor=null;composeView.hidden=true;listView.hidden=true;threadView.hidden=false;threadHeading.replaceChildren(el('h3','',`Comment #${threadId}`));messages.replaceChildren(el('p','rv-empty','Loading thread…'));replyInput.value=drafts.get('reply:'+threadId)||'';setPanel(true);setURL(threadId);await loadDetail();if(scroll&&detail){const current=detail as Detail;const target=anchors.get(current.thread.anchor)||anchors.get(current.thread.anchor.split(':')[0]);target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});} }
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
 listBody.replaceChildren();if(!list.length){listBody.append(el('h3','rv-empty-title',counts.total?'No '+filter+' threads':'Start the conversation'),el('p','rv-empty',counts.total?'Choose another filter, or leave a new comment.':'Pin feedback to a specific spot, or leave a general page comment.'));return;}
 for(const thread of list){
  const card=button('',()=>void openThread(thread.id),'rv-thread-card');card.setAttribute('aria-label',`Open comment ${thread.id} by ${thread.name}`);
  const meta=el('div','rv-card-meta');meta.append(el('strong','',`#${thread.id} · ${thread.name}`),el('span','',thread.resolved?'Resolved':'Open'));
  card.append(meta,el('p','rv-card-body',thread.body),el('span','rv-card-location',thread.anchor_label));
  const foot=el('div','rv-card-foot');foot.append(el('span','',`${thread.reply_count} ${thread.reply_count===1?'reply':'replies'}`),el('time','',time(thread.created_at)));card.append(foot);listBody.append(card);
 }
}
function reactionButtons(message:Message){const row=el('div','rv-reactions');const labels:Record<string,string>={'👍':'Thumbs up','❤️':'Heart','👀':'Eyes'};
 for(const reaction of message.reactions){const b=button(`${reaction.emoji} ${reaction.count||''}`,()=>void action(async()=>{await api(`/messages/${message.id}/reactions`,'PUT',{emoji:reaction.emoji,active:!reaction.mine});await loadDetail();await loadList();}),'rv-reaction');b.setAttribute('aria-label',`${labels[reaction.emoji]}, ${reaction.count} ${reaction.count===1?'reaction':'reactions'}`);b.setAttribute('aria-pressed',String(reaction.mine));b.dataset.focusKey=`reaction-${message.id}-${reaction.emoji}`;row.append(b);}return row;}
function messageCard(message:Message,isRoot=false){const card=el('article','rv-message');const meta=el('div','rv-message-meta');const initials=message.name.trim().split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();const avatar=el('span','rv-avatar',initials);avatar.setAttribute('aria-hidden','true');const author=el('div');author.append(el('strong','',message.name),el('time','',time(message.created_at)));meta.append(avatar,author);if(isRoot)meta.append(el('span','rv-original','Original'));card.append(meta,el('p','rv-message-body',message.body),reactionButtons(message));return card;}
function renderDetail(){if(!detail)return;const signature=JSON.stringify(detail);if(signature===detailSignature)return;detailSignature=signature;
 const active=document.activeElement instanceof HTMLElement?document.activeElement.dataset.focusKey:null;const scroll=messages.scrollTop;
 const t=detail.thread;threadHeading.replaceChildren(el('h3','',`Comment #${t.id}`),el('p','rv-thread-location',t.anchor_label));
 if(t.resolved)threadHeading.append(el('p','rv-resolved-note',`Resolved by ${t.resolved_by||'a reviewer'}${t.resolved_at?' · '+time(t.resolved_at):''}`));
 resolveButton.textContent=t.resolved?'Reopen thread':'✓ Resolve thread';resolveButton.setAttribute('aria-label',t.resolved?'Reopen this thread':'Resolve this thread');
 messages.replaceChildren(messageCard(detail.root,true));
 if(detail.next){const older=button('Load earlier replies',()=>{replyPages++;void loadDetail();},'rv-load-more');messages.append(older);}
 if(detail.replies.length)messages.append(el('div','rv-reply-divider','Replies'));
 for(const reply of detail.replies)messages.append(messageCard(reply));messages.scrollTop=scroll;
 if(active){for(const b of messages.querySelectorAll<HTMLButtonElement>('[data-focus-key]'))if(b.dataset.focusKey===active)b.focus({preventScroll:true});}
}
const pinElements=new Map<number,{button:HTMLButtonElement;thread:Thread}>();
function renderPins(){const visible:Thread[]=[...list];if(detail&&!visible.some(t=>t.id===detail!.thread.id))visible.push(detail.thread);
 const ids=new Set(visible.map(t=>t.id));for(const [id,item] of pinElements)if(!ids.has(id)){item.button.remove();pinElements.delete(id);}
 for(const thread of visible){if(thread.anchor==='page')continue;let item=pinElements.get(thread.id);if(!item){const b=button(String(thread.id),()=>void openThread(thread.id,false),'rv-pin');b.setAttribute('aria-label',`Open comment ${thread.id}: ${thread.anchor_label}`);pins.append(b);item={button:b,thread};pinElements.set(thread.id,item);}item.thread=thread;item.button.classList.toggle('rv-pin-resolved',Boolean(thread.resolved));item.button.classList.toggle('rv-pin-selected',selected===thread.id);}
 positionPins();
}
function positionPins(){for(const {button:b,thread:t} of pinElements.values()){const target=anchors.get(t.anchor)||anchors.get(t.anchor.split(':')[0]);if(!target){b.hidden=true;continue;}const rect=target.getBoundingClientRect();const left=rect.left+rect.width*t.x/10000,top=rect.top+rect.height*t.y/10000;b.hidden=rect.width===0||rect.height===0||top<0||top>innerHeight||left<0||left>innerWidth;if(!b.hidden){b.style.left=`${Math.max(17,Math.min(innerWidth-17,left))}px`;b.style.top=`${Math.max(17,top)}px`;}}}
let frame=0;function schedulePins(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;positionPins();});}
addEventListener('scroll',schedulePins,{passive:true});addEventListener('resize',schedulePins);new ResizeObserver(schedulePins).observe(document.body);document.fonts.ready.then(schedulePins);document.querySelectorAll('img').forEach(img=>img.addEventListener('load',schedulePins,{once:true}));
async function sync(){if(busy)return;await loadList();if(selected&&panelOpen)await loadDetail();}
addEventListener('online',()=>void sync());addEventListener('offline',()=>notify('You are offline. Your draft is still here.',true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync();});
window.setInterval(()=>{if(!document.hidden&&!picking)void sync();},15000);
notify('Loading shared comments…');void loadList();const initialThread=new URLSearchParams(location.search).get('thread');if(initialThread&&/^\d{1,12}$/.test(initialThread))void openThread(Number(initialThread));
