import {build} from 'esbuild';
import {cp,mkdir} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['server/review-api.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'neutral',target:'es2022',minify:true});
await cp('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Review Worker and database migrations staged.');
