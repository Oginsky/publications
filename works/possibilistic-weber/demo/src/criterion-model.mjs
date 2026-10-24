import * as M from './model.mjs';

// This immutable example never reads the workspace scene.
export const lessonPoint=Object.freeze([3,0]);
export const lessonObjects=Object.freeze([
  {id:1,x:0,y:0,a:1.2,b:1,type:'gaussian'},
  {id:2,x:6,y:2,a:.8,b:.7,type:'gaussian'},
  {id:3,x:1,y:4,a:1,b:1.2,type:'gaussian'}
].map(o=>Object.freeze({...o,shape:'circle',core:.35,q:4})));
export const sliceCount=12;
export const transferSeconds=.7;
export const outputSeconds=6;

export function createLesson(){
  const model=M.createModel(lessonObjects,2),result=M.evaluate(lessonPoint,model,true),o=model.objects[0];
  const slices=Array.from({length:sliceCount},(_,k)=>{
    const alpha=(k+.5)/sliceCount,s=M.cutGeometry(o,lessonPoint,alpha);
    return Object.freeze({k,alpha,r:s.r,R:s.R,far:Object.freeze(s.far),near:s.hXA,height:s.R**2,mass:s.R**2/sliceCount});
  });
  const I=result.terms[0].D**2,approximateI=slices.reduce((s,v)=>s+v.mass,0);
  return Object.freeze({x:lessonPoint,objects:lessonObjects,p:2,slices:Object.freeze(slices),terms:Object.freeze(result.terms.map(Object.freeze)),I,D:result.terms[0].D,F:result.F,approximateI,approximateD:Math.sqrt(approximateI)});
}

// Shared by the SVG morph and its collision checks.
export function packetShape(s,t,from){
  const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>v*v*(3-2*v);
  if(from){
    const end=packetShape(s,1),u=ease(clamp(t));
    return {ring:from.ring.map((p,i)=>p.map((v,j)=>v+(end.ring[i][j]-v)*u)),z:from.z+(end.z-from.z)*u,h:from.h+(end.h-from.h)*u};
  }
  const rise=ease(clamp(t/.26)),travel=ease(clamp((t-.26)/.48)),land=ease(clamp((t-.74)/.26));
  const morph=ease(clamp((t-.43)/.43)),cx=-68+(19.25+s.k*8.5+68)*travel,cy=-6+4.5*travel;
  const z=8+144*rise-144*land,h=2.5+(s.height*1.8-2.5)*morph;
  const ring=Array.from({length:64},(_,i)=>{
    const a=i/64*Math.PI*2,c=Math.cos(a),v=Math.sin(a),den=Math.max(Math.abs(c),Math.abs(v));
    return[cx+s.r*15*c*(1-morph)+4.25*c/den*morph,cy+s.r*15*v*(1-morph)+18.5*v/den*morph];
  });
  return {ring,z,h};
}

export function weightStart(lesson,j){
  return 187+lesson.terms.slice(j+1).reduce((sum,t)=>sum+t.contribution,0)/lesson.F*93;
}

// One continuous route: compact the integral, pass through the press, dock at the stop.
export function outputPose(lesson,j,t){
  const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  const term=lesson.terms[j],w=term.contribution/lesson.F*93,goal=weightStart(lesson,j);
  if(j===0){
    const merge=ease(t/.28),enter=ease((t-.28)/.27),leave=ease((t-.6)/.4);
    const width=102+(w-102)*merge,cx=66+88*enter+(goal+w/2-154)*leave;
    return {x:cx-width/2,y:-20+5*merge,w:width,d:37-2*merge,z:8+8*ease((t-.28)/.08)-8*ease((t-.9)/.1),h:8,merge};
  }
  const stock=j===1?190:238,up=ease(t/.22),across=ease((t-.22)/.28),down=ease((t-.5)/.22),out=ease((t-.72)/.28);
  return {x:stock+(105-w/2-stock)*across+(goal-105+w/2)*out,y:58-73*across,w,d:35,z:4+86*up-74*down-8*ease((t-.94)/.06),h:8,merge:1};
}

