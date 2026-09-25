// Experimental geometric matcher, not a trained or calibrated ASL classifier.
// Scores describe landmark-rule fit, not the probability of correct signing.
const clamp=v=>Math.max(0,Math.min(1,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const angle=(a,b,c)=>{const u=[a.x-b.x,a.y-b.y,a.z-b.z],v=[c.x-b.x,c.y-b.y,c.z-b.z];const n=Math.hypot(...u)*Math.hypot(...v);return n?Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/n)))*180/Math.PI:0;};
const range=(x,lo,hi,slack=.25)=>!Number.isFinite(x)?0:x<lo?clamp(1-(lo-x)/slack):x>hi?clamp(1-(x-hi)/slack):1;
export const STATIC_IDS=Array.from('ABCDEFGHIKLMNOPQRSTUVWXY').concat('ILY');
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const unit=v=>{const n=Math.hypot(v.x,v.y,v.z)||1;return {x:v.x/n,y:v.y/n,z:v.z/n};};
const cross3=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const segmentDistance=(p,a,b)=>{const v=sub(b,a),t=clamp(dot(sub(p,a),v)/(dot(v,v)||1));return dist(p,{x:a.x+t*v.x,y:a.y+t*v.y,z:a.z+t*v.z});};
export function fingerExtension([mcp,pip,dip,tip]){
 const joint=Math.min(angle(mcp,pip,dip),angle(pip,dip,tip));
 const length=dist(mcp,pip)+dist(pip,dip)+dist(dip,tip);
 if(length<1e-6)return 0;
 const reach=dist(mcp,tip)/length;
 return .8*clamp((joint-70)/95)+.2*clamp((reach-.45)/.45);
}
export function features(points,w){
 if(!points||!w||points.length!==21||w.length!==21||[...points,...w].some(p=>!Number.isFinite(p.x+p.y+p.z)))return null;
 if(points.some(p=>p.x<.015||p.x>.985||p.y<.015||p.y>.985))return null;
 const span=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x));
 const palm=dist(w[0],w[9]);if(palm<.015||span<.10)return null;
 // Use the finger's own joints and bone lengths. Wrist-distance ratios biased
 // short pinkies and changed with knuckle flexion, even for the same curl.
 const ext=[5,9,13,17].map(b=>fingerExtension(w.slice(b,b+4)));

 const axis={x:w[17].x-w[5].x,y:w[17].y-w[5].y,z:w[17].z-w[5].z};const width2=axis.x**2+axis.y**2+axis.z**2;
 if(width2<1e-6)return null;
 const across=p=>((p.x-w[5].x)*axis.x+(p.y-w[5].y)*axis.y+(p.z-w[5].z)*axis.z)/width2;
 const fingerVec={x:points[8].x-points[5].x,y:points[8].y-points[5].y};const len=Math.hypot(fingerVec.x,fingerVec.y)||1;
 const longitudinal=unit(sub(w[9],w[0])),normal=unit(cross3(axis,longitudinal));
 // Orient depth toward the curled finger pads, independent of left/right hand.
 const flexDepth=[8,12,16,20].reduce((sum,i)=>sum+dot(sub(w[i],w[i-3]),normal),0);
 const depth=p=>dot(sub(p,w[5]),normal)*(flexDepth<0?-1:1)/palm;
 const fingerContact=ids=>Math.min(...ids.flatMap(b=>[segmentDistance(w[4],w[b+1],w[b+2]),segmentDistance(w[4],w[b+2],w[b+3])]))/palm;
 const thumbVector=sub(w[4],w[2]),indexVector=sub(w[8],w[5]);
 const thumbScreen=sub(points[4],points[2]);
 const middleVec=sub(points[12],points[9]),middleLen=Math.hypot(middleVec.x,middleVec.y)||1;
 const thumbIndexContact=Math.min(segmentDistance(w[8],w[3],w[4]),segmentDistance(w[4],w[7],w[8]))/palm;
 const thumbMiddleBase=segmentDistance(w[4],w[9],w[10])/palm;
 const roundness=[5,9,13,17].map(b=>dist(w[b],w[b+3])/(dist(w[b],w[b+1])+dist(w[b+1],w[b+2])+dist(w[b+2],w[b+3])||1));
 const gap=across(w[10])-across(w[6]);
 // Measure thumb exit against the actual bent knuckles, not fixed palm fractions.
 const knuckles=[6,10,14,18].map(i=>across(w[i])),tx=across(w[4]);
 let thumbSlot=NaN;
 for(let i=0;i<3;i++)if(knuckles[i+1]-knuckles[i]>.06&&tx>=knuckles[i]&&tx<=knuckles[i+1])thumbSlot=i+(tx-knuckles[i])/(knuckles[i+1]-knuckles[i]);
 const tipToThumb=[8,12,16,20].map(i=>Math.min(segmentDistance(w[i],w[2],w[3]),segmentDistance(w[i],w[3],w[4]))/palm);
 const pipAngles=[5,9,13,17].map(b=>angle(w[b],w[b+1],w[b+2]));
 const dipAngles=[5,9,13,17].map(b=>angle(w[b+1],w[b+2],w[b+3]));
 return {thumbSlot,pipAngles,dipAngles,thumbIndexContact,thumbMiddleBase,middleDown:middleVec.y/middleLen,
  eContact:Math.max(...tipToThumb.slice(0,3)),
  eHeight:[8,12,16].reduce((n,i)=>n+dot(sub(w[i],w[3]),longitudinal)/palm,0)/3,
  localCover:[6,10,14].map(i=>depth(w[3])-depth(w[i])),
  thumbSide:Math.abs(thumbScreen.x)/(Math.hypot(thumbScreen.x,thumbScreen.y)||1),
  roundness,thumbStraight:angle(w[2],w[3],w[4]),thumbSpread:angle(w[4],w[2],w[5]),
  thumbParallel:dot(unit(thumbVector),unit(indexVector)),thumbDown:thumbScreen.y/(Math.hypot(thumbScreen.x,thumbScreen.y)||1),
  thumbContact:fingerContact([5,9,13,17]),thumbRingContact:fingerContact([13,17]),thumbPinkyContact:fingerContact([17]),
  thumbBetween:Math.abs(gap)>.04?(across(w[4])-across(w[6]))/gap:NaN,
  thumbCover:depth(w[3])-(depth(w[6])+depth(w[10]))/2,
  thumbFront:depth(w[4])-(depth(w[6])+depth(w[10]))/2,
  closure:Math.max(...[8,12,16,20].map(i=>dist(w[4],w[i])/palm)),
  roundSpread:Math.max(...[8,12,16].map(i=>dist(w[i],w[i+4])/palm)),
  screenPalm:Math.hypot(points[9].x-points[0].x,points[9].y-points[0].y),
  ext,thumb:across(w[4]),thumbOut:dist(w[4],w[5])/palm,thumbIndex:dist(w[4],w[8])/palm,thumbMiddle:dist(w[4],w[10])/palm,tipGap:dist(w[8],w[12])/palm,ringGap:dist(w[12],w[16])/palm,cross:across(w[8])-across(w[12]),thumbTips:[8,12,16,20].reduce((sum,i)=>sum+dist(w[4],w[i])/palm,0)/4,up:-fingerVec.y/len,side:Math.abs(fingerVec.x)/len,down:fingerVec.y/len,pinky:points[20],index:points[8],palm};
}
// Four finger-extension targets. Null means a shape-specific rule handles it.
const patterns={A:[0,0,0,0],B:[1,1,1,1],C:[.5,.5,.5,.5],D:[1,0,0,0],E:[0,0,0,0],F:[0,1,1,1],G:[1,0,0,0],H:[1,1,0,0],I:[0,0,0,1],K:[1,1,0,0],L:[1,0,0,0],M:[0,0,0,0],N:[0,0,0,0],O:[.35,.35,.35,.35],P:[1,1,0,0],Q:[1,0,0,0],R:[1,1,0,0],S:[0,0,0,0],T:[0,0,0,0],U:[1,1,0,0],V:[1,1,0,0],W:[1,1,1,0],X:[.4,0,0,0],Y:[0,0,0,1],ILY:[1,0,0,1],Z:[1,0,0,0]};
export function scoreFeatures(f,id){
 const target=patterns[id];if(!f||!target)return {score:0,hint:'Keep your entire hand in the frame.'};
 const rules=[],add=(fit,hint,critical=false,fingers=[])=>rules.push({fit:clamp(fit),hint,critical,fingers});
 const required=(value,lo,hi,hint,slack=.25)=>add(range(value,lo,hi,slack),hint,true);
 target.forEach((x,i)=>{
  if(id==='C'||id==='O'||id==='E')return; // Use whole-finger curvature, not straight/curl targets.
  const fit=id==='F'&&i===0?range(f.ext[i],0,.70,.35):id==='D'&&i>0?range(f.ext[i],0,.60,.35):
   (id==='K'||id==='P')&&i===1?range(f.ext[i],.5,1,.3):
   x===1?range(f.ext[i],.80,1,.30):x===0?range(f.ext[i],0,['M','N','T'].includes(id)?.48:.40,.25):range(f.ext[i],x-.18,x+.18,.4);
  add(fit,`${x===1?'Extend':x===0?'Curl':'Curve'} your ${['index','middle','ring','pinky'][i]} finger.`,true,[i+1]);
 });
 const upright=()=>required(f.up,.55,1,'Point the raised fingers upward.',.4);
 const thumbIn=(contact=f.thumbRingContact)=>{
  required(f.thumb,.04,1.25,'Fold your thumb across the palm, not out to the side.',.22);
  required(contact,0,.30,'Rest the thumb against the curled fingers.',.22);
 };
 const thumbExtended=()=>{
  required(f.thumbStraight,145,180,'Straighten your thumb at its last joint.',35);
  required(f.thumbSpread,55,180,'Open your thumb out from the palm.',30);
  required(f.thumb,-1.8,-.12,'Extend your thumb to the side of your hand.',.25);
 };
 const round=()=>{
  f.roundness?.forEach(v=>required(v,.48,.94,'Curve all four fingers into a rounded shape.',.16));
  if(!f.roundness)required(NaN,0,1,'Show the curved fingers clearly.');
  required(f.roundSpread,0,.43,'Keep the curved fingers together.',.22);
 };
 const spread=()=>add(range(f.tipGap,.32,1.2,.32),'Separate your index and middle fingers.');
 switch(id){
 case 'A':add(range(f.thumb,-.65,.12,.35),'Place your thumb beside the fist.');add(range(f.thumbTips,.45,1.2,.35),'Keep the thumb beside, not under, the curled fingertips.');break;
 case 'B':add(range(f.thumb,.2,.9,.4),'Fold your thumb across the palm.');add(range(f.tipGap,0,.27,.25),'Bring your fingers together.');upright();break;
 case 'C':round();required(f.thumbIndex,.38,1.05,'Leave an open C-shaped gap between thumb and fingertips.',.22);break;
 case 'D':add(range(f.thumbMiddle,0,.45,.4),'Touch your thumb to the curled fingers.');add(range(f.thumbIndex,.8,2,.5),'Keep the index separate from the thumb.');upright();break;
 case 'E':
  (f.dipAngles||[NaN]).forEach(v=>required(v,35,145,'Bend the last joints so your fingertips curl down toward the thumb.',30));
  required(f.eContact,0,.38,'Bring the curled fingertips toward the top of your thumb.',.25);
  required(f.eHeight,-.08,.55,'Keep your thumb underneath the curled fingertips, not across their front.',.2);
  required(f.thumb,.08,1.05,'Fold your thumb across beneath your fingertips.',.25);break;
 case 'F':add(range(f.thumbIndex,0,.22,.3),'Touch index fingertip and thumb into a circle.');break;
 case 'G':case 'Q':
  required(f.thumbIndex,.16,.75,'Keep a small gap between the extended thumb and index finger.',.25);
  required(f.thumbStraight,145,180,'Straighten your thumb beside the index finger.',30);
  required(f.thumbParallel,.60,1,'Point the thumb and index finger in the same direction.',.30);
  required(f.thumb,-1,.22,'Keep your thumb beside the index, not across the fist.',.25);
  required(id==='Q'?f.down:f.side,.78,1,id==='Q'?'Turn the whole G handshape downward.':'Point the index and thumb sideways.',.30);
  if(id==='G')required(f.thumbSide,.65,1,'Point your thumb sideways alongside the index finger.',.25);
  if(id==='Q')required(f.thumbDown,.55,1,'Point both the thumb and index downward.',.30);
  break;
 case 'H':case 'U':add(range(f.tipGap,0,.28,.25),'Keep index and middle fingers together.');thumbIn();add(id==='H'?range(f.side,.8,1,.6):range(f.up,.65,1,.6),id==='H'?'Turn the two fingers sideways.':'Point both fingers up.');add(range(f.cross,-1,-.04,.2),'Uncross your fingers.');break;
 case 'I':case 'Z':thumbIn();break;
 case 'K':case 'P':
  required(f.tipGap,.25,1.5,'Separate your index and middle fingers comfortably.',.3);
  required(f.thumbMiddleBase,0,.30,'Rest the thumb against the base of the middle finger, between the raised fingers.',.22);
  if(id==='P')required(f.middleDown,.25,1,'Tilt the palm down so the middle finger points down; the index can point forward or sideways.',.3);
  else required(f.up,.35,1,'Keep your index finger pointing upward; let the middle finger angle forward.',.35);
  break;
 case 'L':thumbExtended();add(range(f.thumbOut,.8,1.8,.5),'Extend your thumb out to the side.');add(range(f.thumbIndex,1,2.5,.5),'Open the L between thumb and index finger.');upright();break;
 case 'M':case 'N':case 'T':{
  const slot={T:0,N:1,M:2}[id],name={T:'index and middle',N:'middle and ring',M:'ring and pinky'}[id];
  required(f.thumbSlot,slot+.15,slot+.85,`Let the thumb tip show between your ${name} fingers. Turn slightly if it is hidden.`,.2);
  required(f.localCover?.[slot],-.8,.10,'Wrap the fingers over the thumb, rather than laying the thumb on top.',.18);
  required(f.thumbContact,0,.38,'Keep the fingers gently closed around your thumb.',.22);break;
 }
 case 'O':
  // O may be more tightly rounded than C, but a flat hand or fist is not O.
  (f.roundness||[NaN]).forEach(v=>required(v,.30,.92,'Keep a rounded space inside the O; do not flatten the fingers into a fist.',.14));
  (f.pipAngles||[NaN]).forEach(v=>required(v,50,165,'Curve your fingers smoothly around the O.',25));
  required(f.roundSpread,0,.43,'Keep the curved fingers together.',.22);required(f.thumbIndexContact,0,.28,'Bring the pads of your index finger and thumb together to close the O.',.18);required(f.closure,0,.55,'Bring all four fingertips toward the thumb, not just the index.',.25);break;
 case 'R':add(range(f.cross,0,.5,.2),'Cross your index and middle fingers.');thumbIn();upright();break;
 case 'S':required(f.thumb,.18,.95,'Lay your thumb across the front of your fist.',.25);required(f.thumbContact,0,.32,'Rest the thumb on the curled fingers.',.22);required(f.thumbFront,-.06,.65,'Place the thumb on the front of the fist, not underneath the fingers.',.18);required(f.thumbCover,-.06,.65,'Lay the thumb over the fist rather than tucking it inside.',.16);break;
 case 'V':spread();thumbIn();upright();break;
 case 'W':spread();add(range(f.ringGap,.27,1.1,.3),'Spread your ring finger away from the middle finger.');thumbIn(f.thumbPinkyContact);upright();break;
 case 'X':thumbIn();add(range(f.thumbIndex,.45,1.2,.3),'Make a hook with your index finger.');break;
 case 'Y':case 'ILY':thumbExtended();add(range(f.thumbOut,.8,1.8,.5),'Extend your thumb out to the side.');break;
 }
 const worst=rules.reduce((a,b)=>a.fit<b.fit?a:b),mean=rules.reduce((sum,r)=>sum+r.fit,0)/rules.length;
 const failed=rules.filter(r=>r.critical&&r.fit<.72).sort((a,b)=>a.fit-b.fit)[0];
 const raw=Math.round(100*(.6*mean+.4*worst.fit));
 const correction=failed||worst;
 // Explicit finger IDs for extension rules; remaining hints identify involved digits.
 const named=['thumb','index','middle','ring','pinky'].flatMap((name,i)=>correction.hint.toLowerCase().includes(name)?[i]:[]);
 const fingers=correction.fingers.length?correction.fingers:named.length?named:[1,2,3,4];
 return {score:failed?Math.min(84,raw):raw,hint:correction.hint,correction:correction.fit<.95?{fingers,message:correction.hint}:null};
}
export function assessHand(points,world,id){
 const f=features(points,world);if(!f)return {score:0,match:false,valid:false,title:'Show one whole hand clearly.',detail:'Keep every fingertip in view, move closer, and use even lighting.'};
 if(id==='J'||id==='Z'){
  const own=scoreMotionShape(f,id);
  return {score:own.score,match:own.score>=88,valid:true,features:f,correction:own.correction,title:own.score>=88?'Starting shape ready.':own.hint,detail:'Keep this handshape while tracing the movement.'};
 }
 return assessFeatures(f,id);
}
export function assessFeatures(f,id){
 if(!f||!patterns[id])return {score:0,match:false,valid:false,title:'Show the requested handshape.',detail:'Keep your whole hand in view.'};
 const own=scoreFeatures(f,id),match=own.score>=88;
 return {...own,match,valid:true,features:f,title:match?'Keep that shape steady.':own.hint,
  detail:match?'Hold this match for just over a second to complete the letter.':'Follow the highlighted correction. If a finger is hidden, turn your hand slightly toward the camera.'};
}
// Z uses an index-pointing shape with a tucked thumb, not D's thumb circle.
export function scoreMotionShape(f,id){
 if(id==='J')return scoreFeatures(f,'I');
 return scoreFeatures(f,'Z');
}
// Palm-scaled screen trajectories. Scale is fixed at the start of each attempt;
// changing distance substantially resets it instead of changing the drawn path.
const pathLength=ps=>ps.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-ps[i].x,p.y-ps[i].y),0);
const cleanStroke=ps=>{
 const a=ps[0],b=ps.at(-1),length=Math.hypot(b.x-a.x,b.y-a.y);
 if(length<.035||pathLength(ps)>length*1.35)return false;
 return ps.every(p=>Math.abs((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x))/length<.025);
};
export class MotionTracker{
 constructor(){this.reset();}
 reset(){this.samples=[];this.id=null;this.last=0;this.hand=null;this.scale=null;this.origin=null;this.armed=false;this.readySince=null;this.anchor=null;this.completedAt=null;this.lastGood=null;}
 get trail(){return !this.origin||!this.scale?[]:this.samples.map(p=>({x:this.origin.x+p.x*this.scale/.2*(this.hand==='Left'?1:-1),y:this.origin.y+p.y*this.scale/.2}));}
 update(id,point,now,shapeOK,hand='Right',palmScale=.2){
  const interrupted=this.id!==id||this.hand!==hand||now-this.last>350||this.scale&&Math.abs(palmScale/this.scale-1)>(id==='J'?.55:.35);
  // A single uncertain J frame pauses the pen, without drawing or granting a
  // match. Sustained loss clears it. Rotation can briefly occlude fingertips.
  if(id==='J'&&!interrupted&&this.armed&&!shapeOK&&point&&Number.isFinite(point.x+point.y)&&this.lastGood!==null&&now-this.lastGood<=180){
   this.last=now;return {score:0,match:false,phase:'paused'};
  }
  if(interrupted||!shapeOK||!point||!Number.isFinite(point.x+point.y)||!(palmScale>.04)){
   this.reset();this.id=id;this.hand=hand;this.last=now;
   if(!shapeOK||!point||!Number.isFinite(point.x+point.y)||!(palmScale>.04))return {score:0,match:false,phase:'shape'};
  }
  this.last=now;this.lastGood=now;
  if(this.completedAt!==null){
   if(now-this.completedAt<1400)return {score:100,match:true,phase:'matched'};
   this.reset();this.id=id;this.hand=hand;this.last=now;
  }
  if(!this.armed){
   if(!this.anchor||Math.hypot(point.x-this.anchor.x,point.y-this.anchor.y)>palmScale*.12){this.anchor={...point};this.readySince=now;}
   if(now-this.readySince<350)return {score:0,match:false,phase:'arming',ready:(now-this.readySince)/350};
   this.armed=true;
  }
  const result=this.track(id,point,now,true,hand,palmScale);
  if(!this.origin){this.armed=false;this.anchor=null;this.readySince=null;return {...result,phase:'retry'};}
  if(result.match)this.completedAt=now;
  return {...result,phase:result.match?'matched':'drawing'};
 }
 track(id,point,now,shapeOK,hand='Right',palmScale=.2){
  if(this.id!==id||this.hand!==hand||now-this.last>350||this.scale&&Math.abs(palmScale/this.scale-1)>(id==='J'?.55:.35)){this.reset();this.id=id;this.hand=hand;}
  this.last=now;
  if(!shapeOK||!point||!Number.isFinite(point.x+point.y)||!(palmScale>.04)){this.samples=[];this.origin=null;this.scale=null;return {score:0,match:false};}
  if(!this.origin){this.origin=point;this.scale=palmScale;}
  const x=(point.x-this.origin.x)*(hand==='Left'?1:-1)*.2/this.scale,y=(point.y-this.origin.y)*.2/this.scale;
  const prev=this.samples.at(-1);
  // Reject tracking jumps instead of accepting them as completed strokes.
  if(prev&&Math.hypot(x-prev.x,y-prev.y)>.12){this.samples=[];this.origin=null;this.scale=null;return {score:0,match:false};}
  if(!prev||Math.hypot(x-prev.x,y-prev.y)>.004)this.samples.push({x,y,t:now});
  if(this.samples.length&&now-this.samples[0].t>4500){this.samples=[];this.origin=null;this.scale=null;return {score:0,match:false};}
  if(this.samples.length<5)return {score:0,match:false};
  const ps=this.samples,a=ps[0],end=ps.at(-1);if(end.t-a.t<450)return {score:0,match:false};
  let match=false,progress=0;
  if(id==='Z'){
   // Try actual corners, rather than letting unrelated points somewhere in a
   // loop satisfy three independent displacement checks.
   for(let i=1;i<ps.length-2;i++){
    const b=ps[i];if(b.x-a.x<.065||Math.abs(b.y-a.y)>.027||!cleanStroke(ps.slice(0,i+1)))continue;
    progress=Math.max(progress,35);
    for(let k=i+1;k<ps.length-1;k++){
     const c=ps[k];if(c.x-b.x>-.06||c.y-b.y<.05||c.y-b.y>.20||!cleanStroke(ps.slice(i,k+1)))continue;
     progress=Math.max(progress,65);
     const top=b.x-a.x,bottom=end.x-c.x;
     if(bottom>.065&&bottom/top>.55&&bottom/top<1.8&&Math.abs(end.y-c.y)<.027&&cleanStroke(ps.slice(k)))match=true;
    }
   }
  }else if(id==='J'){
   // Split before the bend, not at the lowest point: a natural J starts
   // curving while it is still descending. Keep the hook's direction fixed.
   const bottom=ps.reduce((a,p)=>p.y>a.y?p:a,ps[0]);
   if(bottom.y-a.y>.055)progress=35;
   for(let i=1;i<ps.length-2;i++){
    const stem=ps[i],drop=stem.y-a.y;
    if(drop<.04||Math.abs(stem.x-a.x)>.04||!cleanStroke(ps.slice(0,i+1)))continue;
    progress=55;
    const hook=ps.slice(i),width=end.x-stem.x,rise=bottom.y-end.y;
    const backward=hook.slice(1).reduce((n,p,j)=>n+Math.max(0,hook[j].x-p.x),0);
    const bottomIndex=hook.reduce((best,p,j)=>p.y>hook[best].y?j:best,0);
    const verticalReversal=hook.slice(1).reduce((n,p,j)=>n+Math.max(0,j<bottomIndex?hook[j].y-p.y:p.y-hook[j].y),0);
    if(width>.03&&width<.20&&rise>.008&&rise<.13&&end.y>a.y+.025&&bottom.y-a.y>.065&&backward<.02&&verticalReversal<.02&&pathLength(hook)<2.1*(width+Math.abs(bottom.y-stem.y)))match=true;
   }
  }
  return {score:match?100:progress,match};
 }
}
