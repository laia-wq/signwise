import assert from 'node:assert/strict';
import {STATIC_IDS,features,fingerExtension,foldedExtension,assessFeatures,assessHand,scoreFeatures,scoreMotionShape,MotionTracker} from '../dist/coach.js';
import {HoldGate,CameraTest} from '../dist/session.js';
assert.equal(new Set([...STATIC_IDS,'J','Z']).size,27);
assert.equal(assessHand(null,null,'L').score,0);
// Distinctive shapes should be preferred over common lookalikes.
const neutral={thumbIndexContact:1.3,thumbMiddleBase:.8,middleDown:-1,thumbSlot:.5,localCover:[.15,.15,.15],pipAngles:[110,110,110,110],dipAngles:[90,90,90,90],eContact:.9,eHeight:.25,thumbSide:1,roundness:[.75,.75,.75,.75],roundSpread:.25,closure:.35,thumbStraight:165,thumbSpread:85,thumbParallel:.9,thumbDown:1,thumbContact:.12,thumbRingContact:.12,thumbPinkyContact:.12,thumbBetween:.5,thumbCover:.15,thumbFront:.18,ext:[0,0,0,0],thumb:.5,thumbOut:.3,thumbIndex:1.3,thumbMiddle:.8,tipGap:.5,ringGap:.5,cross:-.3,thumbTips:.9,up:1,side:0,down:-1};
const l={...neutral,ext:[1,0,0,0],thumb:-.4,thumbOut:1.1,thumbIndex:1.7};
assert(scoreFeatures(l,'L').score>=88);assert(scoreFeatures(l,'D').score<88);assert(scoreFeatures(l,'ILY').score<88);
const v={...neutral,ext:[1,1,0,0]};assert(scoreFeatures(v,'V').score>=88);assert(scoreFeatures(v,'U').score<88);
const u={...v,tipGap:.15};assert(scoreFeatures(u,'U').score>=88);assert(scoreFeatures(u,'V').score<88);
const s={...neutral};assert(scoreFeatures(s,'S').score>=88);assert(scoreFeatures(s,'E').score<88);
const h={...u,up:0,side:1,down:0};assert(scoreFeatures(h,'H').score>scoreFeatures(h,'U').score);
const c={...neutral,ext:[.8,.8,.8,.8],thumbIndex:.7};assert(scoreFeatures(c,'C').score>=88);assert(scoreFeatures(c,'O').score<88);
const o={...c,thumbIndex:.1,thumbIndexContact:.1};assert(scoreFeatures(o,'O').score>=88);assert(scoreFeatures(o,'C').score<88);
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
assert(scoreFeatures({...o,thumbIndex:.65,thumbIndexContact:.65},'O').score<88);
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
assert(scoreFeatures({...o,pipAngles:[15,15,15,15]},'O').score<88);
assert(scoreFeatures({...o,roundness:[.15,.2,.2,.2]},'O').score<88);
const zshape={...neutral,ext:[1,0,0,0],thumbMiddle:.8};
assert(scoreMotionShape(zshape,'Z').score>=88,'Z does not require D thumb circle');
assert(scoreMotionShape({...zshape,thumbRingContact:.9},'Z').score<88);
tracker.reset();let ready=tracker.update('J',{x:.5,y:.3},0,true);assert.equal(ready.phase,'arming');assert.equal(tracker.trail.length,0);
tracker.update('J',{x:.5,y:.3},100,true);tracker.update('J',{x:.5,y:.3},200,true);
assert.equal(tracker.update('J',{x:.5,y:.3},400,true).phase,'drawing');
assert.equal(tracker.trail.length,1);
assert.equal(tracker.update('J',{x:.5,y:.35},500,false).phase,'paused');assert.equal(tracker.trail.length,1);assert.equal(tracker.update('J',{x:.5,y:.35},650,false).phase,'shape');assert.equal(tracker.trail.length,0);
tracker.reset();arm(j,'J');j.forEach(([x,y],i)=>tracker.update('J',{x,y},i*120,true));
assert.deepEqual(tracker.trail.at(-1),{x:j[tracker.completedAt/120][0],y:j[tracker.completedAt/120][1]},'Trail freezes at the fingertip that completed the scored stroke');
assert.equal(tracker.update('J',{x:.5,y:.4},2000,true).phase,'arming','Stale frames require rearming');
console.log('Passed E/G/M/N/O/T geometry, Z starting pose, pen arming, trail coordinates, and interrupted strokes.');

// Completion uses the requested letter's rules, not incomparable rival scores.
for(const [id,pose] of [['E',e],['G',gg],['O',o],...['T','N','M'].map((id,i)=>[id,{...tuckedT,thumbSlot:i+.5,ext:[.35,.35,.35,.35]}])]){
 const result=assessFeatures(pose,id);assert(result.match,`${id}: ${result.title}`);
 const hold=new HoldGate(1100);let progress=0;
 for(let t=0;t<=1200;t+=100)progress=hold.update(id,result.match,t);
 assert.equal(progress,1,`${id} must complete`);
}
// Reproduce the actual 100%-but-ambiguous failure: E and S can both satisfy
// their coarse estimates. A requested E must not be blocked by S's score.
const tiedE={...e,ext:[0,0,0,0],thumbFront:.18,thumbCover:.15};
assert.equal(scoreFeatures(tiedE,'E').score,100);assert.equal(scoreFeatures(tiedE,'S').score,100);
assert.equal(assessFeatures(tiedE,'E').match,true);
for(const [id,slot] of [['M',2.5],['N',1.5],['T',.5]]){
 const pose={...tuckedT,thumbSlot:slot,eContact:.2,eHeight:.15};
 assert.equal(scoreFeatures(pose,'E').score,100);
 assert.equal(assessFeatures(pose,id).match,true);
 assert.equal(assessFeatures({...pose,thumbSlot:NaN},id).match,false);
}
// Short finger geometry has the same curl as a long finger, regardless of its
// distance from the wrist. Still reject a genuinely extended pinky in W/K/P.
const curled=[{x:0,y:0,z:0},{x:0,y:1,z:0},{x:0,y:1.2,z:.65},{x:0,y:.7,z:.9}];
const straight=[0,1,1.7,2.2].map(y=>({x:0,y,z:0}));
const pinkyCurl=fingerExtension(curled);assert(pinkyCurl<=.4);
assert(fingerExtension(straight)>.9);
for(const scale of [.35,.7,1.4]){
 const finger=curled.map(p=>({x:3+p.x*scale,y:2+p.y*scale,z:4+p.z*scale}));
 assert(Math.abs(fingerExtension(finger)-pinkyCurl)<1e-8);
}
const k={...neutral,ext:[1,.65,0,pinkyCurl],thumbMiddleBase:.12,thumbMiddle:.5,up:.8,tipGap:.4};
const pp={...k,up:0,down:0,side:1,middleDown:.8};
for(const [id,pose] of [['K',k],['P',pp],['W',{...neutral,ext:[1,1,1,pinkyCurl]}]]){
 assert(assessFeatures(pose,id).match,`${id} accepts a curled short pinky`);
 assert(!assessFeatures({...pose,ext:[...pose.ext.slice(0,3),1]},id).match,`${id} rejects an extended pinky`);
}
assert(!assessFeatures({...k,thumbMiddleBase:.8},'K').match);
assert(!assessFeatures({...pp,down:1,up:-1,middleDown:-.5},'P').match,'A downward index cannot substitute for a downward middle finger');
assert(assessFeatures({...pp,down:1,up:-1,middleDown:1},'P').match,'Palm-down P is not rejected just because its index also angles down');
assert(!assessFeatures({...pp,middleDown:-.8},'P').match);
assert(assessFeatures({...o,thumbIndex:.38,thumbIndexContact:.16},'O').match,'Finger pad contact need not coincide with tip centers');
assert(!assessFeatures({...o,thumbIndexContact:.7},'O').match);

// Rounded J turns start curving BEFORE the lowest point. Both hands and a
// short hook must work; a straight drop, L, reversed hook, loop or random
// scribble must not. The same tracker supplies the practice and test UI.
const roundedJ=[[.60,.30],[.601,.325],[.60,.35],[.594,.378],[.58,.400],[.56,.41],[.54,.405],[.529,.392]];
const smallJ=[[.60,.30],[.60,.325],[.60,.35],[.59,.37],[.575,.375],[.56,.372],[.55,.362]];
function traceJ(path,hand='Right',scale=.2,interval=100){
 const track=new MotionTracker();
 const transformed=path.map(([x,y])=>({x:.5+((hand==='Left'?1-x:x)-.5)*scale/.2,y:.5+(y-.5)*scale/.2}));
 for(let t=-400;t<=0;t+=100)track.update('J',transformed[0],t,true,hand,scale);
 let result;transformed.forEach((p,i)=>result=track.update('J',p,i*interval,true,hand,scale));
 return {track,result};
}
for(const hand of ['Left','Right'])for(const scale of [.12,.2,.3])for(const path of [roundedJ,smallJ]){
 const {track,result}=traceJ(path,hand,scale);assert(result.match,`${hand} rounded J at scale ${scale}`);
 assert(track.trail.length>=5&&track.trail.length<=path.length);
}
for(const bad of [roundedJ.map(([x,y])=>[.6,y]),roundedJ.map(([x,y])=>[1.2-x,y]),[[.6,.3],[.6,.33],[.6,.36],[.6,.40],[.57,.40],[.54,.40],[.51,.4]],[[.6,.3],[.56,.33],[.6,.38],[.55,.4],[.6,.43],[.54,.45],[.53,.41]]])assert(!traceJ(bad).result.match);
const rotating=new MotionTracker();for(let t=-400;t<=0;t+=100)rotating.update('J',{x:roundedJ[0][0],y:roundedJ[0][1]},t,true);
roundedJ.forEach(([x,y],i)=>res=rotating.update('J',{x,y},i*100,true,'Right',.2-i*.012));assert(res.match,'Natural rotation may foreshorten the projected palm');
const interruptedJ=new MotionTracker();for(let t=-400;t<=0;t+=100)interruptedJ.update('J',{x:.6,y:.3},t,true);
interruptedJ.update('J',{x:.6,y:.33},100,true);const savedTrail=interruptedJ.trail;
assert.equal(interruptedJ.update('J',{x:.4,y:.7},200,false).match,false);assert.deepEqual(interruptedJ.trail,savedTrail,'Uncertain frames do not add ink');
assert.equal(interruptedJ.update('J',{x:.4,y:.7},300,false).phase,'shape');assert.equal(interruptedJ.trail.length,0);
console.log('Passed target completion, finger-length invariance, K/P orientation, O pad contact, and rounded J acceptance/rejection.');
// End-to-end synthetic landmark sequence: extract a J handshape on every
// frame, feed the same assessment into MotionTracker, then award a timed test.
// This is a deterministic geometry fixture, not a measured signer accuracy test.
const jWorld=[{x:0,y:0,z:0},{x:-.8,y:.35,z:0},{x:-.7,y:.7,z:0},{x:-.1,y:1.1,z:.35},{x:.3,y:1.35,z:.4}];
for(const x of [-.6,-.2,.2])jWorld.push({x,y:1,z:0},{x,y:1.45,z:0},{x,y:1.5,z:.35},{x,y:1.2,z:.55});
for(let n=0;n<4;n++)jWorld.push({x:.6,y:1+n*.35,z:0});
for(const hand of ['Right','Left']){
 const shape=jWorld.map(p=>({x:p.x*.06*(hand==='Left'?-1:1),y:-p.y*.06,z:p.z*.06}));
 const base=jWorld.map(p=>({x:.5+p.x*.13*(hand==='Left'?-1:1),y:.7-p.y*.13,z:p.z*.13}));
 const frames=roundedJ.map(([x,y])=>base.map(p=>({...p,x:p.x-base[20].x+(hand==='Left'?1-x:x),y:p.y-base[20].y+y})));
 const m=new MotionTracker(),quiz=new CameraTest(['J'],20);quiz.start(0);
 const initial=assessHand(frames[0],shape,'J');assert(initial.match,initial.title);
 for(let t=-400;t<=0;t+=100)m.update('J',frames[0][20],t,initial.match,hand,.2);
 let accepted=false;
 frames.forEach((points,i)=>{
  const verdict=assessHand(points,shape,'J');assert(verdict.match,verdict.title);
  const result=m.update('J',points[20],i*100,verdict.match,hand,.2);
  if(result.match){accepted=true;quiz.resolve(true,100,'Matched by camera');}
 });
 assert(accepted,`${hand} J must complete through landmark extraction and scoring`);
 assert.equal(quiz.total,1);assert.equal(quiz.results.length,1);
}
console.log('Passed synthetic raw-landmark J completion for both hands through timed-test scoring.');

// Base-knuckle folding used to fail because the distal joints stayed straight.
const baseFold=[{x:.6,y:1,z:0},{x:.6,y:.7,z:.1},{x:.6,y:.45,z:.18},{x:.6,y:.25,z:.24}];
assert(fingerExtension(baseFold)>.8);
assert(foldedExtension(baseFold,{x:0,y:0,z:0})<.4);
assert(foldedExtension(straight,{x:0,y:-1,z:0})>.8,'A raised straight finger stays extended');
const foldedWorld=jWorld.map(p=>({...p}));
for(const b of [5,9])for(let n=0;n<4;n++)foldedWorld[b+n]={x:foldedWorld[b].x,y:1+n*.35,z:0};
for(const b of [13,17])baseFold.forEach((p,n)=>foldedWorld[b+n]={...p,x:foldedWorld[b].x});
foldedWorld[4]={x:-.2,y:1.1,z:.05};
const toWorld=ps=>ps.map(p=>({x:p.x*.06,y:-p.y*.06,z:p.z*.06}));
const toScreen=ps=>ps.map(p=>({x:.5+p.x*.13,y:.7-p.y*.13,z:p.z*.13}));
const foldedK=assessHand(toScreen(foldedWorld),toWorld(foldedWorld),'K');
assert(foldedK.features.ext[3]>.8,'Old last-joint check calls the folded pinky straight');
assert(foldedK.match,foldedK.title);
// A tall, narrow hand is valid. World-space geometry is not discarded merely
// because the hand is turned sideways in the video.
const narrow=toScreen(foldedWorld).map(p=>({...p,x:.5+(p.x-.5)*.2}));
assert(features(narrow,toWorld(foldedWorld)),'Side profile must reach the scorer');
const tiny=narrow.map(p=>({...p,y:.5+(p.y-.5)*.1}));assert.equal(features(tiny,toWorld(foldedWorld)),null);
// J follows the observed thumb side, independently of the detector's label.
for(const label of ['Right','Left'])for(const direction of [-1,1]){
 const m=new MotionTracker();const path=roundedJ.map(([x,y])=>({x:direction===-1?x:1-x,y}));
 for(let t=-400;t<=0;t+=100)m.update('J',path[0],t,true,label,.2,direction);
 let result;path.forEach((p,i)=>result=m.update('J',p,i*100,true,label,.2,direction));
 assert(result.match,`Observed thumb direction ${direction} with ${label} label`);
 const expected=path[m.completedAt/100];assert.deepEqual(m.trail.at(-1),expected,'Visible ink and scoring use the same direction');
 const wrong=new MotionTracker();for(let t=-400;t<=0;t+=100)wrong.update('J',path[0],t,true,label,.2,-direction);
 path.forEach((p,i)=>result=wrong.update('J',p,i*100,true,label,.2,-direction));assert(!result.match,'Hook away from the observed thumb is rejected');
}
console.log('Passed base-knuckle folded K landmarks, narrow profiles, and observed J hook direction.');
// Corroborate a partially occluded W pinky with a visible PIP reversal and
// thumb contact, without accepting an extended pinky or a detached thumb.
const supportedW={...neutral,ext:[.94,.97,1,.68],folded:[.94,.97,1,.68],pinkyTurn:-.7,thumbPinkyContact:.15};
assert(assessFeatures(supportedW,'W').match);
assert(!assessFeatures({...supportedW,pinkyTurn:.9},'W').match);
assert(!assessFeatures({...supportedW,thumbPinkyContact:.6},'W').match);
assert(!assessFeatures({...supportedW,folded:[.94,.97,1,.95]},'W').match);
console.log('Passed corroborated W pinky fold and negative controls.');
// O can corroborate contact from image-space depth when the independently
// estimated world depth separates fingertips that visibly close the circle.
const imageO={...o,thumbIndexContact:.62,closure:1.24,imageIndexTurn:-.6,imageThumbContact:.24,imageClosure:.38};
assert(assessFeatures(imageO,'O').match);
for(const change of [{imageThumbContact:.5},{imageClosure:.7},{imageIndexTurn:.9},{roundness:[1,1,1,1]},{roundness:[.1,.1,.1,.1]}])assert(!assessFeatures({...imageO,...change},'O').match);
console.log('Passed image-corroborated O contact, open-gap, straight-finger and fist controls.');
// O's corroboration has no binary cutoff at the old turn/closure boundaries.
for(const [field,values] of [['imageIndexTurn',[-.201,-.199]],['imageClosure',[.449,.451]],['imageThumbContact',[.279,.281]]]){
 const scores=values.map(v=>scoreFeatures({...imageO,[field]:v},'O').score);
 assert(Math.abs(scores[0]-scores[1])<=2,`${field} should change smoothly`);
}
console.log('Passed O contact continuity across former cutoff boundaries.');
// Sweep every static lesson through the same scorer and hold used by practice
// and the test. These are rule fixtures, not a camera-accuracy benchmark.
const poses={A:{...neutral,thumb:-.3},B:{...neutral,ext:[1,1,1,1],tipGap:.15},C:c,D:{...neutral,ext:[1,0,0,0],thumbMiddle:.15},E:e,F:f,G:gg,H:h,I:{...neutral,ext:[0,0,0,1]},K:k,L:l,M:{...tuckedT,thumbSlot:2.5},N:{...tuckedT,thumbSlot:1.5},O:o,P:pp,Q:q,R:{...v,cross:.2},S:s,T:tuckedT,U:u,V:v,W:{...neutral,ext:[1,1,1,0]},X:{...neutral,ext:[.4,0,0,0],thumbIndex:.8},Y:{...l,ext:[0,0,0,1]},ILY:{...l,ext:[1,0,0,1]}};
assert.deepEqual(Object.keys(poses).sort(),[...STATIC_IDS].sort());
for(const [id,pose] of Object.entries(poses)){
 const a=assessFeatures(pose,id);assert(a.match,`${id} positive rule fixture must match (${a.score}: ${a.hint})`);
 const hg=new HoldGate(1100);for(let time=0;time<=1100;time+=100){const progress=hg.update(id,a.match,time);assert.equal(progress===1,time===1100);}
 assert(!assessHand(null,null,id).match,`${id} rejects missing hand`);
}
console.log('Passed all 25 static lessons (including ILY); J/Z movement regressions covered above.');
