import http from 'node:http';
import {resolve} from 'node:path';
import {createDatabase} from '../tests/d1-adapter.mjs';
import worker from '../server/review-api.mjs';
const DB=createDatabase(resolve(process.env.REVIEW_LOCAL_DB||'.review-local.sqlite'));
const server=http.createServer(async(req,res)=>{
 try{const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>10000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
 const request=new Request('http://127.0.0.1:8787'+req.url,{method:req.method,headers:{...req.headers,'cf-connecting-ip':'127.0.0.1'},body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
 const response=await worker.fetch(request,{DB,REVIEW_LOCAL:true});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){res.writeHead(500);res.end('Local review server unavailable');console.error(e);}
});server.listen(8787,'127.0.0.1',()=>console.log('Review API: http://127.0.0.1:8787/api/review'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{DB.close();process.exit(0);}));
