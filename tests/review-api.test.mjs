import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/review-api.mjs';
import {createDatabase} from './d1-adapter.mjs';
const a=crypto.randomUUID(),b=crypto.randomUUID();
function setup(){const DB=createDatabase();return {DB,async call(path='',method='GET',data,who=a,origin='https://brandvm.github.io'){
 const headers={'origin':origin,'x-review-visitor':who,'cf-connecting-ip':who};if(data!==undefined)headers['content-type']='application/json';
 const response=await worker.fetch(new Request('https://review.example/api/review/'+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)}),{DB});
 return {status:response.status,headers:response.headers,data:response.status===204?null:await response.json()};
 },close(){DB.close();}};}
const draft=(extra={})=>({requestId:crypto.randomUUID(),name:'A reviewer',body:'Make this clearer.',anchor:'hero:h1:0',anchorLabel:'Hero heading',x:4500,y:2200,...extra});
test('two independent visitors share threads, replies, reactions and resolve/reopen state',async()=>{
 const s=setup();try{
  const payload=draft();const first=await s.call('threads','POST',payload);assert.equal(first.status,200);
  const retry=await s.call('threads','POST',payload);assert.equal(retry.data.id,first.data.id);
  const list=await s.call('threads?status=all','GET',undefined,b);assert.equal(list.data.threads.length,1);assert.equal(list.data.threads[0].body,payload.body);
  const tid=first.data.id;const reply={requestId:crypto.randomUUID(),name:'Second reviewer',body:'Agreed. I suggest a shorter headline.'};
  const saved=await s.call(`threads/${tid}/replies`,'POST',reply,b);await s.call(`threads/${tid}/replies`,'POST',reply,b);
  let detail=await s.call(`threads/${tid}`);assert.equal(detail.data.replies.length,1);assert.equal(detail.data.replies[0].id,saved.data.id);
  const mid=detail.data.root.id;
  await s.call(`messages/${mid}/reactions`,'PUT',{emoji:'👍',active:true},a);await s.call(`messages/${mid}/reactions`,'PUT',{emoji:'👍',active:true},a);await s.call(`messages/${mid}/reactions`,'PUT',{emoji:'👍',active:true},b);
  detail=await s.call(`threads/${tid}`);assert.equal(detail.data.root.reactions[0].count,2);assert.equal(detail.data.root.reactions[0].mine,true);
  await s.call(`messages/${mid}/reactions`,'PUT',{emoji:'👍',active:false},b);detail=await s.call(`threads/${tid}`,'GET',undefined,b);assert.equal(detail.data.root.reactions[0].count,1);assert.equal(detail.data.root.reactions[0].mine,false);
  await s.call(`threads/${tid}`,'PATCH',{name:'Second reviewer',resolved:true},b);assert.equal((await s.call('threads?status=open')).data.threads.length,0);assert.equal((await s.call('threads?status=resolved')).data.threads[0].resolved_by,'Second reviewer');
  await s.call(`threads/${tid}`,'PATCH',{name:'A reviewer',resolved:false});assert.equal((await s.call('threads?status=open')).data.threads.length,1);
 }finally{s.close();}
});
test('pagination retains every thread and reply across pages',async()=>{
 const s=setup();try{
  for(let n=0;n<55;n++){
   s.DB.sql.prepare("INSERT INTO review_threads(request_id,page,anchor,anchor_label,x,y,created_at) VALUES (?,'homepage','page','Page',0,0,?)").run(crypto.randomUUID(),Date.now());
   s.DB.sql.prepare('INSERT INTO review_messages(request_id,thread_id,visitor_id,name,body,created_at) VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(),n+1,a,'Reviewer','Comment '+n,Date.now());
  }
  const first=await s.call('threads?status=all');assert.equal(first.data.threads.length,50);assert.equal(first.data.counts.total,55);
  const next=await s.call('threads?status=all&before='+first.data.next);assert.equal(next.data.threads.length,5);assert.equal(next.data.next,null);
  for(let n=0;n<55;n++)s.DB.sql.prepare('INSERT INTO review_messages(request_id,thread_id,visitor_id,name,body,created_at) VALUES (?,1,?,?,?,?)').run(crypto.randomUUID(),b,'Reply author','Reply '+n,Date.now());
  const recent=await s.call('threads/1');assert.equal(recent.data.replies.length,50);const older=await s.call('threads/1?before='+recent.data.next);assert.equal(older.data.replies.length,5);assert.equal(new Set([...recent.data.replies,...older.data.replies].map(m=>m.id)).size,55);
 }finally{s.close();}
});
test('validates anonymous writes, locations, reactions, payload size and allowed origins',async()=>{
 const s=setup();try{
  assert.equal((await s.call('threads','POST',draft({body:'   '}))).status,400);
  assert.equal((await s.call('threads','POST',draft({anchor:'evil:div:0'}))).status,400);
  assert.equal((await s.call('threads','POST',draft({x:-1}))).status,400);
  assert.equal((await s.call('threads','POST',draft({body:'x'.repeat(9000)}))).status,413);
  assert.equal((await s.call('threads','POST',draft(),a,'https://unrelated.example')).status,403);
  assert.equal((await s.call('threads','GET',undefined,'invalid')).status,400);
  assert.equal((await s.call('threads/999/replies','POST',{requestId:crypto.randomUUID(),name:'Name',body:'Reply'})).status,404);
  const payload=draft({body:'<img src=x onerror=alert(1)>'});const r=await s.call('threads','POST',payload);assert.equal(r.status,200);assert.equal((await s.call(`threads/${r.data.id}`)).data.root.body,payload.body);
  assert.equal((await s.call('threads','POST',{...payload,body:'Conflicting retry'})).status,409);
  const preflight=await s.call('threads','OPTIONS');assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'https://brandvm.github.io');assert.equal(preflight.headers.get('cache-control'),'no-store');
 }finally{s.close();}
});
test('rate limits anonymous spam and keeps submitted content durable',async()=>{
 const s=setup();try{
  for(let n=0;n<12;n++)assert.equal((await s.call('threads','POST',draft())).status,200);
  assert.equal((await s.call('threads','POST',draft())).status,429);assert.equal((await s.call('threads?status=all')).data.counts.total,12);
 }finally{s.close();}
});

test('a new server instance reads comments from the same persistent database',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const folder=mkdtempSync(join(tmpdir(),'seoteam-review-test-'));const filename=join(folder,'reviews.sqlite');let DB=createDatabase(filename);
 try{
  const headers={'content-type':'application/json','x-review-visitor':a,'origin':'https://brandvm.github.io','cf-connecting-ip':a};
  const created=await worker.fetch(new Request('https://review.example/api/review/threads',{method:'POST',headers,body:JSON.stringify(draft())}),{DB});assert.equal(created.status,200);DB.close();DB=createDatabase(filename);
  const loaded=await worker.fetch(new Request('https://review.example/api/review/threads?status=all',{headers:{...headers,'x-review-visitor':b}}),{DB});const result=await loaded.json();assert.equal(result.counts.total,1);assert.equal(result.threads[0].body,'Make this clearer.');
 }finally{DB.close();rmSync(folder,{recursive:true,force:true});}
});
