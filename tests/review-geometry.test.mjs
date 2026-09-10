import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dragBounds,isAreaDrag,contains,normalizeSelection,projectSelection,edgeScrollSpeed,attachedCard} from '../src/scripts/review-geometry.ts';

const anchor={x:100,y:200,width:400,height:200};
test('clicks and pointer jitter stay point comments at the initial position',()=>{
 for(const end of [{x:200,y:250},{x:203,y:254},{x:240,y:254}]){
  assert.equal(isAreaDrag({x:200,y:250},end),false);
  assert.deepEqual(normalizeSelection({x:200,y:250},end,anchor),{x:2500,y:2500,width:0,height:0,selectionType:'point'});
 }
});
test('dragging in each direction produces the same saved rectangle',()=>{
 for(const [start,end] of [[{x:200,y:250},{x:400,y:350}],[{x:400,y:350},{x:200,y:250}],[{x:200,y:350},{x:400,y:250}],[{x:400,y:250},{x:200,y:350}]]){
  assert.deepEqual(dragBounds(start,end),{x:200,y:250,width:200,height:100});
  assert.deepEqual(normalizeSelection(start,end,anchor),{x:2500,y:2500,width:5000,height:5000,selectionType:'area'});
 }
});
test('saved areas scale with their anchor and track viewport scrolling',()=>{
 const saved=normalizeSelection({x:200,y:250},{x:400,y:350},anchor);
 assert.deepEqual(projectSelection(saved,anchor),{x:200,y:250,width:200,height:100});
 assert.deepEqual(projectSelection(saved,{x:20,y:-100,width:800,height:400}),{x:220,y:0,width:400,height:200});
 assert.deepEqual(projectSelection({x:5000,y:2500},{x:20,y:40,width:100,height:200}),{x:70,y:90,width:0,height:0});
});
test('selection bounds are clamped and invalid anchors cannot create areas',()=>{
 assert.deepEqual(normalizeSelection({x:0,y:0},{x:1000,y:1000},anchor),{x:0,y:0,width:10000,height:10000,selectionType:'area'});
 assert.throws(()=>normalizeSelection({x:0,y:0},{x:10,y:10},{x:0,y:0,width:0,height:100}));
 assert.throws(()=>normalizeSelection({x:0,y:0},{x:10,y:10},anchor));
 assert.throws(()=>normalizeSelection({x:0,y:0},{x:6,y:6},{x:0,y:0,width:1e8,height:1e8}));
 assert.equal(contains(anchor,{x:200,y:250,width:200,height:100}),true);
 assert.equal(contains(anchor,{x:200,y:250,width:200,height:200}),false);
 assert.equal(contains({x:0,y:0,width:600,height:3000},{x:200,y:250,width:200,height:200}),true);
});
test('edge scrolling is bounded and stops away from the viewport edges',()=>{
 assert.equal(edgeScrollSpeed(0,800),-16);assert.equal(edgeScrollSpeed(-20,800),-16);
 assert.equal(edgeScrollSpeed(20,800),-8);assert.equal(edgeScrollSpeed(400,800),0);
 assert.equal(edgeScrollSpeed(780,800),8);assert.equal(edgeScrollSpeed(800,800),16);
 assert.equal(edgeScrollSpeed(900,800),16);
});
test('conversation cards move with their pin and disappear when it scrolls out of view',()=>{
 const card={width:390,height:270},viewport={width:1440,height:900};
 const before=attachedCard({x:300,y:400},card,viewport);
 const after=attachedCard({x:300,y:300},card,viewport);
 assert.equal(before.side,'right');assert.equal(before.x,324);assert.equal(after.y,before.y-100);
 assert.equal(after.pinOffset,before.pinOffset);
 assert.equal(attachedCard({x:300,y:-1},card,viewport),null);
 assert.equal(attachedCard({x:300,y:901},card,viewport),null);
});
test('cards attach on the available side near desktop and mobile edges',()=>{
 const card={width:390,height:270};
 assert.equal(attachedCard({x:1300,y:400},card,{width:1440,height:900}).side,'left');
 const below=attachedCard({x:180,y:100},{width:350,height:260},{width:375,height:800});
 assert.equal(below.side,'below');assert.equal(below.x,10);assert.equal(below.y,124);
 const above=attachedCard({x:180,y:700},{width:350,height:260},{width:375,height:800});
 assert.equal(above.side,'above');assert.equal(above.y,416);
});
