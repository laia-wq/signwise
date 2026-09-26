import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
import * as progress from '../dist/progress.js';import * as practice from '../dist/practice.js';import * as coach from '../dist/coach.js';import * as session from '../dist/session.js';import {TrackingReport} from '../dist/diagnostics.js';import {lessons} from '../dist/lessons.js';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
class Element{
 constructor(){this.hidden=false;this.value=0;this.textContent='';this.children=[];this.classList={add(){},remove(){},toggle(){}};}
 getContext(){return {clearRect(){}};}setAttribute(){}replaceChildren(...c){this.children=c;}append(c){this.children.push(c);}scrollIntoView(){}
}
function boot(saved=new Map()){
 const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));nodes['test-count'].value='26';nodes['test-seconds'].value='20';
 const ctx=vm.createContext({...progress,...practice,...coach,...session,TrackingReport,lessons,console,performance:{now:()=>0},setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},cancelAnimationFrame(){},requestAnimationFrame(){},document:{getElementById:id=>{assert(nodes[id],`Missing ${id}`);return nodes[id];},querySelector:()=>new Element(),createElement:()=>new Element(),body:new Element(),addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)}});
 const src=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');vm.runInContext(src,ctx);
 return {nodes,saved,run:code=>vm.runInContext(code,ctx)};
}
const app=boot();assert.equal(app.nodes.count.textContent,'—');
function finish(correct,n=26){app.run(`test=new CameraTest([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].slice(0,${n}),20,()=>.5);for(let i=0;i<${n};i++){test.start(i*30000);if(i<${correct})test.resolve(true,100,'match');else test.tick(i*30000+20000);test.next();}finishTest();`);}
finish(24);assert.equal(app.nodes.count.textContent,'24 / 26');assert.equal(app.nodes['learning-next'].hidden,false);assert.equal(app.nodes['test-results'].children.length,26);
finish(5,5);assert.equal(app.nodes.count.textContent,'24 / 26');assert.equal(app.nodes['learning-next'].hidden,true);assert.match(app.nodes['test-reflection'].textContent,/shorter test/);
const reopened=boot(app.saved);assert.equal(reopened.nodes.count.textContent,'24 / 26');
finish(23);assert.equal(app.nodes.count.textContent,'24 / 26');assert(app.nodes['learning-next'].hidden);
app.run("test=new CameraTest(['A','B'],20,()=>.9);test.start(0);test.resolve(true,100,'match');onTestReview(true)");assert.equal(app.nodes['test-outcome'].textContent,'A: correct ✓');
app.run('endTest()');assert.equal(app.nodes.count.textContent,'24 / 26');
app.nodes.reset.onclick();assert.equal(app.nodes.count.textContent,'—');assert.equal(app.saved.size,0);
console.log('Passed app result rendering, short-test isolation, reload persistence, early exit and reset.');
