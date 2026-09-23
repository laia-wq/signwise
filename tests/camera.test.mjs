import assert from 'node:assert/strict';
import {STATIC_IDS,features,assessHand,scoreFeatures,scoreMotionShape,MotionTracker} from '../dist/coach.js';
import {HoldGate,CameraTest} from '../dist/session.js';
assert.equal(new Set([...STATIC_IDS,'J','Z']).size,27);
assert.equal(assessHand(null,null,'L').score,0);
// Distinctive shapes should be preferred over common lookalikes.
const neutral={thumbSlot:.5,localCover:[.15,.15,.15],pipAngles:[110,110,110,110],dipAngles:[90,90,90,90],eContact:.9,eHeight:.25,thumbSide:1,roundness:[.75,.75,.75,.75],roundSpread:.25,closure:.35,thumbStraight:165,thumbSpread:85,thumbParallel:.9,thumbDown:1,thumbContact:.12,thumbRingContact:.12,thumbPinkyContact:.12,thumbBetween:.5,thumbCover:.15,thumbFront:.18,ext:[0,0,0,0],thumb:.5,thumbOut:.3,thumbIndex:1.3,thumbMiddle:.8,tipGap:.5,ringGap:.5,cross:-.3,thumbTips:.9,up:1,side:0,down:-1};
const l={...neutral,ext:[1,0,0,0],thumb:-.4,thumbOut:1.1,thumbIndex:1.7};
assert(scoreFeatures(l,'L').score>=88);assert(scoreFeatures(l,'D').score<88);assert(scoreFeatures(l,'ILY').score<88);
const v={...neutral,ext:[1,1,0,0]};assert(scoreFeatures(v,'V').score>=88);assert(scoreFeatures(v,'U').score<88);
const u={...v,tipGap:.15};assert(scoreFeatures(u,'U').score>=88);assert(scoreFeatures(u,'V').score<88);
const s={...neutral};assert(scoreFeatures(s,'S').score>=88);assert(scoreFeatures(s,'E').score<88);
const h={...u,up:0,side:1,down:0};assert(scoreFeatures(h,'H').score>scoreFeatures(h,'U').score);
const c={...neutral,ext:[.8,.8,.8,.8],thumbIndex:.7};assert(scoreFeatures(c,'C').score>=88);assert(scoreFeatures(c,'O').score<88);
const o={...c,thumbIndex:.1};assert(scoreFeatures(o,'O').score>=88);assert(scoreFeatures(o,'C').score<88);
const f={...neutral,ext:[.6,1,1,1],thumbIndex:.1};assert(scoreFeatures(f,'F').score>=88);
// User-reported thumb and round-shape regressions. Fixtures describe geometric
// constraints, not measured signer data; they do not establish camera accuracy.
for(const id of ['R','U','V','W','X']){
 const pose={...neutral,ext:id==='W'?[1,1,1,0]:id==='X'?[.4,0,0,0]:[1,1,0,0],thumbIndex:id==='X'?.8:1.3,tipGap:id==='U'?.15:.5,cross:id==='R'?.15:-.3};
 assert(scoreFeatures(pose,id).score>=88,`${id} accepts a tucked thumb`);
 assert(scoreFeatures({...pose,thumb:-.6,thumbOut:1.1,thumbRingContact:.8,thumbPinkyContact:.8},id).score<88,`${id} rejects an extended thumb`);
 assert(scoreFeatures({...pose,thumbRingContact:.75,thumbPinkyContact:.75},id).score<88,`${id} requires actual finger contact`);
}
for(const id of ['Y','ILY']){
 const pose={...l,ext:id==='Y'?[0,0,0,1]:[1,0,0,1]};
 assert(scoreFeatures(pose,id).score>=88);
 assert(scoreFeatures({...pose,thumbStraight:90},id).score<88,`${id} rejects a bent thumb`);
 assert(scoreFeatures({...pose,thumbSpread:15},id).score<88,`${id} rejects a thumb against the palm`);
}
const q={...neutral,ext:[1,0,0,0],thumb:-.2,thumbIndex:.4,down:1,up:-1};
assert(scoreFeatures(q,'Q').score>=88);
for(const wrong of [{thumbParallel:0},{thumbDown:-1},{down:0},{thumbStraight:90}])assert(scoreFeatures({...q,...wrong},'Q').score<88);
const tuckedT={...neutral,thumbBetween:.5,thumbSlot:.5,localCover:[-.2,-.2,-.2],thumbCover:-.2,thumbFront:-.15,thumbTips:.4};
assert(scoreFeatures(tuckedT,'T').score>=88);
assert(scoreFeatures({...tuckedT,localCover:[.25,.25,.25]},'T').score<88);
assert(scoreFeatures({...tuckedT,thumbSlot:1.5},'T').score<88);
assert(scoreFeatures(tuckedT,'S').score<88);
assert(scoreFeatures({...s,thumbTips:.4},'S').score>=88,'S no longer requires a large thumb-to-tip gap');
assert(scoreFeatures({...s,thumbContact:.8},'S').score<88);
assert(scoreFeatures({...o,closure:1},'O').score<88,'Only index contact is not an O');
assert(scoreFeatures({...c,roundSpread:.8},'C').score<88);
assert(scoreFeatures({...c,roundness:[1,1,1,1]},'C').score<88,'Flat fingers are not rounded');
assert(scoreFeatures({...o,thumbIndex:.65},'O').score<88);
assert(scoreFeatures({...c,thumbIndex:.05},'C').score<88);
// Exercise feature extraction as well as handcrafted feature fixtures.
const w=[{x:0,y:0,z:0},{x:-.6,y:.3,z:0},{x:-.8,y:.6,z:0},{x:-1.1,y:.8,z:0},{x:-1.4,y:1,z:0}];
for(let i=0;i<4;i++)for(let j=0;j<4;j++)w.push({x:(i-1.5)*.4,y:1+j*.35,z:j===3?.04:0});
const world=w.map(p=>({x:p.x*.06,y:p.y*.06,z:p.z*.06}));
const screen=w.map(p=>({x:.5+p.x*.13,y:.7-p.y*.13,z:p.z*.13}));
const extracted=features(screen,world);assert(extracted);assert(extracted.thumbStraight>150);assert(extracted.roundness.every(v=>v>.98));
const transformed=world.map(p=>({x:3-p.y*2,y:4+p.x*2,z:2+p.z*2}));
const mirrored=world.map(p=>({...p,x:-p.x}));
for(const other of [features(screen,transformed),features(screen,mirrored)])for(const key of ['thumb','thumbStraight','thumbSpread','thumbContact','thumbCover','thumbFront','thumbBetween','closure'])assert(Math.abs(other[key]-extracted[key])<1e-5,key+' should not depend on hand size or handedness');
assert.equal(features(screen,world.map((p,i)=>i===4?{...p,z:NaN}:p)),null);
// No completion on one lucky frame, stale frames, mismatches or letter switches.
const g=new HoldGate(1000);assert.equal(g.update('L',true,0),0);for(let t=100;t<=900;t+=100)assert(g.update('L',true,t)<1);assert.equal(g.update('L',true,1000),1);assert.equal(g.update('I',true,1100),0);assert.equal(g.update('I',false,1200),0);assert.equal(g.update('I',true,1300),0);assert.equal(g.update('I',true,2000),0);
// Deadline is authoritative; setup and pause time are excluded; duplicate resolutions blocked.
const test=new CameraTest(['L','I'],20,()=>.9);test.tick(99999);assert.equal(test.state,'ready');test.start(1000);test.tick(20999);assert.equal(test.state,'running');test.pause(11000);test.tick(999999);assert.equal(test.state,'paused');test.resume(100000);test.tick(109999);assert.equal(test.state,'running');test.tick(110000);assert.equal(test.state,'review');assert.equal(test.total,0);assert.equal(test.resolve(true,100,'late'),false);test.next();test.start(200000);assert.equal(test.resolve(true,94,'match'),true);assert.equal(test.resolve(true,94,'duplicate'),false);test.next();assert.equal(test.state,'done');assert.equal(test.total,1);assert.equal(test.results.length,2);
// A stationary finger and wrong path cannot pass a movement letter.
const tracker=new MotionTracker();
function arm(path,id='Z',hand='Right',scale=.2){for(let t=-400;t<=0;t+=100)tracker.update(id,{x:path[0][0],y:path[0][1]},t,true,hand,scale);}
for(let t=0;t<1600;t+=100)assert.equal(tracker.update('Z',{x:.5,y:.5},t,true).match,false);
tracker.reset();const z=[[.7,.3],[.66,.3],[.62,.3],[.62,.34],[.67,.39],[.71,.43],[.67,.43],[.63,.43],[.59,.43]];let res;arm(z);z.forEach(([x,y],i)=>res=tracker.update('Z',{x,y},i*100,true));assert(res.match);
tracker.reset();z.forEach(([x,y],i)=>res=tracker.update('Z',{x,y},i*100,false));assert(!res.match);
tracker.reset();const j=[[.6,.3],[.6,.34],[.6,.38],[.6,.43],[.58,.44],[.54,.41],[.52,.40]];arm(j,'J');j.forEach(([x,y],i)=>res=tracker.update('J',{x,y},i*120,true));assert(res.match);
tracker.reset();arm(j.map(([x,y])=>[1-x,y]),'J','Left');j.forEach(([x,y],i)=>res=tracker.update('J',{x:1-x,y},i*120,true,'Left'));assert(res.match);
// Drawing scale follows palm size, and a mirrored Z is valid for the left hand.
for(const scale of [.10,.20,.30]){
 tracker.reset();arm(z.map(([x,y])=>[.5+(x-.5)*scale/.2,.5+(y-.5)*scale/.2]),'Z','Right',scale);z.forEach(([x,y],i)=>res=tracker.update('Z',{x:.5+(x-.5)*scale/.2,y:.5+(y-.5)*scale/.2},i*100,true,'Right',scale));assert(res.match);
}
tracker.reset();arm(z.map(([x,y])=>[1-x,y]),'Z','Left');z.forEach(([x,y],i)=>res=tracker.update('Z',{x:1-x,y},i*100,true,'Left'));assert(res.match);
tracker.reset();const scribble=[[.7,.3],[.66,.25],[.62,.3],[.66,.35],[.7,.4],[.66,.48],[.62,.4]];
arm(scribble);scribble.forEach(([x,y],i)=>{res=tracker.update('Z',{x,y},i*100,true);assert(!res.match);});
tracker.reset();arm(z);z.forEach(([x,y],i)=>res=tracker.update('Z',{x,y},i*100,true));assert(res.match);tracker.reset();arm(z);tracker.update('Z',{x:.7,y:.3},0,true);assert(!tracker.update('Z',{x:.3,y:.7},100,true).match,'Tracking jumps reset');assert.equal(tracker.trail.length,0);
console.log('Passed scoring distinctions, hold continuity, timeouts, pause/resume, double-award prevention, and J/Z trajectories.');

const thumbError=scoreFeatures({...l,thumbStraight:80},'L');assert(thumbError.correction.fingers.includes(0));assert(scoreFeatures({...l,ext:[0,0,0,0]},'L').correction.fingers.includes(1));assert.equal(scoreFeatures(l,'L').correction,null);

// E accepts bent fingertips without demanding a completely closed fist.
const e={...neutral,ext:[.45,.4,.4,.35],eContact:.18,eHeight:.2,thumbFront:-.2,thumbCover:-.2};
assert(scoreFeatures(e,'E').score>=88);
assert(scoreFeatures({...e,dipAngles:[180,180,180,180]},'E').score<88);
assert(scoreFeatures({...e,eContact:.85},'E').score<88);
// Distinguish the thumb's local gap, even when palm-wide thumb fractions vary.
for(const [id,slot] of [['T',.5],['N',1.5],['M',2.5]]){
 const pose={...tuckedT,thumbSlot:slot};
 for(const thumb of [.25,.55,.85])assert(scoreFeatures({...pose,thumb},id).score>=88);
 for(const other of ['T','N','M'].filter(x=>x!==id))assert(scoreFeatures(pose,other).score<88);
 assert(scoreFeatures({...pose,thumbSlot:NaN},id).score<88,'Hidden thumb is not automatically accepted');
}
const gg={...q,roundness:[1,.2,.2,.2],side:1,down:0,up:0};assert(scoreFeatures(gg,'G').score>=88);
assert(scoreFeatures({...gg,thumbSide:0},'G').score<88);
assert(scoreFeatures({...gg,thumbParallel:-.5},'G').score<88);
assert(scoreFeatures({...o,roundness:[.4,.45,.48,.5]},'O').score>=88);
assert(scoreFeatures({...o,pipAngles:[30,30,30,30]},'O').score<88);
assert(scoreFeatures({...o,roundness:[.15,.2,.2,.2]},'O').score<88);
const zshape={...neutral,ext:[1,0,0,0],thumbMiddle:.8};
assert(scoreMotionShape(zshape,'Z').score>=88,'Z does not require D thumb circle');
assert(scoreMotionShape({...zshape,thumbRingContact:.9},'Z').score<88);
tracker.reset();let ready=tracker.update('J',{x:.5,y:.3},0,true);assert.equal(ready.phase,'arming');assert.equal(tracker.trail.length,0);
tracker.update('J',{x:.5,y:.3},100,true);tracker.update('J',{x:.5,y:.3},200,true);
assert.equal(tracker.update('J',{x:.5,y:.3},400,true).phase,'drawing');
assert.equal(tracker.trail.length,1);
assert.equal(tracker.update('J',{x:.5,y:.35},500,false).phase,'shape');assert.equal(tracker.trail.length,0);
tracker.reset();arm(j,'J');j.forEach(([x,y],i)=>tracker.update('J',{x,y},i*120,true));
assert.deepEqual(tracker.trail.at(-1),{x:j.at(-1)[0],y:j.at(-1)[1]},'Trail uses the exact scored fingertip coordinates');
assert.equal(tracker.update('J',{x:.5,y:.4},2000,true).phase,'arming','Stale frames require rearming');
console.log('Passed E/G/M/N/O/T geometry, Z starting pose, pen arming, trail coordinates, and interrupted strokes.');

// Completion also needs a lead over other letters: a high target score alone is insufficient.
for(const [id,pose] of [['E',e],['G',gg],['O',o],...['T','N','M'].map((id,i)=>[id,{...tuckedT,thumbSlot:i+.5,ext:[.35,.35,.35,.35]}])]){
 const own=scoreFeatures(pose,id).score;
 const rival=Math.max(...STATIC_IDS.filter(other=>other!==id).map(other=>scoreFeatures(pose,other).score));
 assert(own>=88&&own-rival>=4,`${id} must be completable, not just display a high score (${own} vs ${rival})`);
}
