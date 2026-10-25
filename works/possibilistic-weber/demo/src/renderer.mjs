const rgb=hex=>hex.match(/[a-f0-9]{2}/gi).map(s=>parseInt(s,16)/255);
const colorFor=o=>M.palette[(o.id-1)%M.palette.length];
const fieldColors=()=>document.body.dataset.theme==='dark'?['#25444c','#8cd3c9']:['#d9eeea','#176f7b'];
const polyline=pts=>pts.map((v,i)=>(i?'L':'M')+v.map(n=>n.toFixed(2)).join(' ')).join('');
const niceStep=span=>{const p=10**Math.floor(Math.log10(Math.max(span/8,1e-9))),n=span/8/p;return (n<2?1:n<5?2:5)*p;};
class MathSpace{
  constructor(stage){
    this.stage=stage;this.back=document.querySelector('#space-back');this.front=document.querySelector('#space-front');this.canvas=document.querySelector('#space-canvas');
    this.azimuth=55;this.elevation=25;this.heightFactor=.23;this.width=800;this.height=500;this.P={origin:[400,260],scale:25,azimuth:55,elevation:25};this.view='surfaces';this.meshDirty=true;this.field=null;this.last=null;
    try{this.initGL();}catch(error){this.gl=null;document.querySelector('#renderer-label').textContent='Поверхности недоступны';this.canvas.hidden=true;}
    new ResizeObserver(()=>{
      const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;
      const pivot=this.bounds?this.floor(this.width/2,this.height/2):null,oldSize=Math.min(this.width,this.height);
      this.width=r.width;this.height=r.height;this.back.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);this.front.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);this.back.setAttribute('width',r.width);this.front.setAttribute('width',r.width);
      if(this.last){
        if(pivot&&this.measured){this.P.scale*=Math.min(r.width,r.height)/oldSize;const p=this.at(...pivot);this.P.origin=this.P.origin.map((v,i)=>v+[r.width/2,r.height/2][i]-p[i]);}
        else this.fit(this.last.objects);
        this.measured=true;
        this.render(this.last);
      }
    }).observe(stage);
  }
  initGL(){
    const gl=this.canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL unavailable');this.gl=gl;
    const vs=`attribute vec3 aPos;attribute vec3 aNormal;attribute vec3 aColor;attribute float aLevel;uniform mat4 uProjection;varying vec3 vNormal;varying vec3 vColor;varying float vLevel;void main(){gl_Position=uProjection*vec4(aPos,1.);vNormal=aNormal;vColor=aColor;vLevel=aLevel;}`;
    const fs=`precision highp float;varying vec3 vNormal;varying vec3 vColor;varying float vLevel;uniform float uDark;uniform float uField;void main(){vec3 paper=mix(vec3(.973,.984,.988),vec3(.09,.133,.18),uDark);float light=max(dot(normalize(vNormal),normalize(vec3(-.5,-.7,1.5))),0.);vec3 ink=mix(paper,vColor,mix(.61,.76,uDark));vec3 shaded=mix(ink*mix(.76,.68,uDark),ink,smoothstep(.05,.98,light));if(uField>.5)shaded=mix(paper,vColor,.64)*( .79+.21*light);float alpha=uField>.5?1.:smoothstep(.005,.028,vLevel);if(alpha<.005)discard;gl_FragColor=vec4(shaded,alpha);}`;
    const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);this.program=program;this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    for(const [name,size,offset]of [['aPos',3,0],['aNormal',3,12],['aColor',3,24],['aLevel',1,36]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,40,offset);}
    this.uProjection=gl.getUniformLocation(program,'uProjection');this.uDark=gl.getUniformLocation(program,'uDark');this.uField=gl.getUniformLocation(program,'uField');gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.gl=null;this.canvas.hidden=true;document.querySelector('#renderer-label').textContent='Поверхности недоступны';if(this.last)this.render(this.last);});
  }
  domain(objects){
    let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
    for(const o of objects){const r=Math.max(M.cutExtent(.2,o),M.cutExtent(1,o),.5);xmin=Math.min(xmin,o.x-r);xmax=Math.max(xmax,o.x+r);ymin=Math.min(ymin,o.y-r);ymax=Math.max(ymax,o.y+r);}
    let span=Math.max(xmax-xmin,ymax-ymin,4),pad=span*.12;
    return {xmin:xmin-pad,xmax:xmax+pad,ymin:ymin-pad,ymax:ymax+pad,span};
  }
  fit(objects,extra=[]){
    this.bounds=this.domain(objects);for(const p of extra){this.bounds.xmin=Math.min(this.bounds.xmin,p[0]);this.bounds.xmax=Math.max(this.bounds.xmax,p[0]);this.bounds.ymin=Math.min(this.bounds.ymin,p[1]);this.bounds.ymax=Math.max(this.bounds.ymax,p[1]);}this.bounds.span=Math.max(this.bounds.xmax-this.bounds.xmin,this.bounds.ymax-this.bounds.ymin,4);this.Z=this.bounds.span*this.heightFactor;const b=this.bounds;
    const points=[];for(const x of[b.xmin,b.xmax])for(const y of[b.ymin,b.ymax])for(const z of[0,this.Z])points.push([x,y,z]);
    this.P=fitProjection(points,this.width,this.height,{pad:this.width<500?34:43,azimuth:this.azimuth,elevation:this.elevation});this.meshDirty=true;
  }
  changed(){this.meshDirty=true;this.field=null;}
  at(x,y,z=0){return iso([x,y,z],this.P);}
  floor(sx,sy,z=0){const a=this.at(0,0,z),vx=axisVector(this.P,[1,0,0]),vy=axisVector(this.P,[0,1,0]),dx=sx-a[0],dy=sy-a[1],det=vx[0]*vy[1]-vx[1]*vy[0];return [(dx*vy[1]-dy*vy[0])/det,(vx[0]*dy-vx[1]*dx)/det];}
  circle(c,r,z=0,n=72){return polyline(Array.from({length:n+1},(_,i)=>this.at(c[0]+r*Math.cos(i/n*Math.PI*2),c[1]+r*Math.sin(i/n*Math.PI*2),z)));}
  contour(o,alpha,z=0,n=72){return polyline(Array.from({length:n+1},(_,i)=>this.at(...M.cutPoint(alpha,o,i/n*Math.PI*2),z)));}
  line(a,b,attrs=''){return `<path d="${polyline([a,b])}" ${attrs}/>`;}
  marker(p,r,cls,attrs=''){return `<circle cx="${p[0]}" cy="${p[1]}" r="${r}" class="${cls}" ${attrs}/>`;}
  makeMesh(app){
    if(app.view==='landscape'&&app.model.problem){this.vertexCount=0;this.field=null;this.meshDirty=false;return;}
    const vertices=[],Z=this.Z,field=app.view==='landscape'&&!app.model.problem;
    const triangle=(a,b,c,color,levels=[1,1,1],colors=null)=>{
      const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;n=n.map(v=>v/len);if(n[2]<0)n=n.map(v=>-v);
      [a,b,c].forEach((p,i)=>vertices.push(...p,...n,...(colors?colors[i]:color),levels[i]));
    };
    if(field){
      const b=this.bounds,N=app.model.general?(this.gl?24:18):(this.gl?54:28),dx=(b.xmax-b.xmin)/N,dy=(b.ymax-b.ymin)/N,values=[],tables=[];
      for(const o of app.model.objects){if(!M.isSpherical(o)){tables.push({o,general:true});continue;}let maxD=0;for(const x of[b.xmin,b.xmax])for(const y of[b.ymin,b.ymax])maxD=Math.max(maxD,M.distance([x,y],o.c));const arr=[];for(let j=0;j<=500;j++)arr.push(M.radial(maxD*j/500,o,app.p).D);tables.push({o,maxD,arr});}
      const getF=(x,y)=>tables.reduce((sum,{o,maxD,arr,general})=>{if(general)return sum+o.b*M.metric([x,y],o,app.p).D;const t=Math.min(500,M.distance([x,y],o.c)/maxD*500),i=Math.min(499,Math.floor(t));return sum+o.b*(arr[i]+(arr[i+1]-arr[i])*(t-i));},0);
      let low=Infinity,high=-Infinity;for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){const F=getF(b.xmin+i*dx,b.ymin+j*dy);values.push(F);low=Math.min(low,F);high=Math.max(high,F);}
      const span=Math.max(high-low,1e-10);this.field={low,high,span,Z,N,dx,dy,values};
      const point=(i,j)=>{const F=values[j*(N+1)+i],v=(F-low)/span,[c0,c1]=fieldColors().map(rgb);return {p:[b.xmin+i*dx,b.ymin+j*dy,(F-low)/span*Z],color:c0.map((a,k)=>a+(c1[k]-a)*v)};};
      for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);triangle(a.p,b.p,c.p,null,undefined,[a.color,b.color,c.color]);triangle(a.p,c.p,d.p,null,undefined,[a.color,c.color,d.color]);}
    }else{
      this.field=null;
      for(const o of app.objects){if(!o.a)continue;const color=rgb(colorFor(o)),A=64,R=34,rings=[];
        for(let j=0;j<=R;j++){const alpha=.005+.995*j/R,r=M.radius(alpha,o);rings.push({alpha,r});}
        for(let j=0;j<R;j++)for(let i=0;i<A;i++){
          const t=i/A*Math.PI*2,t1=(i+1)/A*Math.PI*2,l=rings[j],h=rings[j+1];
          const a=[...M.cutPoint(l.alpha,o,t),l.alpha*Z],b=[...M.cutPoint(l.alpha,o,t1),l.alpha*Z],c=[...M.cutPoint(h.alpha,o,t1),h.alpha*Z],d=[...M.cutPoint(h.alpha,o,t),h.alpha*Z];
          triangle(a,b,c,color,[l.alpha,l.alpha,h.alpha]);triangle(a,c,d,color,[l.alpha,h.alpha,h.alpha]);
        }
        const core=rings[R].r;if(core>0)for(let i=0;i<A;i++){const t=i/A*Math.PI*2,t1=(i+1)/A*Math.PI*2;triangle([o.x,o.y,Z],[...M.cutPoint(1,o,t),Z],[...M.cutPoint(1,o,t1),Z],color);}
      }
    }
    this.vertexCount=vertices.length/10;if(this.gl){this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.buffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(vertices),this.gl.STATIC_DRAW);}this.meshDirty=false;
  }
  drawGL(app){
    const gl=this.gl;if(!gl)return;
    const dpr=Math.min(devicePixelRatio||1,1.5),w=Math.round(this.width*dpr),h=Math.round(this.height*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(app.view==='levels')return;
    const c=cameraOf(this.P),k=c.k,W=this.width,H=this.height,ox=this.P.origin[0],oy=this.P.origin[1];const depth=Math.max(this.bounds.span*20,100);
    const centerDepth=((this.bounds.xmin+this.bounds.xmax)/2*c.cosA+(this.bounds.ymin+this.bounds.ymax)/2*c.sinA)*c.cosE+this.Z/2*c.sinE;
    const m=new Float32Array([2*k*c.sinA/W,-2*k*c.cosA*c.sinE/H,-c.cosA*c.cosE/depth,0,-2*k*c.cosA/W,-2*k*c.sinA*c.sinE/H,-c.sinA*c.cosE/depth,0,0,2*k*c.cosE/H,-c.sinE/depth,0,2*ox/W-1,1-2*oy/H,centerDepth/depth,1]);
    gl.useProgram(this.program);gl.uniformMatrix4fv(this.uProjection,false,m);gl.uniform1f(this.uDark,document.body.dataset.theme==='dark'?1:0);gl.uniform1f(this.uField,this.field?1:0);gl.drawArrays(gl.TRIANGLES,0,this.vertexCount);
  }
  pointHeight(x,app){return this.field?(M.evaluate(x,app.model).F-this.field.low)/this.field.span*this.Z:0;}
  render(app){
    const theme=document.body.dataset.theme||'light';if(this.meshTheme!==theme){this.meshTheme=theme;this.meshDirty=true;}
    this.last=app;this.view=app.view;if(!this.bounds)this.fit(app.objects);
    if(this.meshDirty)this.makeMesh(app);this.drawGL(app);
    const b=this.bounds,Z=this.Z,alpha=app.alpha,cut=app.view==='levels'?0:alpha*Z,step=niceStep(b.span),fmt=n=>Number(n.toPrecision(3)).toLocaleString('ru-RU');let back='',front='';
    if(!this.gl&&this.field){
      const f=this.field,faces=[];
      for(let j=0;j<f.N;j++)for(let i=0;i<f.N;i++){
        const corners=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]].map(([x,y])=>{const F=f.values[y*(f.N+1)+x];return [b.xmin+x*f.dx,b.ymin+y*f.dy,(F-f.low)/f.span*Z];}),level=corners.reduce((s,p)=>s+p[2]/Z,0)/4,[base,tip]=fieldColors().map(rgb),paper=document.body.dataset.theme==='dark'?[.09,.133,.18]:[.973,.984,.988],col=base.map((v,k)=>Math.round((paper[k]*.3+(v+(tip[k]-v)*level)*.7)*255));
        faces.push({depth:depthOf(corners.reduce((s,p)=>s.map((v,k)=>v+p[k]/4),[0,0,0]),this.P),svg:`<path d="${polyline(corners.map(p=>this.at(...p)))}Z" fill="rgb(${col.join(',')})" stroke="rgb(${col.join(',')})" stroke-width=".5"/>`});
      }front+=faces.sort((a,b)=>a.depth-b.depth).map(f=>f.svg).join('');
    }
    const boundary=[[b.xmin,b.ymin],[b.xmax,b.ymin],[b.xmax,b.ymax],[b.xmin,b.ymax],[b.xmin,b.ymin]];
    if(app.display.grid){back+=`<path class="svg-grid" d="${polyline(boundary.map(v=>this.at(...v)))}"/>`;for(let x=Math.ceil(b.xmin/step)*step;x<=b.xmax;x+=step)back+=this.line(this.at(x,b.ymin),this.at(x,b.ymax),'class="svg-grid"');for(let y=Math.ceil(b.ymin/step)*step;y<=b.ymax;y+=step)back+=this.line(this.at(b.xmin,y),this.at(b.xmax,y),'class="svg-grid"');}
    back+=this.line(this.at(b.xmin,b.ymin),this.at(b.xmax,b.ymin),'class="svg-axis"')+this.line(this.at(b.xmin,b.ymin),this.at(b.xmin,b.ymax),'class="svg-axis"');
    if(app.display.labels){
      for(let x=Math.ceil(b.xmin/step)*step;x<=b.xmax;x+=step){const v=this.at(x,b.ymin);back+=`<text class="svg-label" x="${v[0]}" y="${v[1]+16}" text-anchor="middle">${fmt(x)}</text>`;}
      for(let y=Math.ceil(b.ymin/step)*step;y<=b.ymax;y+=step){const v=this.at(b.xmin,y);back+=`<text class="svg-label" x="${v[0]-9}" y="${v[1]+2}" text-anchor="end">${fmt(y)}</text>`;}
      for(const [text,p]of [['x',this.at(b.xmax,b.ymin)],['y',this.at(b.xmin,b.ymax)]])back+=mathSvg(text,p[0]+10,p[1]-3,22,26);
    }
    if(app.view!=='landscape'){
      if(app.view==='surfaces')front+=`<path d="${polyline(boundary.map(v=>this.at(...v,cut)))}Z" fill="${document.body.dataset.theme==='dark'?'#9bd7ce':'#4b9ca3'}" fill-opacity=".025" stroke="${document.body.dataset.theme==='dark'?'#86bcb6':'#83b5b9'}" stroke-opacity=".28" stroke-width=".6"/>`;
      if(this.elevation<86){const vertical=this.at(b.xmin,b.ymin,Z),floor=this.at(b.xmin,b.ymin);
      front+=this.line(floor,vertical,'class="svg-axis"');for(const v of[0,.25,.5,.75,1]){const p=this.at(b.xmin,b.ymin,v*Z);front+=this.line([p[0]-3,p[1]],[p[0]+3,p[1]],'class="svg-axis"');if(app.display.labels)front+=`<text class="svg-label" x="${p[0]-7}" y="${p[1]+3}" text-anchor="end">${fmt(v)}</text>`;}
      if(app.display.labels)front+=mathSvg(String.raw`\pi`,vertical[0]-9,vertical[1]-30,24,26);}
    }
    for(const o of app.objects){
      const col=colorFor(o),r=M.radius(alpha,o),c=[o.x,o.y];
      if(app.view!=='landscape'){
        if(app.display.contours||!this.gl||app.view==='levels')for(const level of[.1,.25,.5,.75,.9])front+=`<path class="svg-contour" stroke="${col}" d="${this.contour(o,level,app.view==='levels'?0:level*Z)}"/>`;
        front+=`<path class="svg-cut" stroke="${col}" opacity="${o.id===app.selected?1:.68}" d="${this.contour(o,alpha,cut)}"/>`;
      }
      const p=this.at(o.x,o.y,0);front+=this.marker(p,o.id===app.selected?4:3,'svg-halo',`data-center="${o.id}" style="fill:${col};stroke:var(--paper)"`);
      if(o.id===app.selected)front+=this.marker(p,8,'',`fill="none" stroke="${col}" stroke-width=".8" opacity=".7"`);
      if(app.display.labels)front+=`<g style="color:${col}">${mathSvg('c_{'+o.id+'}',p[0]+9,p[1]-24,38,28)}</g>`;
      if(app.view!=='landscape'&&(app.display.rays==='all'||app.display.rays==='selected'&&o.id===app.selected)){
        const geometry=M.cutGeometry(o,app.x,alpha),far=geometry.far,p0=this.at(...app.x,cut),p1=this.at(...far,cut);
        front+=this.line(p0,p1,'class="svg-distance-halo"')+this.line(p0,p1,`class="svg-ray svg-distance" stroke="${col}"`)+this.marker(p1,2.8,'',`fill="var(--paper)" stroke="${col}" stroke-width="1"`);
        if(app.display.labels&&app.display.rays==='all'){const mid=p0.map((v,i)=>(v+p1[i])/2);front+=`<text class="svg-object-label" fill="${col}" x="${mid[0]+5}" y="${mid[1]-6}" style="font:9px 'Segoe UI'">${fmt(geometry.R)}</text>`;}
      }
    }
    if(app.display.paths){
      for(const run of app.runs){if(run.p!==app.p||run.trace.length<2)continue;const points=run.trace.filter((_,i)=>i%Math.max(1,Math.floor(run.trace.length/600))===0||i===run.trace.length-1).map(t=>this.at(...t.x,this.pointHeight(t.x,app)));front+=`<path class="svg-trace" stroke="${run.color}" opacity="${run.id===app.selectedRun?.id?1:.55}" d="${polyline(points)}"/>`;const start=points[0];front+=this.marker(start,3,'',`fill="var(--paper)" stroke="${run.color}" stroke-width="1"`);}
    }
    const xZ=this.pointHeight(app.x,app),xFloor=this.at(...app.x,xZ),xLevel=this.at(...app.x,app.view==='levels'?0:app.view==='landscape'?xZ:cut);
    if(app.view==='surfaces')front+=this.line(xFloor,this.at(...app.x,Z),'class="svg-axis" stroke-dasharray="2 4"');
    front+=this.marker(xFloor,5,'svg-current')+this.marker(xLevel,3.5,'svg-current');
    if(app.display.labels)front+=mathSvg('x',xFloor[0]+9,xFloor[1]+2,24,26);
    const probe=app.hover||app.x,probeZ=app.hover?this.pointHeight(probe,app):xZ,probeAt=app.hover?this.at(...probe,probeZ):xFloor;let vectors='';
    if(app.hover&&(app.display.gradient||app.display.step&&!app.selectedRun)&&!app.model.problem)vectors+=this.marker(probeAt,5,'svg-probe','data-probe-point');
    if(app.display.gradient&&!app.model.problem){const ev=M.evaluate(probe,app.model),B=app.objects.reduce((sum,o)=>sum+o.b,0),tip=probe.map((v,i)=>v-ev.g[i]*b.span*.08/Math.max(B,1)),end=this.at(...tip,probeZ);if(M.distance(probeAt,end)>2){vectors+=this.line(probeAt,end,'class="svg-axis svg-gradient" data-subgradient')+this.marker(end,2,'svg-current');if(app.display.labels)vectors+=mathSvg('-g',end[0]+5,end[1]-14,30,26);}}
    if(app.display.step&&!app.model.problem){
      const settings=app.selectedRun?.solver||app.solver,base=app.selectedRun?app.x:probe,k=app.selectedRun?(app.iteration??app.selectedRun.k):0,v=M.evaluate(base,app.model);
      if(Number.isFinite(settings.eta0)&&settings.eta0>0&&settings.eta0<=1e6&&Number.isInteger(k)&&k>=0&&v.gap>settings.tolerance){
        const next=M.subgradientPoint(base,v.g,settings.eta0,k);
        if(next.every(Number.isFinite)){const from=this.at(...base,this.pointHeight(base,app)),to=this.at(...next,this.pointHeight(next,app));vectors+=this.line(from,to,'class="svg-axis" stroke-dasharray="3 3" data-step-segment')+this.marker(to,5,'svg-probe','data-step-result');if(app.display.labels)vectors+=mathSvg('x^+',to[0]+9,to[1]+2,30,26);}
      }
    }
    front+=`<g data-probe="${app.hover?'hover':'current'}">${vectors}</g>`;
    const start=this.at(...app.start,this.pointHeight(app.start,app));front+=this.line([start[0]-4,start[1]-4],[start[0]+4,start[1]+4],'class="svg-axis"')+this.line([start[0]-4,start[1]+4],[start[0]+4,start[1]-4],'class="svg-axis"');if(app.display.labels)front+=mathSvg('x_0',start[0]+8,start[1]-23,30,26);
    this.back.innerHTML=back;this.front.innerHTML=front;
    document.querySelector('#plane-label').innerHTML=app.view==='landscape'?(this.field?mathHTML('F_p')+': '+fmt(this.field.low)+' … '+fmt(this.field.high):mathHTML(String.raw`F_p=\infty`)):mathHTML(String.raw`\alpha`)+ ' = '+alpha.toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
    document.querySelector('#renderer-label').textContent=app.view==='landscape'?(app.model.problem?'Поле не определено':'Поле критерия'):app.view==='levels'?'α-уровневые множества':this.gl?'Поверхности':'Показаны α-уровневые множества';
  }
}
