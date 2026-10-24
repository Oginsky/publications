class CriterionFigure{
  constructor(svg,lesson){
    this.svg=svg;this.P=CRITERION_GEOMETRY.P;
    svg.querySelector('#criterion-machine').innerHTML=CRITERION_GEOMETRY.svg;
    this.layers=[...svg.querySelectorAll('[data-slice]')].sort((a,b)=>a.dataset.slice-b.dataset.slice);
    this.seats=[...svg.querySelectorAll('[data-seat-slice]')].sort((a,b)=>a.dataset.seatSlice-b.dataset.seatSlice);
    this.bins=[...svg.querySelectorAll('[data-bin]')].sort((a,b)=>a.dataset.bin-b.dataset.bin);
    this.weights=[...svg.querySelectorAll('[data-weight]')].sort((a,b)=>a.dataset.weight-b.dataset.weight);
    this.front=svg.querySelector('[data-output-front]');this.back=svg.querySelector('[data-output-back]');
    this.packet=svg.querySelector('[data-packet]');
    this.pulls=Array(12).fill(0);this.outputTime=0;this.lastStage=-1;
    this.packet.innerHTML=solidSvg(extrude(circleRing(-68,-6,10,64),8,2.5,this.P),{tone:'lit'});
    this.compaction=document.createElementNS('http://www.w3.org/2000/svg','g');
    this.compaction.setAttribute('data-compaction','');
    this.compaction.innerHTML=lesson.slices.map(s=>solidSvg(slabOf({x:15+s.k*8.5,y:-20,w:8.5,d:37,r:0},8,s.height*1.8,this.P,5,.7),{tone:'hi'})).join('');
    this.front.append(this.compaction,...this.weights);
    this.tiles=[...this.compaction.children];
  }
  writeSolid(g,paths){
    g.querySelector('.iso-fill').setAttribute('d',paths.fill);
    g.querySelector('.iso-top').setAttribute('d',paths.top);
    g.querySelectorAll('.iso-shade').forEach(p=>p.setAttribute('d',paths.shades[Number(p.dataset.shade)]||''));
    g.querySelector('.iso-edge').setAttribute('d',paths.outline);
    g.querySelector('.iso-crease')?.setAttribute('d',paths.crease||'');
    g.querySelector('.iso-bevel')?.setAttribute('d',paths.bevel||'');
  }
  draw(lesson,selected,collected,stage,dt,calm,flight,drag){
    this.layers.forEach((g,i)=>{
      const want=i===selected?1:0;
      this.pulls[i]=calm?want:this.pulls[i]+(want-this.pulls[i])*(1-Math.exp(-dt/.18));
      if(Math.abs(want-this.pulls[i])<.001)this.pulls[i]=want;
      const solid=g.querySelector('.iso-solid');
      solid.setAttribute('transform',translateAlong(this.P,[0,24*this.pulls[i],0]));
      g.querySelector('[data-moving-hit]').setAttribute('transform',solid.getAttribute('transform'));
      solid.toggleAttribute('data-lit',i===selected);
      g.setAttribute('aria-pressed',String(i===selected));
    });
    this.seats.forEach((g,i)=>g.style.display=i===selected&&!flight?'':'none');
    this.bins.forEach((g,i)=>{
      g.style.display=stage!==3&&collected.has(i)?'':'none';
      g.querySelector('.iso-solid').toggleAttribute('data-lit',i===selected);
    });
    if(stage!==this.lastStage){this.outputTime=0;this.lastStage=stage;}
    if(stage===3)this.outputTime=calm?C.outputSeconds:Math.min(C.outputSeconds,this.outputTime+dt);
    const packing=stage===3&&this.outputTime<.84;
    this.compaction.style.display=packing?'':'none';
    if(packing){
      const pose=C.outputPose(lesson,0,this.outputTime/3);
      this.tiles.forEach((g,i)=>{
        const h=lesson.slices[i].height*1.8*(1-pose.merge)+8*pose.merge;
        this.writeSolid(g,slabOf({x:pose.x+i*pose.w/12,y:pose.y,w:pose.w/12,d:pose.d,r:0},pose.z,h,this.P,5,.7));
      });
    }
    const order=[];
    this.weights.forEach((g,j)=>{
      const start=j===0?0:j===1?3:4.5,duration=j===0?3:1.5;
      const t=stage===3?Math.max(0,Math.min(1,(this.outputTime-start)/duration)):0;
      const pose=C.outputPose(lesson,j,t);
      g.style.display=j===0&&(stage!==3||packing)?'none':'';
      g.setAttribute('transform',translateAlong(this.P,[pose.x-C.weightStart(lesson,j),pose.y+15,pose.z-8]));
      // The near upright covers a piece passing through the press opening.
      const parent=pose.x<180&&pose.x+pose.w>140&&pose.z<57?this.back:this.front;
      if(g.parentNode!==parent)parent.append(g);
      order.push({g,depth:depthOf([pose.x+pose.w/2,pose.y+pose.d/2,pose.z+4],this.P)});
      const active=stage===3&&(this.outputTime>=start&&this.outputTime<start+duration||this.outputTime===C.outputSeconds&&j===0);
      g.querySelector('.iso-solid').toggleAttribute('data-lit',active);
      g.querySelector('.iso-edge').dataset.tone=stage===3&&this.outputTime>=start?'hi':'lo';
    });
    for(const parent of [this.front,this.back]){
      const wanted=order.filter(v=>v.g.parentNode===parent).sort((a,b)=>a.depth-b.depth).map(v=>v.g);
      const current=[...parent.children].filter(g=>g.hasAttribute('data-weight'));
      if(wanted.some((g,i)=>g!==current[i]))parent.append(...wanted);
    }
    this.svg.dataset.stage=stage;
    this.packet.setAttribute('visibility',flight||drag?.active?'visible':'hidden');
    this.packet.removeAttribute('transform');
    if(drag?.active){
      const paths=C.packetShape(lesson.slices[selected],0);
      this.writeSolid(this.packet,extrude(paths.ring,paths.z,paths.h,this.P));
      drag.at=drag.at.map((v,i)=>calm?drag.offset[i]:v+(drag.offset[i]-v)*(1-Math.exp(-dt/.07)));
      this.packet.setAttribute('transform','translate('+drag.at.join(' ')+')');
    }else if(flight){
      const {ring,z,h}=C.packetShape(lesson.slices[selected],flight.t,flight.from);
      this.writeSolid(this.packet,extrude(ring,z,h,this.P));
    }
    return this.pulls.some((v,i)=>Math.abs(v-(i===selected?1:0))>.001)||(stage===3&&!calm&&this.outputTime<C.outputSeconds)||Boolean(drag?.active);
  }
  point(clientX,clientY){
    return new DOMPoint(clientX,clientY).matrixTransform(this.svg.getScreenCTM().inverse());
  }
}
