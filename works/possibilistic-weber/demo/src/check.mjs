import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as M from './model.mjs';
const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}; tol=${t}`);
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const compact=M.initialObjects();
let maxD=0,maxDer=0;
for(const r of read('./reference.json')){
  const o={id:1,x:0,y:0,a:r.a,b:1,type:r.kind,core:r.core,q:r.q},model=M.createModel([o],r.p,96),v=M.radial(r.d,model.objects[0],r.p);
  maxD=Math.max(maxD,Math.abs(v.D/r.D-1));maxDer=Math.max(maxDer,Math.abs(v.derivative-r.derivative));
  close(v.D,r.D,Math.max(2e-8,r.D*2e-8));close(v.derivative,r.derivative,3e-8);
}
console.log('Independent radial references:',{maxD,maxDer});
for(const [kind,width,point,F]of [['triangle',2,[4.016671922,2.269336104],19.9195189601],['triangle',6,[3.956424723,2.283390374],22.2684024242],['gaussian',2,[4.007942148,2.248175892],24.6066672080]]){
  const objects=compact.map((o,j)=>({...o,type:kind,a:j===1?width:o.a})),model=M.createModel(objects,2),s=M.solve(model,[8,7],{tolerance:1e-9});
  assert.equal(s.reason,'Достигнута точность');close(M.distance(s.x,point),0,2e-8);close(s.value.F,F,1e-9);
}
// The common quadrature route must agree with reduction, including centers and tails.
for(const type of Object.keys(M.profiles))for(const p of [1,1.5,2,4,64,Infinity]){
  const o={...compact[0],type,q:p===64?64:Math.max(5,p===Infinity?5:p+1),angle:73,aspect:3};
  if(M.issue([o],p))continue;
  const reduced=M.createModel([o],p,96,true),general=M.createModel([o],p,96,false);
  assert(general.objects[0].nodes.length||p===Infinity);
  for(const x of [[0,0],[3.2,-1.7]]){
    const a=M.evaluate(x,reduced),b=M.evaluate(x,general);
    close(a.F,b.F,5e-8*Math.max(1,a.F));close(M.distance(a.g,b.g),0,2e-8);
    for(const y of [[1,2],[-3,-1]])assert(M.evaluate(y,general).F>=b.F+b.g.reduce((s,v,i)=>s+v*(y[i]-x[i]),0)-1e-8);
  }
}
for(const reduction of [true,false])for(const shape of ['circle','ellipse','rectangle'])for(const p of [1,2,2.5,Infinity]){
  const objects=compact.map((o,i)=>({...o,shape,aspect:.5+i,angle:17*i})),model=M.createModel(objects,p,64,reduction),s=M.startSolver(model,[8,7],{eta0:2,reduction,tolerance:1e-10,maxIterations:7});
  for(let k=0;k<7;k++){
    const x=[...s.x],g=M.evaluate(x,model).g;M.iterate(s);assert.equal(s.k,k+1);
    for(let i=0;i<2;i++)close(s.x[i],x[i]-2*g[i]/(k+1),1e-12);
  }
  assert(s.done&&s.reason.includes('Лимит'));assert.equal(s.trace.length,8);assert.equal(s.trace.at(-1).k,7);
  close(s.best.F,Math.min(...s.trace.map(t=>t.F)),1e-12);assert.deepEqual(s.best.x,s.trace[s.best.k].x);
  assert(!('z'in s)&&!('cuts'in s)&&!('center'in s));
}
const noShortcut=M.startSolver(M.createModel(compact.map((o,i)=>({...o,b:i?1:4})),2),[0,0],{eta0:1,maxIterations:1});
assert(noShortcut.value.norm>0,'A zero contribution at its own center must not silently invoke section 6');
const centerStart=[...noShortcut.x],centerGradient=[...noShortcut.value.g];M.iterate(noShortcut);
assert.deepEqual(noShortcut.x,centerStart.map((v,i)=>v-centerGradient[i]));
const symmetric=M.startSolver(M.createModel([compact[0]],2),[0,0]);assert(symmetric.done&&symmetric.k===0&&symmetric.value.norm===0);
const switched=M.startSolver(M.createModel(compact,2),[8,7],{reduction:false});assert(!switched.model.reduction&&switched.model.objects.every(o=>!o.reduced));
assert.equal(typeof M.prox,'undefined');assert.deepEqual(Object.keys(M.algorithms),['subgradient']);
for(const invalid of [{algorithm:'douglas-rachford'},{algorithm:'cutting-plane'},{reduction:0},{eta0:0},{eta0:Infinity},{eta0:NaN},{maxIterations:1.5},{maxIterations:0},{tolerance:0},null,3])assert.throws(()=>M.solverOptions(invalid));
assert.throws(()=>M.startSolver(M.createModel(compact),[NaN,0]));assert.throws(()=>M.startSolver(M.createModel(compact),[1e7,0]));
assert.throws(()=>M.createModel(compact,2,64,'false'));
for(const type of Object.keys(M.profiles)){const o={...compact[0],type,q:5};for(const alpha of [.001,.15,.5,.9,1])close(M.membership(M.radius(alpha,o),o),type==='ball'?1:alpha,1e-11);}
assert(M.createModel([{...compact[0],type:'gaussian'}],Infinity).problem);assert(M.createModel([{...compact[0],type:'bell',q:2}],2).problem);
assert(!M.createModel([{...compact[0],type:'bell',q:2}],1.99).problem);
assert.throws(()=>M.createModel([],2));assert.throws(()=>M.createModel(compact,.5));assert.throws(()=>M.createModel([{...compact[0],b:0}],2));
const sensitivity=read('./sensitivity-reference.json');
for(const r of sensitivity){const objects=M.initialObjects();objects[1].a=r.a2;const v=M.evaluate(r.x,M.createModel(objects,r.p));close(v.F,r.F,1e-8);assert(v.norm<1e-7);}
const at=(p,a)=>sensitivity.find(r=>r.p===p&&r.a2===a).x;
close(M.distance(at(1,2),at(1,6)),0,1e-10);assert(M.distance(at(2,2),at(2,6))>.06);assert(M.distance(at(2,6),at(4,6))>.09);
for(const r of read('./sensitivity-mixed.json')){const objects=M.mixedObjects();if(r.changed!==null)objects[r.changed-1].a=10;const v=M.evaluate(r.x,M.createModel(objects,r.p));assert(v.norm<1e-7);}
for(const p of [1.5,2,3,4]){
  const two=compact.slice(0,2).map((o,i)=>({...o,a:i?3:1,b:1})),model=M.createModel(two,p),v=M.evaluate([2.5,0],model);
  assert(v.norm<1e-12);const s=M.solve(model,[8,7],{maxIterations:2000,tolerance:1e-10});
  assert(s.best.F>=v.F-1e-10&&s.best.F<s.trace[0].F);assert(s.value.gap>=s.value.F-v.F-1e-10);
  assert(s.value.gap<=s.settings.tolerance||s.reason.includes('точность не достигнута'));
}
const reduced=M.solve(M.createModel(compact),[8,7]),general=M.solve(M.createModel(compact,2,64,false),[8,7]);
assert.equal(reduced.k,general.k);close(M.distance(reduced.x,general.x),0,1e-11);
console.log('Harmonic steps for all shapes/p, reduction switch, section-3 center handling, stopping, validation and independent optima passed.');
