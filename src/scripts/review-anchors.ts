export type ReviewTarget={tag:string;text:string;reference?:string;explicit?:string};
export type LegacyAnchors=Record<string,string[]>;
const normalize=(value:string)=>value.replace(/\s+/g,' ').trim();

/** Content identity is independent of a node's position among its siblings. */
export function anchorFingerprint(section:string,target:ReviewTarget){
 const identity=target.tag==='img'?target.reference||'':normalize(target.text)+(target.tag==='a'?'\n'+(target.reference||''):'');
 let hash=0xcbf29ce484222325n;
 for(let i=0;i<identity.length;i++)hash=BigInt.asUintN(64,(hash^BigInt(identity.charCodeAt(i)))*0x100000001b3n);
 return `${section}:${target.tag}:${hash.toString(16).padStart(16,'0')}`;
}

/** Frozen ordinal IDs remain reserved for their original content, including removed nodes. */
export function assignReviewAnchors(section:string,targets:ReviewTarget[],legacy:LegacyAnchors){
 const explicit=new Set(targets.map(target=>target.explicit).filter(Boolean));
 const used=new Set<string>();
 return targets.map(target=>{
  if(target.explicit){
   if(used.has(target.explicit))throw new Error(`Duplicate review anchor: ${target.explicit}`);
   used.add(target.explicit);return target.explicit;
  }
  const fingerprint=anchorFingerprint(section,target),matches=legacy[fingerprint]||[];
  // Identical legacy nodes need explicit IDs; guessing could move a comment to the wrong copy.
  const retained=matches.length===1&&!used.has(matches[0])&&!explicit.has(matches[0])?matches[0]:undefined;
  const base=`${section}:${target.tag}:content:${fingerprint.split(':').at(-1)}`;
  let anchor=retained||base,n=1;
  while(used.has(anchor)||explicit.has(anchor))anchor=`${base}:${n++}`;
  used.add(anchor);return anchor;
 });
}
