import * as k from './vendor/anatomy/iso-kit.mjs';
import * as A from './vendor/anatomy/audit.mjs';
import {createLesson,packetShape,outputPose,weightStart} from './criterion-model.mjs';

// Concept: a sectioning rack feeds a measuring bed, a comb integrator and an adding slide.
// Parts: bed + 4 feet + 4 pads; rack plinth, spine, cap, 12 shelves, 12 sections;
// measurement bed, datum mark, ruler; comb bed, 12 tiles, 12 template teeth, 2 fences,
// ruler and 2 end stops; root press (2 uprights, bridge, die); adding bed, 2 rails,
// 3 weighted gauges, end stop, scale; 4 mounting screws and 3 inspection plates.
export function buildLessonGeometry(){
  const lesson=createLesson(),BASE={x:-275,y:-92,w:580,d:220,r:10};
  const P=k.fitProjection([...k.boxCorners(BASE,-18,0),[-224,-30,156],[300,95,10]],1100,660,{pad:44,azimuth:64,elevation:33});
  const R=A.recorder(P),at=p=>k.iso(p,P),line=(d,tone='lo')=>k.lineSvg(d,{tone});
  const items=[];
  function put(name,shape,paths,{tone='mid',piece='',move=[0,0,0],inner=''}={}){
    const svg=k.solidSvg(paths,{tone,crease:'faint',inner});
    R.put({name,piece,move,at:shape.center??[0,0,0],svg,shapes:[R.solid(shape)]});
  }
  function slab(name,plan,z,h,options={}){
    const screws=options.screws?k.dotsSvg(k.corners(plan,3).map(([x,y])=>at([x,y,z+h])),{size:.65,tone:'hi'}):'';
    put(name,A.slab(plan,z,h,{name}),k.slabOf(plan,z,h,P,5,Math.min(.7,h/4)),{...options,inner:(options.inner??'')+screws});
  }
  function disc(name,x,y,r,z,h,options={}){
    const ring=k.circleRing(x,y,r,64);
    put(name,A.extruded(ring,z,h,{name}),k.extrude(ring,z,h,P),options);
  }
  for(const [i,[x,y]]of k.corners(BASE,24).entries()){
    slab('stand.pad'+i,{x:x-8,y:y-8,w:16,d:16,r:3},-18,3,{tone:'lo'});
    slab('foot'+i,{x:x-6,y:y-6,w:12,d:12,r:2},-15,7,{tone:'lo'});
  }
  slab('bed',BASE,-8,8,{tone:'lo',inner:line(k.planOutline(k.insetPlan(BASE,5),0,P),'faint'),screws:true});
  slab('rack.plinth',{x:-266,y:-82,w:116,d:110,r:5},0,8,{screws:true});
  slab('rack.spine',{x:-221,y:-82,w:12,d:8,r:1},8,140);
  slab('rack.cap',{x:-224,y:-79,w:18,d:18,r:2},148,4,{screws:true});
  for(const s of lesson.slices){
    const z=13+s.alpha*124;
    slab('shelf'+s.k,{x:-220,y:-74,w:10,d:49+s.r*9,r:1},z-2,2,{tone:'lo'});
    // The mathematical sections are thin filled solids, carried by rack shelves.
    disc('slice'+s.k,-215,-25,s.r*15,z,2.5,{tone:'hi',piece:'slice'+s.k,move:[0,24,0]});
  }
  slab('measure.bed',{x:-132,y:-76,w:126,d:139,r:5},0,8,{screws:true});
  slab('measure.rule',{x:-121,y:49,w:102,d:6,r:.6},8,.7,{tone:'lo',
    inner:line(k.topTicks(-119,-21,3,5,49,8.7,[2,4],P).minor,'faint')+line(k.topTicks(-119,-21,3,5,49,8.7,[2,4],P).major,'mid')});
  // Twelve alternative sections share this seat. Only the selected one is shown.
  // They are audited individually below rather than as overlapping physical parts.
  const seats=lesson.slices.map(s=>{
    const ring=k.circleRing(-68,-6,s.r*15,64);
    const far=[-68-s.r*15,-6,11],pin=[-23,-6,11];
    return k.solidSvg(k.extrude(ring,8,2.5,P),{tone:'hi'})+
      line(k.segment(far,pin,P),'lit')+
      k.dotsSvg([at(far),at(pin)],{size:2.1,tone:'hi'});
  });
  slab('comb.bed',{x:9,y:-38,w:116,d:80,r:4},0,8,{screws:true});
  for(const y of[-30,20])slab('comb.fence'+y,{x:15,y,w:102,d:3,r:.5},8,3,{tone:'lo'});
  for(const s of lesson.slices){
    const plan={x:15+s.k*8.5,y:-20,w:8.5,d:37,r:0};
    const name='bin'+s.k;
    slab(name,plan,8,s.height*1.8,{tone:'hi',piece:name});
    slab('template'+s.k,{x:plan.x,y:-27,w:8.5,d:4,r:0},8,s.height*1.8,{tone:'lo'});
  }
  slab('comb.rule',{x:15,y:27,w:102,d:6,r:.5},8,.7,{tone:'lo',
    inner:line(k.topTicks(15,117,8.5,3,27,8.7,[2,4],P).minor,'faint')+line(k.topTicks(15,117,8.5,3,27,8.7,[2,4],P).major,'mid')});
  for(const x of[9,121])slab('comb.stop'+x,{x,y:-28,w:4,d:52,r:1},8,5);
  slab('press.bed',{x:137,y:-40,w:37,d:82,r:3},0,8,{screws:true});
  for(const y of[-32,24])slab('press.upright'+y,{x:146,y,w:16,d:8,r:1},8,61);
  slab('press.bridge',{x:143,y:-32,w:22,d:64,r:2},69,7,{screws:true});
  slab('press.die',{x:148,y:-24,w:12,d:48,r:1},57,12,{tone:'hi'});
  slab('sum.bed',{x:180,y:-38,w:110,d:80,r:4},0,8,{screws:true});
  slab('sum.stock',{x:184,y:52,w:108,d:47,r:3},0,4,{screws:true});
  for(const y of[-18,20])slab('sum.rail'+y,{x:187,y,w:93,d:3,r:.5},8,4,{tone:'lo'});
  lesson.terms.forEach((t,j)=>{
    const w=t.contribution/lesson.F*93;
    slab('weight'+j,{x:weightStart(lesson,j),y:-15,w,d:35,r:0},8,8,{tone:j===0?'hi':'mid',piece:'weight'+j});
  });
  slab('sum.stop',{x:280,y:-18,w:4,d:41,r:1},8,13);
  slab('sum.rule',{x:187,y:28,w:96,d:6,r:.5},8,.7,{tone:'lo',
    inner:line(k.topTicks(187,283,4,6,28,8.7,[2,4],P).minor,'faint')+line(k.topTicks(187,283,4,6,28,8.7,[2,4],P).major,'mid')});
  for(const [j,x]of[-255,-120,12].entries()){
    const plan={x,y:92,w:68,d:18,r:1};
    slab('inspection'+j,plan,0,.8,{tone:'lo',inner:
      line(k.planOutline(k.insetPlan(plan,2),.8,P),'faint')+
      [0,1,2].map(i=>k.lineSvg(k.lineOnTop([x+6,97+i*3],[x+57-i*7,97+i*3],.8,P),{tone:'lo',free:true})).join('')});
  }
  // Solve real screen overlaps. The same order is used by the shipped SVG.
  A.settle(R,P,{states:[0,.5,1]});
  A.auditOrExit(R,P,{frames:[0,.25,.5,.75,1]});
  if(process.argv.includes('--audit')){
    let collisions=0;
    for(const s of lesson.slices)for(let step=0;step<=40;step++){
      const pose=packetShape(s,step/40),packet=A.extruded(pose.ring,pose.z,pose.h,{name:'packet'});
      const statics=R.solids.filter(shape=>shape.name!=='bin'+s.k);
      const bad=A.solidClearances([...statics,packet]);
      if(bad.length){collisions+=bad.length;console.error('packet α',s.alpha,'t',step/40,bad.slice(0,2));}
    }
    console.log('Packet transfer: '+collisions+' collisions across 492 poses');
    const fixed=R.solids.filter(s=>!s.name.startsWith('weight')&&!/^bin\d+$/.test(s.name));
    for(let j=0;j<3;j++)for(let step=0;step<=40;step++){
      const t=step/40,pose=outputPose(lesson,j,t),moving=[];
      if(j===0&&t<.28)lesson.slices.forEach((s,k)=>moving.push(A.slab({x:pose.x+k*pose.w/12,y:pose.y,w:pose.w/12,d:pose.d,r:0},pose.z,s.height*1.8*(1-pose.merge)+8*pose.merge,{name:'output'+k})));
      else moving.push(A.slab({...pose,r:0},pose.z,8,{name:'output'}));
      for(let k=0;k<3;k++)if(k!==j&&(k>0||j>0)){
        const held=outputPose(lesson,k,k<j?1:0);
        moving.push(A.slab({...held,r:0},held.z,8,{name:'held'+k}));
      }
      const bad=A.solidClearances([...fixed,...moving]);
      if(bad.length){collisions+=bad.length;console.error('output',j,'t',t,bad.slice(0,2));}
    }
    console.log('Integral → sum: checked 123 poses; total collisions '+collisions);
    if(collisions)process.exitCode=1;
  }
  for(const item of R.items.sort((a,b)=>a.key-b.key)){
    let attrs='';
    if(item.piece.startsWith('slice')){const k=Number(item.piece.slice(5));attrs=' class="lesson-layer" data-slice="'+k+'" role="button" tabindex="-1" aria-label="α = '+lesson.slices[k].alpha.toFixed(3)+'"';}
    if(item.piece.startsWith('bin'))attrs=' data-bin="'+item.piece.slice(3)+'"';
    if(item.piece.startsWith('weight'))attrs=' data-weight="'+item.piece.slice(6)+'"';
    if(item.name.startsWith('comb.')||item.name.startsWith('template')||item.piece.startsWith('bin'))attrs+=' data-integrator';
    const hitPath=item.piece.startsWith('slice')?item.svg.match(/class="iso-fill" d="([^"]+)"/)[1]:null;
    const hit=hitPath?'<path class="lesson-hit" fill="transparent" d="'+hitPath+'"/><path class="lesson-hit" data-moving-hit fill="transparent" d="'+hitPath+'"/>':'';
    if(item.name==='press.upright24')items.push('<g data-output-back></g>');
    items.push('<g data-item="'+item.name+'"'+attrs+'>'+item.svg+hit+'</g>');
  }
  // The section and its measurement are drawn after their supporting bed.
  const seatIndex=items.findIndex(s=>s.includes('data-item="comb.bed"'));
  items.splice(seatIndex,0,'<g data-seat role="button" tabindex="-1" aria-label="Нажмите на измеренный срез или перетащите его в интегратор">'+seats.map((svg,i)=>'<g data-seat-slice="'+i+'" style="display:none">'+svg+'</g>').join('')+'</g>');
  const crown=lesson.slices.map(s=>at([19.25+s.k*8.5,-23,8+s.height*1.8]));
  const curve=line(k.pathOf(crown),'lo')+k.dotsSvg([crown[0],crown.at(-1)],{size:1,tone:'mid'});
  return {P,svg:'<path class="iso-halo" d="'+k.haloOf(BASE,-18,12,P)+'"/>'+items.join('')+'<g data-crown>'+curve+'</g><g data-output-front></g><g data-packet visibility="hidden"></g>',parts:R.items.length};
}
