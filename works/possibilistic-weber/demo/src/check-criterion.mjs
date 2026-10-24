import assert from 'node:assert/strict';
import * as M from './model.mjs';
import * as C from './criterion-model.mjs';
const close=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const s=C.createLesson(),d=3,a=1.2;
// Independent analytic Gaussian moments: integral r = a sqrt(pi/2), integral r² = 2a².
close(s.I,d*d+2*d*a*Math.sqrt(Math.PI/2)+2*a*a);
close(s.D,Math.sqrt(s.I));
close(s.F,M.evaluate(C.lessonPoint,M.createModel(C.lessonObjects,2)).F);
close(s.F,s.terms.reduce((n,t)=>n+t.contribution,0));
assert.equal(s.slices.length,12);
for(const [i,v]of s.slices.entries()){
  close(M.membership(v.r,C.lessonObjects[0]),v.alpha);
  close(M.distance(C.lessonPoint,v.far),v.R);
  close(v.R,3+v.r);close(v.mass,v.R*v.R/12);
  const start=C.packetShape(v,0),end=C.packetShape(v,1);
  close(start.z,8);close(start.h,2.5);close(end.z,8);close(end.h,v.height*1.8);
  close(Math.max(...end.ring.map(p=>p[0]))-Math.min(...end.ring.map(p=>p[0])),8.5);
  close(Math.max(...end.ring.map(p=>p[1]))-Math.min(...end.ring.map(p=>p[1])),37);
  if(i)assert(v.r<s.slices[i-1].r);
}
close(s.approximateI,s.slices.reduce((n,v)=>n+v.mass,0));
assert(s.approximateI<s.I&&Math.abs(s.approximateI/s.I-1)<.03);
assert(Object.isFrozen(s.objects[0])&&Object.isFrozen(s.slices));
assert.throws(()=>s.objects[0].a=99);
const other=M.initialObjects();other[0].a=99;
assert.deepEqual(C.createLesson(),s);
close(C.outputPose(s,0,0).x,15);close(C.outputPose(s,0,0).w,102);
for(let j=0;j<3;j++){
  const end=C.outputPose(s,j,1);
  close(end.x,C.weightStart(s,j));close(end.y,-15);close(end.z,8);close(end.h,8);
  close(end.w,s.terms[j].contribution/s.F*93);
  if(j<2)close(C.weightStart(s,j+1)+s.terms[j+1].contribution/s.F*93,end.x);
  for(const boundary of [.22,.28,.36,.5,.55,.6,.7,.72,.9,.94]){
    const before=C.outputPose(s,j,boundary-1e-7),after=C.outputPose(s,j,boundary+1e-7);
    for(const key of ['x','y','z','w','d','h'])assert(Math.abs(before[key]-after[key])<.001,'Discontinuous output '+key);
  }
}
const dropped={ring:C.packetShape(s.slices[0],0).ring.map(([x,y])=>[x+140,y+10]),z:8,h:2.5};
assert.deepEqual(C.packetShape(s.slices[0],0,dropped),dropped);
const docked=C.packetShape(s.slices[0],1,dropped),normal=C.packetShape(s.slices[0],1);
docked.ring.forEach((p,i)=>p.forEach((v,j)=>close(v,normal.ring[i][j])));close(docked.h,normal.h);
console.log('Fixed lesson, analytic Gaussian integral, Hausdorff endpoints, midpoint areas, weighted sum and immutability passed.');
