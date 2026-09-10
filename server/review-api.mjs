import {database} from '../db/client.mjs';
const ORIGINS=new Set(['https://brandvm.github.io','https://seo-team-toronto-redesign.brandvision.chatgpt.site']);
const EMOJIS=['👍','❤️','👀'];
const SECTIONS=new Set(['page','header','hero','services','why-seo-team','approach','case-studies','industries','research','testimonials','contact','footer']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new HttpError(status,message);};
const clean=(v,min,max,label)=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail(400,`${label} must be ${min}–${max} characters.`);return v.trim();};
const id=(v)=>{if(!/^\d{1,12}$/.test(String(v))||Number(v)<1)fail(400,'Invalid comment ID.');return Number(v);};
function visitor(v){if(!UUID.test(v||''))fail(400,'Please reload comment mode and try again.');return v;}
async function body(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Use JSON for this request.');
  const reader=request.body?.getReader();if(!reader)fail(400,'Missing request.');
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();fail(413,'This comment is too long.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Invalid request.');return value;}catch{fail(400,'Invalid JSON request.');}
}
async function limit(db,request,scope,maximum,seconds){
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`seo-review:${request.headers.get('cf-connecting-ip')||'unknown'}`));
  const key=scope+':'+Array.from(new Uint8Array(hash)).map(v=>v.toString(16).padStart(2,'0')).join('');
  const window=Math.floor(Date.now()/1000/seconds)*seconds;
  const row=await db.prepare(`INSERT INTO review_rate_limits (key,window,count) VALUES (?,?,1)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window RETURNING count`).bind(key,window).first();
  if(row.count>maximum)fail(429,'A few too many requests. Please wait a minute before trying again.');
  await db.prepare('DELETE FROM review_rate_limits WHERE window < ?').bind(Math.floor(Date.now()/1000)-86400).run();
}
async function attachReactions(db,messages,visitorId){
  if(!messages.length)return messages;
  const rows=await db.prepare(`SELECT message_id,emoji,COUNT(*) AS count,MAX(CASE WHEN visitor_id=? THEN 1 ELSE 0 END) AS mine FROM review_reactions WHERE message_id IN (${messages.map(()=>'?').join(',')}) GROUP BY message_id,emoji`).bind(visitorId,...messages.map(m=>m.id)).all();
  return messages.map(message=>({...message,reactions:EMOJIS.map(emoji=>{const r=rows.results.find(r=>r.message_id===message.id&&r.emoji===emoji);return {emoji,count:r?.count||0,mine:Boolean(r?.mine)};})}));
}
const messageColumns='id,thread_id,name,body,created_at';
async function threadRecord(db,threadId){
  const thread=await db.prepare('SELECT * FROM review_threads WHERE id=?').bind(threadId).first();
  if(!thread)fail(404,'This thread could not be found.');return thread;
}
async function route(request,env,url){
  if(url.pathname==='/api/review/health')return {ok:true};
  const db=database(env);
  const method=request.method;
  const parts=url.pathname.replace(/^\/api\/review\/?/,'').split('/').filter(Boolean);
  const visitorId=visitor(request.headers.get('x-review-visitor'));
  if(method==='GET'&&parts[0]==='threads'&&parts.length===1){
    const before=url.searchParams.get('before')?id(url.searchParams.get('before')):Number.MAX_SAFE_INTEGER;
    const status=url.searchParams.get('status')||'open';
    if(!['open','resolved','all'].includes(status))fail(400,'Unknown comment filter.');
    const condition=status==='all'?'':' AND t.resolved=?';
    const bindings=status==='all'?[before]:[before,status==='resolved'?1:0];
    const rows=await db.prepare(`SELECT t.*,m.id AS message_id,m.name,m.body,m.created_at AS message_created_at,
      (SELECT COUNT(*)-1 FROM review_messages WHERE thread_id=t.id) AS reply_count
      FROM review_threads t JOIN review_messages m ON m.id=(SELECT MIN(id) FROM review_messages WHERE thread_id=t.id)
      WHERE t.page='homepage' AND t.id < ?${condition} ORDER BY t.id DESC LIMIT 51`).bind(...bindings).all();
    const hasMore=rows.results.length>50, items=rows.results.slice(0,50);
    const roots=await attachReactions(db,items.map(t=>({id:t.message_id})),visitorId);
    const counts=await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN resolved=0 THEN 1 ELSE 0 END),0) AS open,COALESCE(SUM(resolved),0) AS resolved FROM review_threads WHERE page='homepage'").first();
    return {threads:items.map((t,i)=>({...t,reactions:roots[i].reactions})),counts,next:hasMore?items.at(-1).id:null};
  }
  if(method==='GET'&&parts[0]==='threads'&&parts.length===2){
    const thread=await threadRecord(db,id(parts[1]));
    const root=await db.prepare(`SELECT ${messageColumns} FROM review_messages WHERE thread_id=? ORDER BY id LIMIT 1`).bind(thread.id).first();
    const before=url.searchParams.get('before')?id(url.searchParams.get('before')):Number.MAX_SAFE_INTEGER;
    const rows=await db.prepare(`SELECT ${messageColumns} FROM review_messages WHERE thread_id=? AND id>? AND id<? ORDER BY id DESC LIMIT 51`).bind(thread.id,root.id,before).all();
    const hasMore=rows.results.length>50,replies=rows.results.slice(0,50);
    const decorated=await attachReactions(db,[root,...replies],visitorId);
    return {thread,root:decorated[0],replies:decorated.slice(1).reverse(),next:hasMore?replies.at(-1).id:null};
  }
  if(!['POST','PUT','PATCH'].includes(method))fail(405,'This action is not supported.');
  const data=await body(request);
  await limit(db,request,'writes',60,60);
  if(method==='POST'&&parts[0]==='threads'&&parts.length===1){
    const requestId=visitor(data.requestId),name=clean(data.name,1,50,'Name'),message=clean(data.body,1,3000,'Comment');
    const anchor=clean(data.anchor,1,100,'Location'),anchorLabel=clean(data.anchorLabel,1,120,'Location label');
    if(!SECTIONS.has(anchor.split(':')[0])||!/^[-a-z0-9:]+$/.test(anchor))fail(400,'Invalid comment location.');
    if(!Number.isInteger(data.x)||!Number.isInteger(data.y)||data.x<0||data.x>10000||data.y<0||data.y>10000)fail(400,'Invalid pin position.');
    const previous=await db.prepare('SELECT t.id,m.visitor_id,m.body,m.name FROM review_threads t JOIN review_messages m ON m.request_id=t.request_id WHERE t.request_id=?').bind(requestId).first();
    if(previous){if(previous.visitor_id!==visitorId||previous.body!==message||previous.name!==name)fail(409,'This request was already used.');return {id:previous.id};}
    await limit(db,request,'new-threads',12,600);
    const now=Date.now();
    await db.batch([
      db.prepare("INSERT INTO review_threads (request_id,page,anchor,anchor_label,x,y,created_at) VALUES (?,'homepage',?,?,?,?,?) ON CONFLICT(request_id) DO NOTHING").bind(requestId,anchor,anchorLabel,data.x,data.y,now),
      db.prepare('INSERT INTO review_messages (request_id,thread_id,visitor_id,name,body,created_at) SELECT ?,id,?,?,?,? FROM review_threads WHERE request_id=? ON CONFLICT(request_id) DO NOTHING').bind(requestId,visitorId,name,message,now,requestId),
    ]);
    const row=await db.prepare('SELECT id FROM review_threads WHERE request_id=?').bind(requestId).first();return {id:row.id};
  }
  if(method==='POST'&&parts[0]==='threads'&&parts.length===3&&parts[2]==='replies'){
    const thread=await threadRecord(db,id(parts[1])),requestId=visitor(data.requestId),name=clean(data.name,1,50,'Name'),message=clean(data.body,1,3000,'Reply');
    const previous=await db.prepare('SELECT id,thread_id,visitor_id,name,body FROM review_messages WHERE request_id=?').bind(requestId).first();
    if(previous){if(previous.thread_id!==thread.id||previous.visitor_id!==visitorId||previous.body!==message||previous.name!==name)fail(409,'This request was already used.');return {id:previous.id};}
    await db.prepare('INSERT INTO review_messages (request_id,thread_id,visitor_id,name,body,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(request_id) DO NOTHING').bind(requestId,thread.id,visitorId,name,message,Date.now()).run();
    return await db.prepare('SELECT id FROM review_messages WHERE request_id=?').bind(requestId).first();
  }
  if(method==='PATCH'&&parts[0]==='threads'&&parts.length===2){
    const thread=await threadRecord(db,id(parts[1]));const name=clean(data.name,1,50,'Name');
    if(typeof data.resolved!=='boolean')fail(400,'Choose a valid thread status.');
    await db.prepare('UPDATE review_threads SET resolved=?,resolved_by=?,resolved_at=? WHERE id=?').bind(data.resolved?1:0,data.resolved?name:null,data.resolved?Date.now():null,thread.id).run();return {ok:true};
  }
  if(method==='PUT'&&parts[0]==='messages'&&parts.length===3&&parts[2]==='reactions'){
    const messageId=id(parts[1]);if(!EMOJIS.includes(data.emoji)||typeof data.active!=='boolean')fail(400,'Choose a supported reaction.');
    if(!await db.prepare('SELECT id FROM review_messages WHERE id=?').bind(messageId).first())fail(404,'This comment could not be found.');
    if(data.active)await db.prepare('INSERT INTO review_reactions (message_id,visitor_id,emoji) VALUES (?,?,?) ON CONFLICT DO NOTHING').bind(messageId,visitorId,data.emoji).run();
    else await db.prepare('DELETE FROM review_reactions WHERE message_id=? AND visitor_id=? AND emoji=?').bind(messageId,visitorId,data.emoji).run();
    return {ok:true};
  }
  fail(404,'This action could not be found.');
}
export default {async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/review/')){
    // The public website continues to live on GitHub Pages; this Worker stores reviews.
    return Response.redirect('https://brandvm.github.io/seoteam-astro/'+url.search,302);
  }
  const origin=request.headers.get('origin');
  const local=env.REVIEW_LOCAL===true&&['http://127.0.0.1:4321','http://localhost:4321'].includes(origin);
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if(origin&&(ORIGINS.has(origin)||local))headers['Access-Control-Allow-Origin']=origin;
  else if(origin)return new Response(JSON.stringify({error:'This origin is not allowed.'}),{status:403,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET,POST,PATCH,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Review-Visitor','Access-Control-Max-Age':'600'}});
  try{return new Response(JSON.stringify(await route(request,env,url)),{headers});}
  catch(error){const status=error instanceof HttpError?error.status:503;if(status===503)console.error('Review API storage error',error?.message);if(status===429)headers['Retry-After']='60';return new Response(JSON.stringify({error:status===503?'Comments are temporarily unavailable. Your draft is still here; please try again.':error.message}),{status,headers});}
}};
