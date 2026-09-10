import {test} from 'node:test';
import assert from 'node:assert/strict';
import {anchorFingerprint,assignReviewAnchors} from '../src/scripts/review-anchors.ts';
const paragraph=text=>({tag:'p',text});
const legacyFor=(targets)=>Object.fromEntries(targets.map((target,i)=>[anchorFingerprint('hero',target),[`hero:${target.tag}:${i}`]]));

test('inserting, reordering and removing content does not retarget legacy comment pins',()=>{
 const before=[paragraph('First original paragraph'),paragraph('Second original paragraph')];
 const legacy=legacyFor(before);
 assert.deepEqual(assignReviewAnchors('hero',[before[1],paragraph('New copy'),before[0]],legacy).filter(id=>!id.includes(':content:')),['hero:p:1','hero:p:0']);
 const replacement=assignReviewAnchors('hero',[paragraph('Replacement paragraph'),before[1]],legacy);
 assert.match(replacement[0],/^hero:p:content:/);assert.equal(replacement[1],'hero:p:1');
 assert(!replacement.includes('hero:p:0'));
});
test('link destinations distinguish identical labels and new nodes have stable content IDs',()=>{
 const first={tag:'a',text:'Read Case Study',reference:'/first'},second={...first,reference:'/second'};
 const legacy=legacyFor([first,second]);
 assert.deepEqual(assignReviewAnchors('hero',[second,first],legacy),['hero:a:1','hero:a:0']);
 const fresh=paragraph('New result');
 assert.equal(assignReviewAnchors('hero',[fresh],legacy)[0],assignReviewAnchors('hero',[first,fresh,second],legacy)[1]);
});
test('explicit IDs preserve edited elements and cannot be stolen by matching duplicates',()=>{
 const original=paragraph('Original'),legacy=legacyFor([original]);
 const edited={...paragraph('Edited'),explicit:'hero:p:0'};
 const ids=assignReviewAnchors('hero',[original,edited],legacy);
 assert.match(ids[0],/:content:/);assert.equal(ids[1],'hero:p:0');
 assert.throws(()=>assignReviewAnchors('hero',[edited,edited],legacy),/Duplicate review anchor/);
});
test('ambiguous legacy copies require explicit IDs instead of an ordinal guess',()=>{
 const link={tag:'a',text:'Services',reference:'#services'};
 const legacy={[anchorFingerprint('header',link)]:['header:a:1','header:a:6']};
 const ids=assignReviewAnchors('header',[link,{...link,explicit:'header:a:6'}],legacy);
 assert.match(ids[0],/:content:/);assert.equal(ids[1],'header:a:6');
});
test('formatting whitespace is normalized and generated IDs satisfy the public API format',()=>{
 assert.equal(anchorFingerprint('hero',paragraph('A  clear\nstrategy')),anchorFingerprint('hero',paragraph(' A clear strategy ')));
 const ids=assignReviewAnchors('case-studies',[paragraph('A new outcome'),paragraph('A new outcome')],{});
 assert.equal(new Set(ids).size,2);
 for(const id of ids){assert.match(id,/^[-a-z0-9:]+$/);assert(id.length<=100);}
});
