export const profiles={triangle:'Треугольная',trapezoid:'Трапециевидная',gaussian:'Гауссова',exponential:'Экспоненциальная',parabola:'Параболическая',cosine:'Косинусная',bell:'Колоколообразная',ball:'Чёткий шар'};
export const shapes={circle:'Круговые',ellipse:'Эллиптические',rectangle:'Прямоугольные'};
export const isSpherical=o=>!o.shape||o.shape==='circle';
export const shapeOf=o=>({shape:o.shape??'circle',aspect:o.aspect??1,angle:o.angle??0});
export const palette=['#277e8b','#c36c52','#7168b2','#9a812f','#b25f85','#497fae','#5e8844','#8b6c94'];
export const initialObjects=()=>[[0,0,1,1],[10,0,2,1.1],[3,8,3,.9]].map(([x,y,a,b],i)=>({id:i+1,x,y,a,b,type:'triangle',core:.35,q:4}));
export const mixedObjects=()=>[{id:1,x:0,y:0,a:2,b:1,type:'gaussian',core:.35,q:4},{id:2,x:8,y:1,a:2.4,b:1.2,type:'trapezoid',core:.4,q:4},{id:3,x:3,y:7,a:2.7,b:.9,type:'cosine',core:.35,q:4},{id:4,x:-3,y:6,a:1.4,b:.8,type:'exponential',core:.35,q:4},{id:5,x:10,y:7,a:1.8,b:1,type:'bell',core:.35,q:5}];
export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function validate(objects,p){
  if(!Array.isArray(objects)||!objects.length)throw Error('Добавьте хотя бы один объект.');
  if(!(p===Infinity||Number.isFinite(p)&&p>=1&&p<=64))throw Error('p должен быть от 1 до 64 или ∞.');
  const ids=new Set();
  for(const o of objects){
    if(!Number.isInteger(o.id)||ids.has(o.id)||o.id<1)throw Error('Идентификаторы объектов должны быть уникальными положительными целыми.');ids.add(o.id);
    const geom=shapeOf(o);if(!Object.hasOwn(shapes,geom.shape)||!Number.isFinite(geom.aspect)||geom.aspect<.1||geom.aspect>10||!Number.isFinite(geom.angle)||Math.abs(geom.angle)>360)throw Error('Форма среза: круг, эллипс или прямоугольник; пропорция 0,1…10; поворот −360…360°.');
    if(!Object.hasOwn(profiles,o.type))throw Error('Неизвестный профиль.');
    if(![o.x,o.y,o.a,o.b,o.core,o.q].every(Number.isFinite))throw Error('Параметры должны быть конечными числами.');
    if(Math.abs(o.x)>1e6||Math.abs(o.y)>1e6||o.a<0||o.a>1e6||o.a>0&&o.a<1e-6||o.b<=0||o.b>1e6)throw Error('Координаты и веса: до 10⁶; масштаб: 0 или 10⁻⁶…10⁶; β > 0.');
    if(o.core<0||o.core>1||o.q<.5||o.q>64)throw Error('Доля ядра: 0…1; показатель q: 0,5…64.');
  }
}
export function radius(alpha,o){
  if(!(alpha>0&&alpha<=1))throw Error('α должно быть в (0,1].');
  if(!o.a)return 0;
  switch(o.type){
    case 'triangle':return o.a*(1-alpha);
    case 'trapezoid':return o.a*(o.core+(1-o.core)*(1-alpha));
    case 'gaussian':return o.a*Math.sqrt(-2*Math.log(alpha));
    case 'exponential':return -o.a*Math.log(alpha);
    case 'parabola':return o.a*Math.sqrt(1-alpha);
    case 'cosine':return o.a*Math.acos(2*alpha-1)/Math.PI;
    case 'bell':return o.a*Math.expm1(-Math.log(alpha))**(1/o.q);
    case 'ball':return o.a;
  }
}
export function membership(r,o){
  if(!o.a)return r===0?1:0;const t=Math.max(0,r/o.a);
  switch(o.type){
    case 'triangle':return Math.max(0,1-t);
    case 'trapezoid':return t<=o.core?1:t>=1?0:(1-t)/(1-o.core);
    case 'gaussian':return Math.exp(-t*t/2);
    case 'exponential':return Math.exp(-t);
    case 'parabola':return Math.max(0,1-t*t);
    case 'cosine':return t>=1?0:(1+Math.cos(Math.PI*t))/2;
    case 'bell':return 1/(1+t**o.q);
    case 'ball':return t<=1?1:0;
  }
}
export const bounded=o=>!o.a||!['gaussian','exponential','bell'].includes(o.type);
export function issue(objects,p){
  const bad=objects.filter(o=>o.a>0&&(p===Infinity&&!bounded(o)||o.type==='bell'&&p>=o.q));
  return bad.length?'Dₚ = ∞ для '+bad.map(o=>'A'+o.id).join(', ')+(p===Infinity?': профиль имеет неограниченный носитель.':': колоколообразный хвост требует p < q.'):'';
}
const ruleCache=new Map();
export function gauss(n=48){
  if(ruleCache.has(n))return ruleCache.get(n);
  const out=[];
  for(let i=0;i<Math.ceil(n/2);i++){
    let z=Math.cos(Math.PI*(i+.75)/(n+.5)),der=0;
    for(let k=0;k<30;k++){
      let a=1,b=0;for(let j=1;j<=n;j++){const c=b;b=a;a=((2*j-1)*z*b-(j-1)*c)/j;}
      der=n*(z*a-b)/(z*z-1);const next=z-a/der;if(Math.abs(next-z)<1e-15){z=next;break;}z=next;
    }
    const w=2/((1-z*z)*der*der);out.push({x:-z,w});if(n-1-i!==i)out.push({x:z,w});
  }
  out.sort((a,b)=>a.x-b.x);ruleCache.set(n,out);return out;
}
function logGamma(z){
  const c=[676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  z-=1;let x=.9999999999998099;for(let i=0;i<c.length;i++)x+=c[i]/(z+i+1);const t=z+7.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
}
const logadd=(a,b)=>a===-Infinity?b:b===-Infinity?a:Math.max(a,b)+Math.log1p(Math.exp(-Math.abs(a-b)));
function nodesBetween(lo,hi,n,fn){return gauss(n).map(({x,w})=>{const t=lo+(x+1)*(hi-lo)/2;return fn(t,w*(hi-lo)/2);});}
export function moment(o,k){
  if(k===0)return 1;if(!o.a)return 0;const a=o.a;
  switch(o.type){
    case 'triangle':return a**k/(k+1);
    case 'trapezoid':{const b=a*o.core;return o.core===1?a**k:(a**(k+1)-b**(k+1))/((k+1)*(a-b));}
    case 'gaussian':return Math.exp(k*Math.log(a)+k/2*Math.log(2)+logGamma(1+k/2));
    case 'exponential':return Math.exp(k*Math.log(a)+logGamma(1+k));
    case 'parabola':return 2*a**k/(k+2);
    case 'cosine':return nodesBetween(0,1,64,(t,w)=>w*a**k*t**k*Math.PI/2*Math.sin(Math.PI*t)).reduce((a,b)=>a+b,0);
    case 'bell':return k>=o.q?Infinity:Math.exp(k*Math.log(a)+logGamma(1+k/o.q)+logGamma(1-k/o.q));
    case 'ball':return a**k;
  }
}
function logMoment(o,k){
  if(k===0)return 0;if(!o.a)return -Infinity;
  if(o.type==='bell')return k>=o.q?Infinity:k*Math.log(o.a)+logGamma(1+k/o.q)+logGamma(1-k/o.q);
  if(o.type==='gaussian')return k*Math.log(o.a)+k/2*Math.log(2)+logGamma(1+k/2);
  if(o.type==='exponential')return k*Math.log(o.a)+logGamma(1+k);
  if(o.type==='triangle')return k*Math.log(o.a)-Math.log(k+1);
  if(o.type==='parabola')return k*Math.log(o.a)+Math.log(2/(k+2));
  if(o.type==='ball')return k*Math.log(o.a);
  return Math.log(moment({...o,a:1},k))+k*Math.log(o.a);
}
function quadrature(o,p,n){
  if(['triangle','trapezoid','parabola','cosine','ball'].includes(o.type))return nodesBetween(0,1,n,(v,w)=>{
    const t=v**4;w*=4*v**3;
    const r=o.type==='trapezoid'?o.a*(o.core+(1-o.core)*t):o.a*t;
    const density=o.type==='parabola'?2*t:o.type==='cosine'?Math.PI/2*Math.sin(Math.PI*t):1;
    return {r,lw:Math.log(w*density)};
  });
  if(o.type==='bell'){
    const T=Math.max(40,48/o.q),out=[];
    const pieces=Math.ceil(2*T/Math.min(4,4/o.q));
    for(let i=0;i<pieces;i++)out.push(...nodesBetween(-T+2*T*i/pieces,-T+2*T*(i+1)/pieces,12,(t,w)=>({r:o.a*Math.exp(t),lw:Math.log(w*o.q)-Math.abs(o.q*t)-2*Math.log1p(Math.exp(-Math.abs(o.q*t)))})));
    const kept=out.filter(node=>node.lw+p*Math.max(0,Math.log(node.r/o.a))> -100-p*Math.LN2);kept.tail=T;return kept;
  }
  const max=o.type==='gaussian'?Math.sqrt(2*(p+12*Math.sqrt(p+1)+50)):p+14*Math.sqrt(p+1)+60;
  const pieces=Math.ceil(max/4),out=[];
  for(let i=0;i<pieces;i++){
    const from=max*i/pieces,to=max*(i+1)/pieces;
    out.push(...nodesBetween(i?from:0,i?to:1,i?12:32,(v,w)=>{const u=i?v:to*v**4;if(!i)w*=4*to*v**3;return {r:o.a*u,lw:Math.log(w)+(o.type==='gaussian'?Math.log(u)-u*u/2:-u)};}));
  }
  return out;
}
function logIntegral(d,s,o){
  if(s===0)return 0;
  if(d===0)return logMoment(o,s);
  if(Number.isInteger(s)){
    let sum=-Infinity;
    for(let k=0;k<=s;k++){
      if(d===0&&k<s)continue;
      const term=logGamma(s+1)-logGamma(k+1)-logGamma(s-k+1)+(k<s?(s-k)*Math.log(d):0)+o.logs[k];
      sum=logadd(sum,term);
    }return sum;
  }
  let sum=-Infinity;for(const node of o.nodes)sum=logadd(sum,s*Math.log(d+node.r)+node.lw);
  if(o.type==='bell'){
    const T=o.nodes.tail,delta=o.q-s,v=d/o.a*Math.exp(-T);let series=1/delta,coef=1,term=1;
    for(let k=1;k<=10;k++){coef*=((s-k+1)/k);term*=v;series+=coef*term/(delta+k);}
    if(series>0)sum=logadd(sum,Math.log(o.q)+s*Math.log(o.a)-delta*T+Math.log(series));
    if(d>0)sum=logadd(sum,s*Math.log(d)-o.q*T);
  }
  return sum;
}
export function createModel(objects,p=2,order=64,reduction=true){
  validate(objects,p);if(typeof reduction!=='boolean')throw Error('Редукция должна быть включена или выключена.');const problem=issue(objects,p);
  const prepared=objects.map(o=>({...o,...shapeOf(o),reduced:isSpherical(o)&&reduction,c:[o.x,o.y],m:isSpherical(o)?moment(o,1):NaN,s2:isSpherical(o)?moment(o,2):NaN,quadOrder:order,nodes:[],logs:[]}));
  if(!problem)for(const o of prepared){
    if(!o.reduced){if(p!==Infinity&&o.a)o.nodes=generalNodes(o,p,order);continue;}
    if(Number.isFinite(p))for(let k=0;k<=Math.ceil(p);k++)o.logs.push(logMoment(o,k));
    if(p!==Infinity&&!Number.isInteger(p)&&o.a)o.nodes=quadrature(o,p,order);
  }
  return {objects:prepared,p,problem,order,reduction,general:objects.some(o=>!isSpherical(o))};
}
export function radial(d,o,p){
  if(!isSpherical(o))throw Error('Радиальная редукция неприменима к несферическим срезам.');
  if(!o.a)return {D:d,derivative:1};
  if(p===Infinity||o.type==='ball'||o.type==='trapezoid'&&o.core===1)return {D:d+o.a,derivative:1};
  if(p===1)return {D:d+o.m,derivative:1};
  if(p===2){const D=Math.sqrt(d*d+2*o.m*d+o.s2);return {D,derivative:(d+o.m)/D};}
  const I=logIntegral(d,p,o),J=logIntegral(d,p-1,o);
  return {D:Math.exp(I/p),derivative:Math.exp(J-(p-1)*I/p)};
}
export function evaluate(x,model,details=false){
  if(model.problem){
    const terms=details?model.objects.map(o=>{const single=createModel([o],model.p,model.order,model.reduction),D=single.problem?Infinity:metric(x,single.objects[0],model.p).D;return {id:o.id,d:isSpherical(o)?distance(x,o.c):NaN,D,contribution:o.b*D};}):[];
    return {F:Infinity,g:[NaN,NaN],norm:Infinity,gap:Infinity,terms};
  }
  let F=0,g=[0,0],reach=0;const terms=[];
  for(const o of model.objects){
    const d=distance(x,o.c),v=metric(x,o,model.p);F+=o.b*v.D;reach=Math.max(reach,d);
    for(let i=0;i<2;i++)g[i]+=o.b*v.g[i];
    if(details)terms.push({id:o.id,d:isSpherical(o)?d:NaN,D:v.D,contribution:o.b*v.D,derivative:v.derivative});
  }
  const norm=Math.hypot(...g);
  return {F,g,norm,gap:norm*(model.general?2*F/model.objects.reduce((s,o)=>s+o.b,0):reach),reach,terms};
}
export const algorithms={subgradient:'Субградиентный метод'};
export const solverDefaults={algorithm:'subgradient',reduction:true,eta0:10,tolerance:1e-5,maxIterations:20000};
export function solverOptions(options={}){
  if(!options||typeof options!=='object'||Array.isArray(options))throw Error('Некорректные настройки алгоритма.');
  const s={...solverDefaults,...options};
  if(!Object.hasOwn(algorithms,s.algorithm))throw Error('Неизвестный алгоритм расчёта.');
  if(typeof s.reduction!=='boolean'||!Number.isFinite(s.eta0)||s.eta0<=0||s.eta0>1e6||!Number.isFinite(s.tolerance)||s.tolerance<1e-10||s.tolerance>1||!Number.isInteger(s.maxIterations)||s.maxIterations<1||s.maxIterations>200000)throw Error('η₀: 0…10⁶, ε: 10⁻¹⁰…1, лимит: 1…200 000 целых шагов; редукция — флажок.');
  return s;
}
export const subgradientPoint=(x,g,eta0,k=0)=>x.map((v,i)=>v-eta0*g[i]/(k+1));
export function startSolver(model,start,options={}){
  const settings=solverOptions(options);if(!Object.hasOwn(options,'reduction'))settings.reduction=model.reduction;
  if(settings.reduction!==model.reduction)model=createModel(model.objects,model.p,model.order,settings.reduction);
  if(model.problem)throw Error(model.problem);
  if(!Array.isArray(start)||start.length!==2||!start.every(Number.isFinite)||start.some(v=>Math.abs(v)>1e6))throw Error('Начальная точка должна быть в диапазоне ±10⁶.');
  const value=evaluate(start,model),done=value.gap<=settings.tolerance;
  return {model,settings,start:[...start],x:[...start],k:0,value,done,reason:done?'Достигнута точность':'',best:{x:[...start],F:value.F,k:0},trace:[{k:0,x:[...start],...value}]};
}
export function iterate(s){
  if(s.done)return s;
  const next=subgradientPoint(s.x,s.value.g,s.settings.eta0,s.k),v=evaluate(next,s.model);
  if(!next.every(Number.isFinite)||![v.F,v.norm,v.gap].every(Number.isFinite)){s.done=true;s.reason='Переполнение: уменьшите η₀';return s;}
  const stalled=distance(next,s.x)===0;s.x=next;s.k++;s.value=v;s.trace.push({k:s.k,x:[...s.x],...v});
  if(v.F<s.best.F)s.best={x:[...s.x],F:v.F,k:s.k};
  if(v.gap<=s.settings.tolerance){s.done=true;s.reason='Достигнута точность';}
  else if(s.k>=s.settings.maxIterations){s.done=true;s.reason='Лимит '+s.settings.maxIterations.toLocaleString('ru-RU')+' шагов; точность не достигнута';}
  else if(stalled){s.done=true;s.reason='Предел машинной точности; ε не достигнута';}
  return s;
}
export function solve(model,start=[8,7],options={}){const s=startSolver(model,start,options);while(!s.done)iterate(s);return s;}
export function formula(o){
  return {triangle:'max(1 − r/a, 0)',trapezoid:'1 при r ≤ ba; (1 − r/a)/(1 − b) при ba < r < a',gaussian:'exp(−r² / 2a²)',exponential:'exp(−r/a)',parabola:'max(1 − r²/a², 0)',cosine:'(1 + cos(πr/a))/2 при r ≤ a',bell:'1 / (1 + (r/a)ᑫ)',ball:'1 при r ≤ a; 0 иначе'}[o.type];
}

export function localPoint(point,o){const a=(o.angle??0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=point[0]-o.x,y=point[1]-o.y;return [c*x+s*y,-s*x+c*y];}
export function worldVector(v,o){const a=(o.angle??0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [c*v[0]-s*v[1],s*v[0]+c*v[1]];}
export function cutPoint(alpha,o,theta){
  const r=radius(alpha,o),k=isSpherical(o)?1:o.aspect??1,u=Math.cos(theta),v=Math.sin(theta),den=o.shape==='rectangle'?Math.max(Math.abs(u),Math.abs(v)):1;
  const p=worldVector([r*u/den,r*k*v/den],o);return [o.x+p[0],o.y+p[1]];
}
export function cutExtent(alpha,o){return radius(alpha,o)*(o.shape==='rectangle'?Math.hypot(1,o.aspect??1):Math.max(1,isSpherical(o)?1:o.aspect??1));}
export function gauge(point,o){const [u,v]=localPoint(point,o),k=isSpherical(o)?1:o.aspect??1;return o.shape==='rectangle'?Math.max(Math.abs(u),Math.abs(v/k)):Math.hypot(u,v/k);}
export function spatialFormula(o){return isSpherical(o)?'π(r) = '+formula(o):'π(z) = f(ρ(z)); ρ = '+(o.shape==='rectangle'?'max(|u|, |v|/k)':'√(u² + (v/k)²)')+'; (u,v) = Rot(−θ)(z − c); f(t) = '+formula(o).replaceAll('r','t');}

function ellipseFar(x,a,b){
  const swap=b>a;if(swap){[a,b]=[b,a];x=[x[1],x[0]];}
  const [u,v]=x,aa=a*a,bb=b*b,delta=aa-bb;
  let point,average=null,nonunique=false;
  if(delta===0){const d=Math.hypot(u,v);point=d?[-a*u/d,-a*v/d]:[a,0];if(!d){average=[0,0];nonunique=true;}}
  else if(u===0&&Math.abs(bb*v/delta)<=b){
    const y=-bb*v/delta,z=a*Math.sqrt(Math.max(0,1-(y/b)**2));point=[z,y];const R=Math.hypot(z,v-y);average=[0,R?(v-y)/R:0];nonunique=z>0;
  }else{
    let lo=a*Math.abs(u),hi=a*Math.hypot(u,v);const minorTerm=(b*v/(delta+lo))**2;
    if(minorTerm<1&&lo>0)hi=Math.min(hi,lo/Math.sqrt(1-minorTerm));
    for(let i=0;i<96;i++){const t=(lo+hi)/2,f=(a*u/t)**2+(b*v/(delta+t))**2;if(f>1)lo=t;else hi=t;if(hi-lo<=4*Number.EPSILON*t)break;}
    const t=(lo+hi)/2;point=[-aa*u/t,-bb*v/(delta+t)];
  }
  const R=distance(x,point),g=average??x.map((v,i)=>R?(v-point[i])/R:0);
  if(swap){point.reverse();g.reverse();}return {point,R,g,nonunique};
}
function farLocal(x,rx,ry,shape){
  if(!rx&&!ry){const R=Math.hypot(...x);return {point:[0,0],R,g:x.map(v=>R?v/R:0),nonunique:false};}
  if(shape==='rectangle'){
    const point=[x[0]>0?-rx:rx,x[1]>0?-ry:ry],R=distance(x,point);
    return {point,R,g:x.map((v,i)=>v?(v-point[i])/R:0),nonunique:x[0]===0||x[1]===0};
  }
  return ellipseFar(x,rx,ry);
}
function nearLocal(x,a,b,shape){
  if(!a&&!b)return [0,0];
  if(shape==='rectangle')return x.map((v,i)=>Math.max(-[a,b][i],Math.min([a,b][i],v)));
  if((x[0]/a)**2+(x[1]/b)**2<=1)return [...x];
  let lo=0,hi=Math.max(a,b)*Math.hypot(...x);
  for(let i=0;i<60;i++){const t=(lo+hi)/2,f=(a*x[0]/(a*a+t))**2+(b*x[1]/(b*b+t))**2;if(f>1)lo=t;else hi=t;}
  const t=(lo+hi)/2;return [a*a*x[0]/(a*a+t),b*b*x[1]/(b*b+t)];
}
export function cutGeometry(o,x,alpha){
  const c=[o.x,o.y],centerDistance=distance(x,c),scale=radius(alpha,o),u=centerDistance?x.map((v,i)=>(v-c[i])/centerDistance):[1,0];
  if(isSpherical(o)){
    const far=c.map((v,i)=>v-scale*u[i]),near=centerDistance<=scale?[...x]:c.map((v,i)=>v+scale*u[i]);
    return {c,x:[...x],centerDistance,scale,d:centerDistance,r:scale,u,near,far,hXA:Math.max(0,centerDistance-scale),hAX:centerDistance+scale,R:centerDistance+scale,nonunique:centerDistance===0&&scale>0};
  }
  const local=localPoint(x,o),k=o.aspect??1,normalizer=Math.max(scale*k,scale,Math.hypot(...local),1e-300),y=local.map(v=>v/normalizer),a=scale/normalizer,b=scale*k/normalizer;
  const result=farLocal(y,a,b,o.shape),near=nearLocal(y,a,b,o.shape),world=p=>worldVector(p.map(v=>v*normalizer),o).map((v,i)=>v+c[i]);
  return {c,x:[...x],centerDistance,scale,d:NaN,r:NaN,u,near:world(near),far:world(result.point),hXA:distance(y,near)*normalizer,hAX:result.R*normalizer,R:result.R*normalizer,nonunique:result.nonunique};
}
function generalNodes(o,p,n,split=[]){
  if(o.type==='ball'||o.type==='trapezoid'&&o.core===1)return [{r:o.a,lw:0}];
  if(o.type!=='bell'){
    if(!split.length)return quadrature(o,p,n);
    const boundedProfile=bounded(o),lo=o.type==='trapezoid'?o.core:0,hi=boundedProfile?1:o.type==='gaussian'?Math.sqrt(2*(p+12*Math.sqrt(p+1)+50)):p+14*Math.sqrt(p+1)+60;
    const count=boundedProfile?1:Math.ceil(hi/2),edges=[lo,hi,...split.map(r=>r/o.a),...Array.from({length:count-1},(_,i)=>hi*(i+1)/count)].filter(v=>v>=lo&&v<=hi).sort((a,b)=>a-b),out=[];
    for(let i=1;i<edges.length;i++)if(edges[i]>edges[i-1])out.push(...nodesBetween(0,1,Math.max(48,n), (v,w)=>{
      const from=edges[i-1],span=edges[i]-from,t=from===0?span*v**4:from+span*v;w*=from===0?4*span*v**3:span;
      const logDensity=o.type==='gaussian'?Math.log(t)-t*t/2:o.type==='exponential'?-t:o.type==='parabola'?Math.log(2*t):o.type==='cosine'?Math.log(Math.PI/2*Math.sin(Math.PI*t)):o.type==='trapezoid'?-Math.log1p(-o.core):0;
      return {r:o.a*t,lw:Math.log(w)+logDensity};
    }));return out;
  }
  const power=4/(1-p/o.q),endPower=4*o.q;
  const edges=[0,1,...split.map(r=>{const la=-logadd(0,o.q*Math.log(r/o.a)),lmt=Math.log(-Math.expm1(la/power));return -Math.expm1(lmt/endPower);})].filter(v=>Number.isFinite(v)&&v>=0&&v<=1).sort((a,b)=>a-b),out=[];
  for(let i=1;i<edges.length;i++)if(edges[i]>edges[i-1])out.push(...nodesBetween(edges[i-1],edges[i],Math.max(128,n),(v,w)=>{
    const le=endPower*Math.log1p(-v),lt=Math.log1p(-Math.exp(le)),u=-power*lt;
    const correction=u>1e-8?Math.log(-Math.expm1(-u)):Math.log(power)+le;
    return {lr:Math.log(o.a)+(u+correction)/o.q,base:p*Math.log(o.a)+3*lt+Math.log(w*power*endPower)+(endPower-1)*Math.log1p(-v)+p/o.q*correction};
  }));return out;
}
export function metric(x,o,p){
  const c=o.c??[o.x,o.y],d=distance(x,c);
  if(!o.a)return {D:d,derivative:1,g:d?x.map((t,i)=>(t-c[i])/d):[0,0]};
  if(o.reduced){const v=radial(d,o,p);return {...v,g:d?x.map((t,i)=>v.derivative*(t-c[i])/d):[0,0]};}
  const local=localPoint(x,o),k=isSpherical(o)?1:o.aspect??1;
  if(p===Infinity){const n=Math.max(o.a*k,o.a,Math.hypot(...local),1e-300),v=farLocal(local.map(v=>v/n),o.a/n,o.a*k/n,o.shape);return {D:v.R*n,g:worldVector(v.g,o)};}
  let integral=-Infinity;const values=[];
  const major=Math.max(1,k),minor=Math.min(1,k),minorX=Math.abs(local[k>1?0:1]),critical=major===minor?0:minor*minorX/(major*major-minor*minor);
  const nodes=o.shape==='ellipse'&&critical>0?generalNodes(o,p,o.quadOrder??64,[critical]):o.nodes;
  for(const node of nodes){
    let v,logR,mass;
    if(node.lr!==undefined){
      v=farLocal(local.map(t=>t*Math.exp(-node.lr)),1,k,o.shape);logR=node.lr+Math.log(v.R);mass=node.base+p*Math.log(v.R);
    }else{
      const n=Math.max(node.r*k,node.r,Math.hypot(...local),1e-300);v=farLocal(local.map(t=>t/n),node.r/n,node.r*k/n,o.shape);logR=Math.log(n)+Math.log(v.R);mass=p*logR+node.lw;
    }
    integral=logadd(integral,mass);values.push({mass,logR,g:v.g});
  }
  const logD=integral/p,g=[0,0];
  for(const v of values){const weight=Math.exp(v.mass-v.logR-(p-1)*logD);for(let i=0;i<2;i++)g[i]+=weight*v.g[i];}
  return {D:Math.exp(logD),g:worldVector(g,o)};
}

