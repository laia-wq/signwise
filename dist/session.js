export const PASS_SCORE=88;
export class HoldGate{
 constructor(duration=1000){this.duration=duration;this.reset();}
 reset(){this.since=null;this.last=null;this.key=null;}
 update(key,ok,now){if(key!==this.key||(this.last!==null&&now-this.last>350)){this.reset();this.key=key;}this.last=now;if(!ok){this.since=null;return 0;}if(this.since===null)this.since=now;return Math.min(1,(now-this.since)/this.duration);}
}
export class CameraTest{
 constructor(ids,seconds=20,random=Math.random){this.ids=[...ids];for(let i=this.ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[this.ids[i],this.ids[j]]=[this.ids[j],this.ids[i]];}this.limit=seconds*1000;this.index=0;this.results=[];this.state='ready';this.deadline=null;this.remaining=this.limit;}
 get letter(){return this.ids[this.index];}
 start(now){if(this.state!=='ready')return;this.state='running';this.deadline=now+this.remaining;}
 pause(now){if(this.state==='running'){this.remaining=Math.max(0,this.deadline-now);this.state='paused';}}
 resume(now){if(this.state==='paused'){this.state='running';this.deadline=now+this.remaining;}}
 tick(now){if(this.state==='running'&&now>=this.deadline)this.resolve(false,0,'Time ran out');}
 resolve(correct,score,reason){if(this.state!=='running')return false;this.results.push({letter:this.letter,correct,score,reason});this.state='review';return true;}
 next(){if(this.state!=='review')return;this.index++;this.state=this.index===this.ids.length?'done':'ready';this.remaining=this.limit;this.deadline=null;}
 get total(){return this.results.filter(r=>r.correct).length;}
}
