import assert from 'node:assert/strict';
import * as M from './model.mjs';
import {readFileSync} from 'node:fs';
const close=(a,b,t=1e-8)=>assert(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const base={id:1,x:1,y:-2,a:2,b:1,type:'gaussian',core:.35,q:5,shape:'ellipse',aspect:2.7,angle:31};
for(const shape of ['ellipse','rectangle'])for(const alpha of [.01,.3,1])for(const x of [[1,-2],[8,3],[-1,-8]]){
 const o={...base,shape},g=M.cutGeometry(o,x,alpha);close(M.distance(x,g.far),g.R);close(M.distance(x,g.near),g.hXA);assert(Number.isNaN(g.d)&&Number.isNaN(g.r));
 for(let i=0;i<4096;i++)assert(M.distance(x,M.cutPoint(alpha,o,i/4096*2*Math.PI))<=g.R+1e-8);
 close(M.gauge(g.far,o),M.radius(alpha,o));
}
for(const shape of ['ellipse','rectangle'])for(const type of Object.keys(M.profiles))for(const p of [1,1.5,2,4]){
 const o={...base,type,shape},model=M.createModel([o],p),x=[4.1,3.2],v=M.evaluate(x,model);assert(Number.isFinite(v.F));assert(v.norm<=1+1e-9);
 for(const y of [[0,0],[10,-3],[4.10001,3.2]]){const w=M.evaluate(y,model);assert(w.F>=v.F+v.g.reduce((s,g,i)=>s+g*(y[i]-x[i]),0)-1e-8);}
 for(let i=0;i<2;i++){const a=[...x],b=[...x];a[i]+=1e-4;b[i]-=1e-4;close((M.evaluate(a,model).F-M.evaluate(b,model).F)/2e-4,v.g[i],2e-6);}
}
for(const p of [1,2,3.7,64]){const sphere=M.createModel([{...base,shape:'circle'}],p),ellipse=M.createModel([{...base,aspect:1}],p);close(M.evaluate([8,4],sphere).F,M.evaluate([8,4],ellipse).F,2e-8);}
const hard=M.cutGeometry({...base,angle:0,aspect:3},[1.5,-2],.5);assert(hard.nonunique);
const scenes=[[{...base,shape:'rectangle'}],[{...base},{...base,id:2,x:8,y:1,shape:'rectangle',type:'triangle',angle:-20,aspect:.4},{...base,id:3,x:-3,y:6,shape:'circle',type:'triangle'}]];
for(const objects of scenes)for(const p of [1,2,2.5]){const model=M.createModel(objects,p);for(const start of [[8,7],[-6,-5]]){const s=M.solve(model,start,{maxIterations:2000});assert(s.done);assert(s.best.F<s.trace[0].F);assert(s.value.gap<=s.settings.tolerance||s.reason.includes('точность не достигнута'));}}
const bell=M.createModel([{...base,type:'bell',q:2.001}],2);assert(Number.isFinite(M.evaluate([2,3],bell).F));
assert(M.createModel([{...base,type:'bell',q:2}],2).problem);assert(M.createModel([base],Infinity).problem);
const inf=M.createModel([{...base,type:'triangle'}],Infinity);close(M.evaluate([8,4],inf).F,M.cutGeometry({...base,type:'triangle'},[8,4],1e-15).R);
assert.throws(()=>M.createModel([{...base,aspect:0}],2));
console.log('Nonradial geometry, subgradients, spherical limit, solver, tails and validation passed.');

let maxReferenceError=0;
for(const r of JSON.parse(readFileSync(new URL('./nonradial-reference.json',import.meta.url),'utf8'))){const p=r.p==='Infinity'?Infinity:r.p,v=M.evaluate(r.x,M.createModel([r.o],p));maxReferenceError=Math.max(maxReferenceError,Math.abs(v.F/r.D-1));close(v.F,r.D,1e-8);}
for(const q of [1.01,2.001,5,64])for(const p of [1,Math.min(q-.00001,2)]){const o={...base,type:'bell',q,aspect:3},D=M.evaluate([o.x,o.y],M.createModel([o],p)).F;close(D,3*M.moment(o,p)**(1/p),1e-10);}
const mix=M.initialObjects().map((o,i)=>({...o,shape:i?'rectangle':'ellipse',aspect:1.5+i,angle:i*17}));const mixedModel=M.createModel(mix,2);const mixedResult=M.evaluate([8,7],mixedModel,true);close(mixedResult.F,mixedResult.terms.reduce((s,t)=>s+t.contribution,0));assert(mixedModel.objects.every(o=>Number.isNaN(o.m)&&Number.isNaN(o.s2)));
console.log('Independent SciPy max relative D error',maxReferenceError,'and mixed-model checks passed.');

for(const p of [1,2,4,Infinity]){const objects=M.initialObjects().map((o,i)=>({...o,shape:i%2?'rectangle':'ellipse',aspect:.4+i,angle:13+i*24})),model=M.createModel(objects,p),s=M.solve(model,[15,-8],{maxIterations:1000});assert(s.best.F<s.trace[0].F);const t=23*Math.PI/180,rot=v=>[v[0]*Math.cos(t)-v[1]*Math.sin(t),v[0]*Math.sin(t)+v[1]*Math.cos(t)],changed=objects.map(o=>{const c=rot([o.x,o.y]);return {...o,x:c[0],y:c[1],angle:o.angle+23};});close(M.evaluate([8,7],model).F,M.evaluate(rot([8,7]),M.createModel(changed,p)).F,1e-10);}
const p1scene=scenes[1],p1a=M.solve(M.createModel(p1scene,1),[8,7],{maxIterations:2000}),p1b=M.solve(M.createModel(p1scene.map((o,i)=>i?o:{...o,a:6}),1),[8,7],{maxIterations:2000});assert(M.distance(p1a.x,p1b.x)>.01);console.log('Rotation, bounded p=infinity and nonradial p=1 uncertainty sensitivity passed.');

for(const shape of ['ellipse','rectangle'])for(const p of [1,2,64,Infinity]){const o={...base,shape,a:0},model=M.createModel([o],p);close(M.evaluate([4,2],model).F,5);close(M.evaluate([o.x,o.y],model).F,0);assert(Number.isNaN(M.cutGeometry(o,[4,2],.5).r));}
assert.throws(()=>M.radial(2,M.createModel([base],2).objects[0],2));

for(const r of JSON.parse(readFileSync(new URL('./nonradial-optima.json',import.meta.url),'utf8'))){const model=M.createModel(r.objects,r.p);close(M.evaluate(r.x,model).F,r.F,2e-8);for(const start of [[8,7],[-6,-5]]){const s=M.solve(model,start,{maxIterations:2000});assert(s.best.F>=r.F-2e-8);assert(s.best.F-r.F<.01);assert(s.value.gap>=s.value.F-r.F-2e-8,'Subgradient bound must cover the error to the independent optimum');}}
console.log('Six independent SciPy minima, subgradient error bounds and finite-run progress passed.');

const axisCase={...base,x:0,y:0,a:1,type:'ball',aspect:3,angle:0};for(const tiny of [0,1e-6,1e-12,1e-16,1e-20,1e-30]){const v=M.cutGeometry(axisCase,[.5,tiny],.5);close(M.gauge(v.far,axisCase),1,1e-12);close(v.R,Math.sqrt(9+9*.5**2/8),1e-6);}
console.log('Near-axis farthest-point boundary residuals passed down to 1e-30.');
