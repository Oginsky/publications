import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as M from './model.mjs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const elements=new Map(),messages=[],blobs=[];
const element=selector=>{
  if(!elements.has(selector))elements.set(selector,{value:selector==='#speed'?16:'',checked:false,hidden:true,style:{},dataset:{},innerHTML:'',textContent:'',listeners:{},classList:{toggle(){}},addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(){},focus(){},click(){},contains(){return false;},getBoundingClientRect(){return {left:0,top:0,width:800,height:600};},setPointerCapture(){},hasPointerCapture(){return false;}});
  return elements.get(selector);
};
const document={querySelector:element,querySelectorAll:()=>[],createElement:()=>({click(){}}),body:{dataset:{}},addEventListener(){},hidden:false};
class Scene{
  constructor(){this.width=800;this.height=600;this.bounds={xmin:-10,xmax:20,ymin:-10,ymax:20,span:30};this.P={origin:[0,0],scale:20};this.Z=8;}
  fit(){} changed(){} render(){} at(x,y){return [200+20*x,200-20*y];} floor(x,y){return [x/10,y/10];}
}
let requests=0;
const context=vm.createContext({M,MathSpace:Scene,document,window:{},WORKER_SOURCE:'',Worker:class{postMessage(m){messages.push(m);}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob:class{constructor(parts){blobs.push(parts.join(''));}},IntersectionObserver:class{observe(){}},requestAnimationFrame:()=>++requests,cancelAnimationFrame(){},setTimeout:()=>1,clearTimeout(){},matchMedia:()=>({matches:false})});
vm.runInContext(read('renderer.mjs').split('class MathSpace')[0]+read('app.mjs'),context);
const app=vm.runInContext('app',context),stage=element('#stage'),state=()=>JSON.stringify(context.window.weberState());
const move=(x,y)=>stage.listeners.pointermove({clientX:x,clientY:y});
assert.deepEqual(JSON.parse(JSON.stringify(app.display)),{grid:true,labels:true,contours:false,paths:true,gradient:true,step:true,rays:'none'});
assert.deepEqual(JSON.parse(JSON.stringify(app.solver)),M.solverDefaults);assert.equal(app.objects[2].type,'triangle');
app.display.gradient=false;app.display.step=false;
let before=state(),count=requests;
move(80,30);assert.equal(app.hover,null);assert.equal(requests,count);
app.display.gradient=true;app.display.step=true;
vm.runInContext('running=true',context);before=state();
move(80,30);assert.deepEqual(Array.from(app.hover),[8,3]);assert.equal(state(),before);
move(100,60);assert.deepEqual(Array.from(app.hover),[10,6]);assert.equal(state(),before);
stage.listeners.pointerleave();assert.equal(app.hover,null);assert.equal(state(),before);
app.tool='pan';move(80,30);assert.equal(app.hover,null);app.tool='select';
move(80,30);stage.listeners.pointerdown({button:2,clientX:80,clientY:30,pointerId:1,preventDefault(){}});assert.equal(app.hover,null);move(90,40);assert.equal(app.hover,null);stage.listeners.pointerup({pointerId:1});
app.display.gradient=false;app.display.step=false;vm.runInContext('raf=0',context);count=requests;
stage.listeners.wheel({clientX:80,clientY:30,deltaY:100,preventDefault(){}});assert.ok(requests>count);
app.display.step=true;stage.listeners.wheel({clientX:80,clientY:30,deltaY:100,preventDefault(){}});assert.deepEqual(Array.from(app.hover),[8,3]);
// Settings reach the worker, reset the active run, and remain attached to old runs.
element('#step').listeners.click();const firstRun=app.selectedRun;
assert.deepEqual(JSON.parse(JSON.stringify(messages.find(m=>m.type==='init').solver)),M.solverDefaults);
element('#reduction').checked=false;element('#reduction').listeners.change();assert.equal(app.model.reduction,false);assert.equal(app.selectedRun,null);assert.equal(firstRun.solver.reduction,true);assert.equal(app.runs.length,1);
element('#eta0').value=7;element('#eta0').listeners.change();assert.equal(app.solver.eta0,7);
element('#export').listeners.click();const exported=JSON.parse(blobs.at(-1));assert.equal(exported.solver.reduction,false);assert.equal(exported.solver.eta0,7);
const importScene=async data=>element('#file-input').listeners.change({target:{files:[{size:100,text:async()=>JSON.stringify(data)}],value:'scene.json'}});
await importScene({...exported,solver:{...exported.solver,eta0:4}});assert.equal(app.solver.eta0,4);assert.equal(app.model.reduction,false);
const validState=state();await importScene({...exported,solver:{...exported.solver,algorithm:'removed'}});assert.equal(state(),validState);assert.match(element('#toast').textContent,/Неизвестный алгоритм/);
const legacy={...exported};delete legacy.solver;await importScene(legacy);assert.deepEqual(JSON.parse(JSON.stringify(app.solver)),M.solverDefaults);
element('#step').listeners.click();const saved=app.selectedRun;element('#eta0').value=8;element('#eta0').listeners.change();
element('#run-list').listeners.click({target:{closest:()=>({dataset:{runId:String(saved.id)}})}});assert.equal(app.solver.eta0,10);assert.equal(app.selectedRun,saved);
// Exercise the actual SVG renderer with WebGL and projection replaced.
const MathSpace=vm.runInNewContext(read('renderer.mjs')+'\nMathSpace;',{M,document,ResizeObserver:class{observe(){}}});
const camera=new MathSpace(element('#stage'));assert.equal(camera.heightFactor,.23);assert.equal(camera.elevation,25);assert.equal(camera.azimuth,55);
const scene=Object.assign(Object.create(MathSpace.prototype),{bounds:{xmin:-10,xmax:20,ymin:-10,ymax:20,span:30},Z:8,gl:{},meshTheme:'light',meshDirty:false,field:null,elevation:38,width:800,height:600,back:{},front:{},drawGL(){},at(x,y,z=0){return [100+10*x,200-10*y-10*z];}});
const objects=M.initialObjects(),sample={objects,model:M.createModel(objects),solver:{...M.solverDefaults,eta0:2,tolerance:1e-10},p:2,alpha:.4,view:'surfaces',selected:1,x:[8,7],start:[8,7],hover:[5,4],runs:[],selectedRun:null,iteration:0,display:{grid:false,labels:true,contours:false,paths:false,gradient:true,step:true,rays:'none'}};
const draw=()=>{const saved=JSON.stringify(sample);scene.render(sample);assert.equal(JSON.stringify(sample),saved);assert.ok(!/NaN|Infinity/.test(scene.front.innerHTML));assert.ok(!scene.front.innerHTML.includes('data-prox'));return scene.front.innerHTML;};
const stepMarker=svg=>svg.match(/<circle[^>]*data-step-result[^>]*>/)?.[0];
const stepSegment=svg=>svg.match(/<path[^>]*data-step-segment[^>]*>/)?.[0];
let svg=draw();assert.ok(svg.includes('data-probe="hover"'));assert.ok(svg.includes('data-subgradient'));assert.ok(stepMarker(svg));
for(const reduction of [true,false])for(const shape of ['circle','ellipse','rectangle'])for(const view of ['surfaces','levels','landscape']){
  sample.objects=objects.map((o,i)=>({...o,shape,aspect:.5+i,angle:20*i}));sample.solver.reduction=reduction;sample.model=M.createModel(sample.objects,2,64,reduction);sample.view=view;scene.field=view==='landscape'?{low:0,high:50,span:50,N:8}:null;
  sample.hover=[5,4];sample.selectedRun=null;sample.iteration=0;
  const preview=draw(),solver=M.startSolver(sample.model,[5,4],sample.solver);M.iterate(solver);
  const end=scene.at(...solver.x,scene.pointHeight(solver.x,sample));assert.equal(stepMarker(preview),scene.marker(end,5,'svg-probe','data-step-result'));
  sample.selectedRun={solver:{...sample.solver},k:solver.k};sample.x=solver.x;sample.iteration=solver.k;sample.hover=null;
  const actual=draw();sample.hover=[15,-7];assert.equal(stepMarker(draw()),stepMarker(actual));assert.equal(stepSegment(draw()),stepSegment(actual));
  // Historical preview uses its own k rather than the final iteration count.
  sample.x=[5,4];sample.iteration=0;assert.equal(stepSegment(draw()),stepSegment(preview));
}
sample.selectedRun=null;sample.hover=[5,4];sample.view='surfaces';scene.field=null;
for(const eta0 of [0,-1,NaN,1e7]){sample.solver.eta0=eta0;assert.equal(stepMarker(draw()),undefined);}sample.solver.eta0=2;
sample.objects=[objects[0]];sample.model=M.createModel(sample.objects);sample.hover=[0,0];assert.equal(stepMarker(draw()),undefined,'A zero subgradient has no next step');
console.log('Hover, exact step geometry for every shape/reduction/view, historical k, settings/worker handoff, JSON round-trip, legacy scenes and invalid import passed.');
