import assert from 'node:assert/strict';
import {bestAlphabetResult,fullAlphabetResult,nextStepEligible} from '../dist/progress.js';
import {CameraTest} from '../dist/session.js';
const make=(correct,n=26,seconds=20)=>({correct,total:n,seconds,date:'2026-09-26T00:00:00Z',results:[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].slice(0,n).map((letter,i)=>({letter,correct:i<correct}))});
const full=make(24);assert(fullAlphabetResult(full));assert(nextStepEligible(full));assert(!nextStepEligible(make(23)));assert(!nextStepEligible(make(5,5)));
assert.equal(bestAlphabetResult(full,make(5,5)),full);assert.equal(bestAlphabetResult(full,make(23)),full);assert.equal(bestAlphabetResult(null,make(10,10)),null);
assert.equal(bestAlphabetResult(full,make(25)).correct,25);assert.equal(bestAlphabetResult(full,make(24,26,15)).seconds,15);
assert.equal(bestAlphabetResult(full,make(24,26,30)),full);assert(!fullAlphabetResult({...full,correct:26}));assert(!fullAlphabetResult({...full,results:Array(26).fill({letter:'A',correct:true})}));
for(const correct of [true,false]){
 const t=new CameraTest([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],15,()=>.5);
 for(let i=0;i<26;i++){t.start(i*20000);if(correct)t.resolve(true,100,'match');else t.tick(i*20000+15000);assert.equal(t.state,'review');assert(!t.resolve(true,100,'duplicate'));t.next();}
 assert.equal(t.state,'done');assert.equal(t.total,correct?26:0);assert.equal(new Set(t.results.map(r=>r.letter)).size,26);
}
console.log('Passed full-alphabet results, all-correct/all-timeout tests, best-score persistence rules, and next-step thresholds.');
