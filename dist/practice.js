// Deliberate letter-by-letter practice, not continuous fingerspelling recognition.
export function normalizeName(value){
 const letters=value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[\s’'\-]/g,'');
 if(!letters||!/^[A-Z]+$/.test(letters))throw new Error('Use A–Z letters, spaces, apostrophes, or hyphens.');
 if(letters.length>24)throw new Error('Try a name with 24 letters or fewer.');
 return [...letters];
}
export function missedLetters(results){return [...new Set((Array.isArray(results)?results:[]).filter(r=>r?.correct===false&&/^[A-Z]$/.test(r.letter)).map(r=>r.letter))];}
export class PracticeSequence{
 constructor(ids,kind='name'){this.ids=[...ids];this.kind=kind;this.index=0;this.state='signing';this.releaseSince=null;this.releaseLast=null;}
 get letter(){return this.ids[this.index];}
 get completed(){return this.state==='done'?this.ids.length:this.index+(this.state==='release'?1:0);}
 match(){if(this.state!=='signing')return false;this.state=this.index===this.ids.length-1?'done':'release';return true;}
 release(noHand,now){
  if(this.state!=='release')return false;
  if(!noHand||this.releaseLast!==null&&now-this.releaseLast>350)this.releaseSince=null;
  this.releaseLast=now;
  if(!noHand)return false;
  if(this.releaseSince===null)this.releaseSince=now;
  if(now-this.releaseSince<400)return false;
  this.index++;this.state='signing';this.releaseSince=null;this.releaseLast=null;return true;
 }
}
export function framing(points){
 if(!points||points.length!==21||points.some(p=>!Number.isFinite(p.x+p.y+p.z)))return {ok:false,message:'Show one whole hand inside the camera view.'};
 if(points.some(p=>p.x<.035||p.x>.965||p.y<.035||p.y>.965))return {ok:false,message:'Move your hand away from the edges so every fingertip is visible.'};
 const width=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x));
 const height=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
 if(Math.max(width,height)<.24)return {ok:false,message:'Move a little closer to the camera.'};
 return {ok:true,message:'Your hand is in frame.'};
}
export class SetupGate{
 constructor(){this.reset();}
 reset(){this.since=null;this.last=null;this.anchor=null;}
 update(points,now){
  const frame=framing(points),center=points?.[9];
  if(!frame.ok||this.last!==null&&now-this.last>350||this.anchor&&Math.hypot(center.x-this.anchor.x,center.y-this.anchor.y)>.045){this.since=null;this.anchor=null;}
  this.last=now;if(!frame.ok)return {...frame,ready:false,progress:0};
  if(this.since===null){this.since=now;this.anchor={x:center.x,y:center.y};}
  const progress=Math.min(1,(now-this.since)/700);
  return {ok:true,ready:progress===1,progress,message:progress===1?'Camera framing ready.':'Hold your hand still for a moment.'};
 }
}
