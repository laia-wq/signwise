// Opt-in, memory-only geometry reports. No video, image, audio, network or storage.
export class TrackingReport {
 constructor(){this.clear();}
 clear(){this.recording=false;this.frames=[];this.letter=null;this.started=null;this.reason=null;}
 start(letter,now){this.clear();this.letter=letter;this.started=now;this.recording=true;}
 push(now,packet){
  if(!this.recording)return;
  if(now-this.started>=8000||this.frames.length>=100){this.stop('capture finished');return;}
  const {landmarks,worldLandmarks,handedness,score,match,valid,features,checks,status,motion}=packet;
  this.frames.push(JSON.parse(JSON.stringify({t:Math.round(now-this.started),landmarks,worldLandmarks,handedness,score,match,valid,features,checks,status,motion})));
 }
 stop(reason='stopped'){this.recording=false;this.reason=reason;}
 export(){return {format:'signwise-tracking-v1',appRevision:12,letter:this.letter,reason:this.reason,frames:this.frames};}
}
