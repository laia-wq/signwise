import {bestAlphabetResult,nextStepEligible,resultCelebration} from './progress.js?v=15';
import {TrackingReport} from './diagnostics.js?v=15';
import {normalizeName,missedLetters,PracticeSequence,SetupGate,framing} from './practice.js?v=15';
import {lessons} from './lessons.js?v=15';
import {assessHand,MotionTracker} from './coach.js?v=15';
import {HoldGate,CameraTest} from './session.js?v=15';
const $=id=>document.getElementById(id),video=$('video'),canvas=$('overlay'),ctx=canvas.getContext('2d');
let selected=0,completed=new Set(),active=false,stream=null,detector=null,detectorPromise=null,requestId=0,raf=0,lastFrame=-1,lastRun=0,lastFeedback='',test=null,testInterval=null,countdownUntil=0,scorePeak=0,lastHand=null,beginPending=false;
const hold=new HoldGate(1100),motion=new MotionTracker(),setup=new SetupGate();
const report=new TrackingReport();let captureTimer=null;let capturePreparing=false;
function finishCapture(reason='capture finished'){
 clearTimeout(captureTimer);captureTimer=null;capturePreparing=false;report.stop(reason);
 $('capture-status').textContent=report.frames.length?`Captured ${report.frames.length} tracking samples. Download the report to share it, or discard it.`:'No tracking samples captured. Enable the camera and try again.';
 $('capture-download').disabled=!report.frames.length;$('capture-start').disabled=false;
}
$('capture-start').onclick=()=>{
 if(!active){$('capture-status').textContent='Enable the camera first, then start a capture.';return;}
 if(test&&test.state!=='done'){ $('capture-status').textContent='End the test and capture the letter in practice.';return;}
 report.clear();capturePreparing=true;
 const letter=lessons[selected].id;let remaining=3;
 $('capture-download').disabled=true;$('capture-start').disabled=true;
 const prepare=()=>{
  if(!active||letter!==lessons[selected].id||test&&test.state!=='done'){finishCapture('capture cancelled');return;}
  if(remaining>0){$('capture-status').textContent=`Get ready: ${remaining--}… Make ${letter} and keep it in view.`;captureTimer=setTimeout(prepare,1000);return;}
  capturePreparing=false;report.start(letter,performance.now());
  $('capture-status').textContent='Capturing for 8 seconds. Hold the sign until this message says finished.';
  captureTimer=setTimeout(()=>finishCapture(),8000);
 };prepare();
};
$('capture-discard').onclick=()=>{clearTimeout(captureTimer);captureTimer=null;capturePreparing=false;report.clear();$('capture-download').disabled=true;$('capture-start').disabled=false;$('capture-status').textContent='Report discarded. Nothing was uploaded.';};
$('capture-download').onclick=()=>{
 if(report.recording||!report.frames.length)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(report.export())],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=`signwise-${report.letter}-tracking.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function updateDiagnostics(r,now){
 if(!$('tracking-details').open&&!report.recording)return;
 const result=r.landmarks.length===1?assessHand(r.landmarks[0],r.worldLandmarks?.[0],lessons[selected].id):null;
 if($('tracking-details').open){
  const f=result?.features;
  $('tracking-live').textContent=f?['index','middle','ring','pinky'].map((name,i)=>`${name}: ${(f.folded?.[i]??f.ext[i])<=.4?'folded estimate':f.ext[i]>=.8?'extended estimate':'partly bent estimate'}`).join(' · '):'No usable hand geometry. Try turning slightly so the fingertips are visible.';
  const checks=result?.checks?.filter(c=>c.fit<.95).sort((a,b)=>a.fit-b.fit).slice(0,3)||[];
  $('tracking-rules').textContent=checks.length?'Checks not met: '+checks.map(c=>c.hint).join(' '):result?.valid?'Handshape checks met. '+$('hold-label').textContent:'Waiting for a clear hand.';
 }
 if(report.recording){
  if(report.letter!==lessons[selected].id){finishCapture('letter changed');return;}
  report.push(now,{landmarks:r.landmarks,worldLandmarks:r.worldLandmarks,handedness:r.handedness,score:result?.score,match:result?.match,valid:result?.valid,features:result?.features,checks:result?.checks,status:$('hold-label').textContent,motion:{armed:motion.armed,direction:motion.direction,samples:motion.samples,completed:motion.completedAt!==null}});
  if(!report.recording)finishCapture();
 }
}
let sequence=null,missed=[],setupReady=false,waitingStart=false;
try{missed=missedLetters(JSON.parse(localStorage.getItem('signwise-camera-test-v1')||'null')?.results);}catch{}
function renderSequence(){
 document.body.classList.toggle('sequencing',!!sequence);$('sequence-panel').hidden=!sequence;
 $('retry-saved').hidden=!missed.length||!!sequence;
 if(!sequence)return;
 $('sequence-title').textContent=sequence.kind==='name'?'Spell your name':'Practice missed letters';
 $('sequence-letters').replaceChildren(...sequence.ids.map((id,i)=>{const el=document.createElement('span');el.textContent=id;el.className=i<sequence.completed?'complete':i===sequence.index?'current':'';el.setAttribute('aria-label',`${id}: ${i<sequence.completed?'completed':i===sequence.index?'current':'up next'}`);if(i===sequence.index&&sequence.state!=='done')el.setAttribute('aria-current','step');return el;}));
 $('sequence-status').textContent=sequence.state==='done'?`All ${sequence.ids.length} letters matched! ${sequence.kind==='name'?'You practiced your name, one letter at a time.':'Ready to try them without the guides?'}`:sequence.state==='release'?`${sequence.letter} matched. Lower your hand out of view to continue.`:`Letter ${sequence.index+1} of ${sequence.ids.length}: make ${sequence.letter}.`;
 $('sequence-end').textContent=sequence.state==='done'?'Back to alphabet':'End practice';
 $('sequence-retest').hidden=sequence.kind!=='retry'||sequence.state!=='done';
}
function endSequence(){sequence=null;resetTracking();render();feedback('Back to alphabet practice.','Choose a letter or start another name.');}
function startSequence(ids,kind){
 if(test&&test.state!=='done')endTest();test=null;clearInterval(testInterval);testInterval=null;
 sequence=new PracticeSequence(ids,kind);selected=lessons.findIndex(l=>l.id===sequence.letter);resetTracking();render();
 feedback('Follow the highlighted letter.','Each camera match advances your practice. Lower your hand between letters.');
 document.querySelector('.practice').scrollIntoView({behavior:'smooth',block:'start'});
}
function updateSetup(r,now){
 const state=setup.update(r.landmarks.length===1?r.landmarks[0]:null,now);
 $('setup-progress').hidden=false;$('setup-progress').value=state.progress*100;
 $('setup-message').textContent=r.landmarks.length>1?'Show only one hand.':state.message;
 if(state.ready){setupReady=true;$('setup-title').textContent='Camera ready';$('setup-panel').classList.add('ready');$('setup-recheck').hidden=false;$('setup-progress').hidden=true;}
 return state.ready;
}
function resetSetup(){setupReady=false;setup.reset();$('setup-panel').classList.remove('ready');$('setup-title').textContent='Check your framing';$('setup-message').textContent='Show one whole hand and hold it still briefly. Use even light.';$('setup-progress').value=0;$('setup-recheck').hidden=true;}

try{const saved=JSON.parse(localStorage.getItem('signwise-camera-completed-v1')||'[]');if(Array.isArray(saved))completed=new Set(saved.filter(id=>lessons.some(l=>l.id===id)));}catch{}
let bestResult=null;
try{bestResult=bestAlphabetResult(JSON.parse(localStorage.getItem('signwise-best-alphabet-v1')||'null'),JSON.parse(localStorage.getItem('signwise-camera-test-v1')||'null'));}catch{}
function renderProgress(){
 $('count').textContent=bestResult?`${bestResult.correct} / 26`:'—';
 $('best-context').textContent=bestResult?`${bestResult.seconds?`${bestResult.seconds}s per letter`:"Full alphabet"} · ${Number.isFinite(Date.parse(bestResult.date))?new Date(bestResult.date).toLocaleDateString():'Saved on this device'}`:'Take the final test to set a score.';
 $('practice-count').textContent=`${[...completed].filter(id=>id!=='ILY').length} / 26 letters practiced`;
}
function feedback(title,detail='',success=false){const key=title+detail+success;if(key===lastFeedback)return;lastFeedback=key;$('feedback-title').textContent=title;$('feedback-detail').textContent=detail;document.querySelector('.feedback').classList.toggle('success',success);}
function resetTracking(){hold.reset();motion.reset();lastHand=null;scorePeak=0;$('match-score').textContent='—';$('match-meter').value=0;$('hold-meter').value=0;$('hold-label').textContent='Waiting for a clear hand';}
function render(){const l=lessons[selected];$('lessons').innerHTML=lessons.map((x,i)=>`<button class="lesson-button ${i===selected?'active':''}" data-index="${i}" aria-pressed="${i===selected}" aria-label="${x.name}" ${test&&test.state!=='done'?'disabled':''}><span class="lesson-glyph">${x.id==='ILY'?'♡':x.id}</span><span><strong>${x.name}</strong><small>${x.sub}</small></span><span class="lesson-check">${completed.has(x.id)?'✓':''}</span></button>`).join('');$('title').textContent=test&&test.state!=='done'?`Make the letter ${l.id}`:l.id==='ILY'?'I love you':`Meet the letter ${l.id}`;$('letter').textContent=l.id;$('description').textContent=l.desc;$('steps').innerHTML=l.steps.map(s=>`<li>${s}</li>`).join('');$('tip').textContent=l.tip;$('hand-figure').hidden=!l.image;if(l.image){$('hand-reference').src=l.image;$('hand-reference').alt=`ASL ${l.id}${l.motion?' handshape and movement arrows':' handshape reference'}`;}$('motion-note').hidden=!l.motion;$('motion-tools').hidden=!l.motion;$('motion-note').textContent=`Hold the starting handshape until the pen is ready. Your ${l.id==='J'?'pinky':'index'} tip draws the trail. Keep the shape as you trace ${l.id}; a lost shape clears the stroke.`;$('coach-mode').textContent=l.motion?'Camera motion matching':'Camera handshape matching';$('camera-prompt').textContent='Your turn to sign';$('camera-help').textContent='Enable your camera for a live match score.';$('image-source').href='https://commons.wikimedia.org/wiki/File:Asl_alphabet_gallaudet.svg';$('reference').textContent=l.id==='ILY'?'View ASL University reference ↗':'View HandSpeak alphabet reference ↗';$('reference').href=l.id==='ILY'?'https://www.lifeprint.com/asl101/topics/ily.htm':'https://www.handspeak.com/topic/408/';renderProgress();$('completion-status').textContent=completed.has(l.id)?'Practiced with the camera ✓':'Hold a camera match to mark this letter practiced';$('next').innerHTML=selected===26?'Back to letter A ↻':'Next handshape →';$('image-error').hidden=true;renderTest();renderSequence();}
function selectLesson(index){if(sequence||test&&test.state!=='done')return;selected=index;resetTracking();render();feedback('Ready when you are.',lessons[index].motion?'Show the starting shape, then draw the movement slowly.':'Reach an 88/100 handshape match and hold for just over a second.');}
function markComplete(){const id=lessons[selected].id;if(!completed.has(id)){completed.add(id);try{localStorage.setItem('signwise-camera-completed-v1',JSON.stringify([...completed]));}catch{}render();}}
$('lessons').onclick=e=>{const b=e.target.closest('[data-index]');if(b)selectLesson(Number(b.dataset.index));};$('next').onclick=()=>selectLesson((selected+1)%lessons.length);
$('reset').onclick=()=>{sequence=null;missed=[];if(test)endTest();$('retry-actions').hidden=true;completed.clear();bestResult=null;try{localStorage.removeItem('signwise-camera-completed-v1');localStorage.removeItem('signwise-camera-test-v1');localStorage.removeItem('signwise-best-alphabet-v1');}catch{}render();feedback('Camera progress reset.','New matches will be recorded automatically.');};
$('hand-reference').onerror=()=>{$('image-error').hidden=false;};
function drawHand(p,good,correction=null){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 const digits=[[0,1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
 const highlight=new Set(correction?.fingers||[]);
 const line=(chain,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();chain.forEach((v,i)=>{const x=p[v].x*canvas.width,y=p[v].y*canvas.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();};
 line([0,5,9,13,17,0],good?'#80e5bd':'#b9a6ff',3);
 digits.forEach((chain,i)=>{line(chain,good?'#80e5bd':highlight.has(i)?'#ffc14d':'#b9a6ff',highlight.has(i)?7:3);if(highlight.has(i)){const q=p[chain.at(-1)];ctx.beginPath();ctx.arc(q.x*canvas.width,q.y*canvas.height,10,0,Math.PI*2);ctx.strokeStyle='#ffc14d';ctx.lineWidth=3;ctx.stroke();}});
 ctx.fillStyle='#fff';for(const q of p){ctx.beginPath();ctx.arc(q.x*canvas.width,q.y*canvas.height,3,0,Math.PI*2);ctx.fill();}
 if($('tracking-details').open){
  ['Thumb','Index','Middle','Ring','Pinky'].forEach((name,i)=>{const q=p[[4,8,12,16,20][i]];ctx.save();ctx.translate(q.x*canvas.width,q.y*canvas.height-13);ctx.scale(-1,1);ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#141226';ctx.strokeText(name,0,0);ctx.fillStyle='#fff';ctx.fillText(name,0,0);ctx.restore();});
 }

}
function drawMotion(good){
 const trail=motion.trail;if(!trail.length)return;
 ctx.save();ctx.strokeStyle=good?'#80e5bd':'#49ddff';ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#071522';ctx.shadowBlur=4;ctx.beginPath();
 trail.forEach((p,i)=>{const x=p.x*canvas.width,y=p.y*canvas.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
 const tip=trail.at(-1);ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(tip.x*canvas.width,tip.y*canvas.height,8,0,Math.PI*2);ctx.fill();ctx.restore();
}
$('motion-reset').onclick=()=>{motion.reset();hold.reset();ctx.clearRect(0,0,canvas.width,canvas.height);$('hold-label').textContent='Stroke cleared · show the starting handshape';};
function processFrame(r,now){
 if(!setupReady){
  resetTracking();ctx.clearRect(0,0,canvas.width,canvas.height);
  if(r.landmarks.length===1)drawHand(r.landmarks[0],false);
  updateSetup(r,now);feedback(setupReady?'Camera ready.':'Let’s check your camera framing.',setupReady?'Make the letter shown above.':'Scoring starts after one whole hand is held steadily in view.');return;
 }
 if(sequence?.state==='release'){
  resetTracking();ctx.clearRect(0,0,canvas.width,canvas.height);
  if(sequence.release(r.landmarks.length===0,now)){selected=lessons.findIndex(l=>l.id===sequence.letter);render();feedback(`Next: ${sequence.letter}`,'Bring your hand back into view.');}
  else feedback('Letter matched. Lower your hand.','Move your whole hand out of view briefly to start the next letter.');
  return;
 }
 if(sequence?.state==='done'){ctx.clearRect(0,0,canvas.width,canvas.height);return;}
 if(r.landmarks.length!==1){$('setup-message').textContent=r.landmarks.length>1?'Show one hand for reliable tracking.':'No hand tracked.';resetTracking();ctx.clearRect(0,0,canvas.width,canvas.height);feedback(r.landmarks.length>1?'Show only one hand.':'Bring your hand into view.',test?.state==='running'?'The timer is running.':'Keep all fingertips visible.');return;}
 const frame=framing(r.landmarks[0]);
 if(!frame.ok){resetTracking();ctx.clearRect(0,0,canvas.width,canvas.height);$('setup-message').textContent=frame.message;feedback('Tracking is unclear.',frame.message+(test?.state==='running'?' The timer is still running.':''));return;}
 $('setup-message').textContent='One hand in frame. Keep every fingertip visible.';
 const handed=r.handedness?.[0]?.[0]?.categoryName||'Right';if(lastHand&&lastHand!==handed){hold.reset();motion.reset();}lastHand=handed;
 const l=lessons[selected],result=assessHand(r.landmarks[0],r.worldLandmarks[0],l.id);
 drawHand(r.landmarks[0],result.match,test&&test.state!=='done'?null:result.correction);$('camera-badge').textContent='CAMERA ON';
 if(test&&test.state!=='done'&&test.state!=='running'){hold.reset();motion.reset();return;}
 if(test){test.tick(now);if(test.state==='review'){onTestReview(false);return;}}
 let score=result.score,matched=false,progress=0;
 let movement=null;
 if(l.motion){
  movement=motion.update(l.id,r.landmarks[0][l.id==='J'?20:8],now,result.valid&&result.match,handed,result.features?.screenPalm,result.features?.hookDirection);
  score=Math.round(result.score*.45+movement.score*.55);matched=movement.match&&result.match;progress=movement.phase==='arming'?movement.ready*.2:movement.score/100;
  const digit=l.id==='J'?'Pinky':'Index';
  $('hold-label').textContent=matched?'Movement matched':movement.phase==='shape'?'Pen off · show the starting handshape':movement.phase==='arming'?'Hold still · getting the pen ready':movement.phase==='paused'?'Pen paused · bring the handshape back into view':movement.phase==='retry'?'Stroke cleared · hold the starting shape again':`${digit} pen on · ${movement.score===0?'start your stroke':movement.score===35?(l.id==='J'?'downstroke seen · curve toward your thumb':'top stroke seen'):movement.score===65?'finish the bottom stroke':'downstroke seen · finish the hook'}`;
  drawMotion(matched);
 }

 else{progress=hold.update(l.id,result.valid&&result.match,now);matched=progress>=1;$('hold-label').textContent=result.match?`Hold steady · ${Math.round(progress*100)}%`:'Reach an 88/100 handshape match';}
 $('match-score').textContent=String(score);$('match-meter').value=score;$('hold-meter').value=progress*100;scorePeak=Math.max(scorePeak,score);
 if(matched){markComplete();if(sequence){sequence.match();hold.reset();motion.reset();renderSequence();feedback(sequence.state==='done'?'Practice complete ✓':`${l.id} matched ✓`,sequence.state==='done'?'Every letter in this sequence matched the camera.':'Lower your hand out of view to continue.',true);return;}if(test?.state==='running'){test.resolve(true,score,'Matched by camera');onTestReview(true);}else feedback(`${l.id} practiced ✓`,'The camera matched your shape'+(l.motion?' and movement.':'.'),true);}
 else if(test?.state==='running')feedback(`Make ${l.id} from memory.`,l.motion?'The handshape and motion both count.':'Keep trying until the timer ends. Hints return after the attempt.');
 else feedback(l.motion&&result.match?$('hold-label').textContent:result.title,l.motion&&result.match?'The bright trail shows the fingertip movement being scored. Use Clear stroke to try again.':result.detail);
}
function tick(now){if(!active)return;try{if(video.readyState>=2&&video.currentTime!==lastFrame&&now-lastRun>85){lastRun=now;lastFrame=video.currentTime;const r=detector.detectForVideo(video,now);if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight;}processFrame(r,now);updateDiagnostics(r,now);}raf=requestAnimationFrame(tick);}catch(e){stopCamera(false);feedback('The camera coach paused.','Restart the camera to try again. Your active test is paused.');}}
function stopCamera(announce=true){if(report.recording||capturePreparing)finishCapture('camera stopped');requestId++;active=false;cancelAnimationFrame(raf);if(test?.state==='running')test.pause(performance.now());countdownUntil=0;waitingStart=false;resetSetup();stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;ctx.clearRect(0,0,canvas.width,canvas.height);$('camera').classList.remove('live');$('camera-empty').hidden=false;$('stop').hidden=true;$('start').disabled=false;$('start').textContent='Enable camera ↗';$('camera-badge').textContent='CAMERA OFF';resetTracking();renderTest();if(announce)feedback('Camera is off.',test?.state==='paused'?'Your test is paused. Enable the camera, then resume.':'Enable it again when you’re ready.');}
async function loadDetector(){if(detector)return detector;if(!detectorPromise)detectorPromise=(async()=>{const {HandLandmarker,FilesetResolver}=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/vision_bundle.mjs');const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm');return HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55});})().then(d=>detector=d).catch(e=>{detectorPromise=null;throw e;});return detectorPromise;}
async function startCamera(){if(active)return true;const current=++requestId;$('start').disabled=true;$('start').textContent='Starting camera…';feedback('Getting your camera ready.','Allow camera access. The model downloads once; no video is uploaded.');try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Unsupported browser');const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}});if(current!==requestId){media.getTracks().forEach(t=>t.stop());return false;}stream=media;$('stop').hidden=false;await loadDetector();if(current!==requestId)return false;video.srcObject=stream;await video.play();if(current!==requestId)return false;active=true;lastFrame=-1;lastRun=0;resetTracking();resetSetup();$('camera').classList.add('live');$('camera-empty').hidden=true;$('camera-badge').textContent='CAMERA ON';stream.getVideoTracks()[0].addEventListener('ended',()=>{if(active)stopCamera();});raf=requestAnimationFrame(tick);renderTest();return true;}catch(e){if(current!==requestId)return false;stopCamera(false);feedback(e.name==='NotAllowedError'?'Camera access was not allowed.':'We could not start the camera.',e.name==='NotAllowedError'?'Allow camera access in your browser settings and try again.':e.name==='NotFoundError'?'Connect a camera and try again.':'Check your connection and camera availability, then try again. The hand-tracking model must finish loading.');return false;}}
$('start').onclick=startCamera;$('stop').onclick=()=>stopCamera();
window.addEventListener('pagehide',()=>stopCamera(false));document.addEventListener('visibilitychange',()=>{if(document.hidden&&(active||stream))stopCamera(false);});
function renderTest(){const live=test&&test.state!=='done';$('test-banner').hidden=!live;document.body.classList.toggle('testing',!!live);document.body.classList.toggle('test-review',test?.state==='review');$('test-home').hidden=!!live||test?.state==='done';$('test-finish').hidden=test?.state!=='done';$('next').hidden=!!live;
 if(!live)return;$('test-letter').textContent=`Make ${test.letter}`;$('test-position').textContent=`Letter ${test.index+1} of ${test.ids.length} · ${test.total} correct`;$('test-continue').hidden=test.state!=='review';$('test-resume').hidden=!['ready','paused'].includes(test.state)||!!countdownUntil||waitingStart;$('test-resume').textContent=test.state==='paused'?'Resume attempt':'Begin attempt';$('test-time').textContent=test.state==='running'?`${Math.max(0,Math.ceil((test.deadline-performance.now())/1000))}s`:test.state==='paused'?'Paused':test.state==='review'?'Attempt finished':waitingStart?'Camera setup':countdownUntil?`Ready in ${Math.max(1,Math.ceil((countdownUntil-performance.now())/1000))}`:'Ready';}
async function beginAttempt(){if(!test||!['ready','paused'].includes(test.state)||countdownUntil||waitingStart||beginPending)return;const attempt=test;beginPending=true;try{if(!active&&!await startCamera())return;if(test!==attempt||!active)return;resetTracking();if(setupReady)countdownUntil=performance.now()+3000;else waitingStart=true;renderTest();}finally{beginPending=false;}}
function clockTest(){if(!test||test.state==='done')return;const now=performance.now();if(waitingStart&&setupReady&&active){waitingStart=false;countdownUntil=now+3000;}if(countdownUntil&&now>=countdownUntil){countdownUntil=0;if(active){test.state==='paused'?test.resume(now):test.start(now);resetTracking();}}if(test.state==='running'&&active&&now-lastRun>1500){test.pause(now);feedback('The camera feed stopped updating.','Your test is paused. Restart the camera, then resume.');}if(test.state==='running'){test.tick(now);if(test.state==='review')onTestReview(false);}renderTest();}
function onTestReview(correct){if(!test||test.state!=='review')return;if(test.results.length===test.ids.length){test.next();finishTest();return;}countdownUntil=0;resetTracking();render();const current=test.results.at(-1);$('match-score').textContent=String(current.score);$('match-meter').value=current.score;$('hold-label').textContent=correct?'Matched before the deadline':'No accepted match before the deadline';$('test-outcome').textContent=correct?`${current.letter}: correct ✓`:`${current.letter}: incorrect — time ran out`;$('test-outcome').className=correct?'outcome-correct':'outcome-wrong';feedback(correct?'Letter matched ✓':'Time ran out — marked incorrect.',correct?'Continue when you’re ready.':'Review the image, then continue to the next letter.',correct);}
function finishTest(){missed=missedLetters(test.results);$('retry-actions').hidden=!missed.length;$('retry-summary').textContent=`Review ${missed.length} missed ${missed.length===1?'letter':'letters'} with hints, then try again.`;clearInterval(testInterval);testInterval=null;document.body.classList.remove('testing','test-review');const total=test.total,n=test.ids.length;$('test-final-score').textContent=`${total} / ${n} letters correct`;$('test-results').replaceChildren();for(const r of test.results){const row=document.createElement('li');row.textContent=`${r.letter}: ${r.correct?'Correct':'Incorrect (timed out)'}`;$('test-results').append(row);}const result={correct:total,total:n,results:test.results,seconds:test.limit/1000,date:new Date().toISOString()};bestResult=bestAlphabetResult(bestResult,result);$('learning-next').hidden=!nextStepEligible(result);const celebration=resultCelebration(total,n);$('result-headline').textContent=celebration.headline;$('result-symbol').textContent=celebration.symbol;$('result-hero').className=`result-hero ${celebration.tier}`;$('result-save-status').textContent='';try{localStorage.setItem('signwise-camera-test-v1',JSON.stringify(result));if(bestResult)localStorage.setItem('signwise-best-alphabet-v1',JSON.stringify(bestResult));}catch{$('result-save-status').textContent='Your result is shown here, but this browser could not save it. Keep this tab open if you want to keep the result.';}render();feedback('Test complete.',`${total} of ${n} letters matched before the time limit.`,true);$('test-finish').scrollIntoView({behavior:'smooth',block:'start'});}
function endTest(){clearInterval(testInterval);testInterval=null;test=null;countdownUntil=0;waitingStart=false;resetTracking();render();feedback('Test ended.','Incomplete tests are not saved as a final score. Matched letters remain marked as practiced.');}
async function startTest(ids=null){
 if(report.recording||capturePreparing)finishCapture('test started');
 sequence=null;clearInterval(testInterval);waitingStart=false;countdownUntil=0;
 const count=Number($('test-count').value),seconds=Number($('test-seconds').value);
 test=new CameraTest(ids||Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),seconds);if(!ids)test.ids=test.ids.slice(0,count);
 selected=lessons.findIndex(l=>l.id===test.letter);resetTracking();render();
 $('test-outcome').textContent='Complete camera setup, then a 3-second countdown starts your attempt.';
 testInterval=setInterval(clockTest,100);document.querySelector('.camera-wrap').scrollIntoView({behavior:'smooth',block:'center'});await beginAttempt();
}
$('test-start').onclick=()=>startTest();
$('name-form').onsubmit=e=>{e.preventDefault();try{const ids=normalizeName($('name-input').value);$('name-error').hidden=true;startSequence(ids,'name');}catch(error){$('name-error').textContent=error.message;$('name-error').hidden=false;}};
$('sequence-end').onclick=endSequence;
$('sequence-retest').onclick=()=>startTest([...sequence.ids]);
$('retry-practice').onclick=$('retry-saved').onclick=()=>{if(missed.length)startSequence([...missed],'retry');};
$('retry-test').onclick=()=>{if(missed.length)startTest([...missed]);};
$('setup-recheck').onclick=()=>{resetTracking();resetSetup();};
$('test-resume').onclick=beginAttempt;$('test-end').onclick=endTest;$('test-continue').onclick=()=>{test.next();if(test.state==='done'){finishTest();return;}selected=lessons.findIndex(l=>l.id===test.letter);resetTracking();$('test-outcome').textContent='';render();beginAttempt();};$('test-again').onclick=()=>{endTest();$('test-home').scrollIntoView({behavior:'smooth'});};
render();feedback('Camera scoring is ready.','Match a static letter at 88/100 for just over a second, or complete the J/Z movement, to finish automatically.');
window.addEventListener('signwise-select-lesson',event=>{const i=lessons.findIndex(l=>l.id===event.detail);if(i>=0)selectLesson(i);});
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'select_handshape_lesson',title:'Select a handshape lesson',description:'Open a practice guide. Unavailable during an active camera test. Does not activate the camera or award completion.',inputSchema:{type:'object',properties:{handshape:{type:'string',enum:lessons.map(l=>l.id)}},required:['handshape'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||Object.keys(input).some(k=>k!=='handshape'))throw new Error('Provide only a handshape.');if(sequence||test&&test.state!=='done')throw new Error('End the current practice or test before changing lessons.');const i=lessons.findIndex(l=>l.id===input.handshape);if(i<0)throw new Error('Choose A–Z or ILY.');selectLesson(i);return {selected:lessons[i].id};}})).catch(()=>{});}catch{}}
