const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],nf=(v,n=3)=>!Number.isFinite(v)?v===Infinity?'∞':'-':v.toLocaleString('ru-RU',{maximumFractionDigits:n,minimumFractionDigits:n}),pt=(v,n=3)=>'('+v.map(x=>nf(x,n)).join('; ')+')',pn=p=>p===Infinity?'∞':nf(p,p%1?2:0);
const app={objects:M.mixedObjects().map(o=>o.id===3?{...o,type:'triangle'}:o),selected:1,p:2,solver:{...M.solverDefaults},alpha:.4,view:'surfaces',tool:'select',x:[8,7],start:[8,7],hover:null,runs:[],selectedRun:null,display:{grid:true,labels:true,contours:false,paths:true,gradient:true,step:true,rays:'none'}};
app.model=M.createModel(app.objects,app.p,64,app.solver.reduction);
const scene=new MathSpace($('#stage'));let runCounter=0,activeId=null,running=false,dirty=true,raf=0,visible=true,scrubIndex=null,multiQueue=[],multiTimer=0,toastTimer=0,drag=null;
const worker=new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE],{type:'text/javascript'})));
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
function safe(fn){try{return fn();}catch(error){toast(error.message);return false;}}
function schedule(){dirty=true;if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(()=>{raf=0;if(dirty)render();});}
function pause(){clearTimeout(multiTimer);worker.postMessage({type:'pause'});running=false;$('#play').setAttribute('aria-label','Запустить');$('#play').setAttribute('aria-pressed','false');}
function selected(){return app.objects.find(o=>o.id===app.selected)||app.objects[0];}
function currentTrace(){const run=app.selectedRun;return run?.trace[scrubIndex===null?run.trace.length-1:Math.min(scrubIndex,run.trace.length-1)];}
function closeEditor(){$('#object-editor').hidden=true;}
function showEditor(){
  $('#objects-panel').hidden=true;$('#objects-toggle').setAttribute('aria-expanded','false');$('#object-editor').hidden=false;
}
function showAnalysis(open=true){
  $('#analysis-panel').hidden=!open;$('.workbench').classList.toggle('has-analysis',open);$('#analysis-toggle').setAttribute('aria-expanded',String(open));if(open)setAnalysisWidth($('#analysis-panel').getBoundingClientRect().width);else endAnalysisResize();schedule();
  if(open&&matchMedia('(max-width:680px) and (max-height:750px)').matches)requestAnimationFrame(()=>{if(!$('#analysis-panel').hidden)$('#analysis-panel').scrollIntoView({block:'end'});});
}
$('#objects-toggle').addEventListener('click',()=>{const open=$('#objects-panel').hidden;closeEditor();$('#objects-panel').hidden=!open;$('#objects-toggle').setAttribute('aria-expanded',String(open));});
$('#objects-close').addEventListener('click',()=>{$('#objects-panel').hidden=true;$('#objects-toggle').setAttribute('aria-expanded','false');$('#objects-toggle').focus();});
$('#editor-close').addEventListener('click',()=>{closeEditor();$('#stage').focus({preventScroll:true});});
$('#analysis-toggle').addEventListener('click',()=>showAnalysis($('#analysis-panel').hidden));
$('#analysis-close').addEventListener('click',()=>{showAnalysis(false);$('#analysis-toggle').focus();});
const analysisSplitter=$('#analysis-splitter'),workbench=$('.workbench');
let analysisDrag=null;
function analysisBounds(){
  const style=getComputedStyle(workbench),min=parseFloat(style.getPropertyValue('--analysis-min'));
  return {min,max:Math.max(min,workbench.getBoundingClientRect().width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-520)};
}
function setAnalysisWidth(width){
  if(matchMedia('(max-width:900px)').matches)return;
  const {min,max}=analysisBounds(),value=Math.round(Math.max(min,Math.min(max,width)));
  workbench.style.setProperty('--analysis-width',value+'px');
  for(const [key,v] of Object.entries({min,max,now:value}))analysisSplitter.setAttribute('aria-value'+key,String(Math.round(v)));
}
function endAnalysisResize(e){
  if(!analysisDrag||(e&&e.pointerId!==analysisDrag.id))return;
  const id=analysisDrag.id;analysisDrag=null;workbench.classList.remove('resizing-analysis');
  if(analysisSplitter.hasPointerCapture(id))analysisSplitter.releasePointerCapture(id);
}
analysisSplitter.addEventListener('pointerdown',e=>{
  if(analysisDrag||e.button!==0||matchMedia('(max-width:900px)').matches)return;
  e.preventDefault();analysisSplitter.focus();analysisDrag={id:e.pointerId,x:e.clientX,width:$('#analysis-panel').getBoundingClientRect().width};
  analysisSplitter.setPointerCapture(e.pointerId);workbench.classList.add('resizing-analysis');
});
analysisSplitter.addEventListener('pointermove',e=>{if(analysisDrag&&analysisDrag.id===e.pointerId)setAnalysisWidth(analysisDrag.width+analysisDrag.x-e.clientX);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])analysisSplitter.addEventListener(type,endAnalysisResize);
analysisSplitter.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)||matchMedia('(max-width:900px)').matches)return;
  e.preventDefault();const {min,max}=analysisBounds(),width=$('#analysis-panel').getBoundingClientRect().width;
  setAnalysisWidth(e.key==='Home'?min:e.key==='End'?max:width+(e.key==='ArrowLeft'?20:-20));
});
new ResizeObserver(()=>{if(!$('#analysis-panel').hidden)setAnalysisWidth($('#analysis-panel').getBoundingClientRect().width);}).observe(workbench);

$('#display-close').addEventListener('click',()=>{$('#display-settings').open=false;$('#display-settings summary').focus();});
function dismissEditor(e){
  if(!$('#object-editor').contains(e.target)&&!$('#stage').contains(e.target)&&!e.target.closest('[data-object-id],[data-table-object]'))closeEditor();
}
document.addEventListener('focusin',dismissEditor);
document.addEventListener('click',e=>{
  dismissEditor(e);
  for(const id of['display-settings','solver-settings'])if(!$('#'+id).contains(e.target))$('#'+id).open=false;
  if(!$('#objects-panel').contains(e.target)&&!$('#objects-toggle').contains(e.target)){$('#objects-panel').hidden=true;$('#objects-toggle').setAttribute('aria-expanded','false');}
});
document.addEventListener('keydown',e=>{
  $('#stage').classList.remove('pointer-focus');
  if(e.key==='Escape'){
    const editorOpen=!$('#object-editor').hidden;closeEditor();showAnalysis(false);$('#objects-panel').hidden=true;$('#objects-toggle').setAttribute('aria-expanded','false');$('#display-settings').open=false;$('#solver-settings').open=false;
    if(editorOpen)$('#stage').focus({preventScroll:true});
  }
});
function setTool(tool){if(tool!=='select'){closeEditor();$('#objects-panel').hidden=true;$('#objects-toggle').setAttribute('aria-expanded','false');}app.tool=tool;$$('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));$('#stage-hint').innerHTML={select:'Перетащите центр объекта. Колесо: масштаб; зажатое колесо: вращение.',add:'Щёлкните в плоскости, чтобы добавить объект',start:'Щёлкните в плоскости, чтобы задать '+mathHTML('x_0'),pan:'Перетаскивайте пространство; колесо меняет масштаб'}[tool];$('#stage').style.cursor=tool==='pan'?'grab':'crosshair';}
function syncEditor(){
  const o=selected();$('#editor-title').innerHTML=mathHTML('A_{'+o.id+'}');for(const key of['x','y','a','b','type','core','q'])$('#obj-'+key).value=o[key];$('#obj-shape').value=M.shapeOf(o).shape;$('#obj-aspect').value=M.shapeOf(o).aspect;$('#obj-angle').value=M.shapeOf(o).angle;$('#geometry-control').hidden=M.isSpherical(o);$('#scale-slider').value=Math.min(10,o.a);$('#core-control').hidden=o.type!=='trapezoid';$('#q-control').hidden=o.type!=='bell';$('#delete').disabled=app.objects.length<=1;
}
function syncObjects(){
  $('#object-count').textContent=app.objects.length;
  $('#object-list').innerHTML=app.objects.map(o=>`<button class="object-row" data-object-id="${o.id}" aria-pressed="${o.id===app.selected}" style="--object:${colorFor(o)}"><i class="object-dot"></i><span class="object-name">${mathHTML('A_{'+o.id+'}')}</span><span class="object-type">${M.profiles[o.type]}${M.isSpherical(o)?'':' · '+M.shapes[o.shape]}</span><span class="object-position">${nf(o.x,1)}; ${nf(o.y,1)}</span></button>`).join('');
  syncEditor();
}
function setSelected(id){const changed=app.selected!==id;app.selected=id;syncObjects();showEditor();if(changed)$('#object-editor').scrollTop=0;schedule();}
function invalidate(clearRuns=true){
  pause();activeId=null;multiQueue=[];scrubIndex=null;app.selectedRun=null;
  if(clearRuns)app.runs=[];
  app.x=[...app.start];app.model=M.createModel(app.objects,app.p,64,app.solver.reduction);scene.changed();$('#solver-status').textContent='Параметры изменены · p = '+pn(app.p)+'. Нужен новый расчёт: «До точности» или «Запустить».';
  $('#p').value=app.p===Infinity?'':app.p;$('#infinity').setAttribute('aria-pressed',String(app.p===Infinity));$$('[data-p]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.p)===app.p)));syncObjects();schedule();
}
function changeObject(key,value){
  const o=selected(),next={...o,[key]:value};M.validate(app.objects.map(v=>v.id===o.id?next:v),app.p);Object.assign(o,next);invalidate();
}
function setP(p){M.validate(app.objects,p);app.p=p;invalidate(false);}
function setStart(start,announce=true){
  if(!start.every(Number.isFinite)||start.some(v=>Math.abs(v)>1e6))throw Error('Начальная точка должна быть в диапазоне ±10⁶.');
  closeEditor();
  pause();activeId=null;multiQueue=[];app.start=start.map(v=>Number(v.toPrecision(12)));app.x=[...app.start];app.selectedRun=null;scrubIndex=null;$('#start-x').value=app.start[0];$('#start-y').value=app.start[1];$('#solver-status').innerHTML='Начальная точка '+mathHTML('x_0')+' = '+pt(app.start);if(announce)toast('Новый старт '+pt(app.start));schedule();
}
function addObject(point,copy=false){
  const id=Math.max(0,...app.objects.map(o=>o.id))+1,source=copy?selected():{type:'triangle',a:1.5,b:1,core:.35,q:4,shape:'circle',aspect:1,angle:0};
  const next={...source,id,x:Number(point[0].toPrecision(10)),y:Number(point[1].toPrecision(10))};M.validate([...app.objects,next],app.p);app.objects.push(next);app.selected=id;invalidate();showEditor();$('#object-editor').scrollTop=0;setTool('select');toast('Добавлен A'+id);
}
function syncSolverControls(){for(const key of ['algorithm','eta0','tolerance','maxIterations'])$('#'+key).value=app.solver[key];$('#reduction').checked=app.solver.reduction;}
function solverParameters(){const solver=M.solverOptions({algorithm:$('#algorithm').value,reduction:$('#reduction').checked,eta0:Number($('#eta0').value),tolerance:Number($('#tolerance').value),maxIterations:Number($('#maxIterations').value)}),speed=Number($('#speed').value);if(!Number.isFinite(speed)||speed<1||speed>120)throw Error('Скорость: 1…120 шагов в секунду.');return {...solver,speed};}
function startRun(mode='play',start=app.start){
  if(app.model.problem)throw Error(app.model.problem);const {speed,...solver}=solverParameters();
  pause();const id=++runCounter;activeId=id;const run={id,start:[...start],p:app.p,solver,color:M.palette[(id-1)%M.palette.length],trace:[],k:0,done:false,tolerance:solver.tolerance};app.runs.push(run);app.selectedRun=run;app.start=[...start];app.x=[...start];scrubIndex=null;$('#start-x').value=start[0];$('#start-y').value=start[1];
  worker.postMessage({type:'init',runId:id,objects:app.objects,p:app.p,start,solver});worker.postMessage({type:mode,speed});running=mode!=='step';$('#play').setAttribute('aria-label',running?'Пауза':'Запустить');$('#play').setAttribute('aria-pressed',String(running));$('#solver-status').textContent='Расчёт '+id+' · p = '+pn(app.p);schedule();
}
function continueRun(mode){
  if(!app.selectedRun||app.selectedRun.id!==activeId||app.selectedRun.done||scrubIndex!==null)return startRun(mode);
  const {speed}=solverParameters();worker.postMessage({type:mode,speed});running=mode!=='step';$('#play').setAttribute('aria-label',running?'Пауза':'Запустить');$('#play').setAttribute('aria-pressed',String(running));schedule();
}
worker.onmessage=e=>{
  const d=e.data,run=app.runs.find(r=>r.id===d.runId);if(!run||d.runId!==activeId||app.selectedRun?.id!==d.runId)return;
  if(d.error){pause();toast(d.error);$('#solver-status').textContent=d.error;return;}
  run.trace.push(...d.tail);run.x=d.x;run.k=d.k;run.done=d.done;run.reason=d.reason;run.best=d.best;app.selectedRun=run;
  if(scrubIndex===null)app.x=[...d.x];
  if(d.done){running=false;$('#play').setAttribute('aria-label','Запустить');$('#play').setAttribute('aria-pressed','false');const value=run.trace.at(-1);$('#solver-status').textContent=(d.reason||'Завершено')+' · '+d.k+' шагов · ε = '+nf(value.gap,8);
    if(multiQueue.length){const next=multiQueue.shift();multiTimer=setTimeout(()=>safe(()=>startRun('finish',next)),80);}
  }else $('#solver-status').textContent=(running?'Выполняется':'Шаг выполнен')+' · запуск '+run.id+' · '+M.algorithms[run.solver.algorithm];
  schedule();
};
worker.onerror=e=>{pause();toast('Ошибка вычислителя: '+e.message);};
function profilePlot(o){
  const W=270,H=111,x0=24,y0=85,maxR=Math.max(o.a,M.radius(.03,o),M.radius(app.alpha,o),.5)*1.04,points=[];
  for(let i=0;i<=150;i++){const r=maxR*i/150;points.push([x0+r/maxR*230,y0-M.membership(r,o)*67]);}
  const r=M.radius(app.alpha,o),p=[x0+r/maxR*230,y0-app.alpha*67];
  $('#profile-chart').innerHTML=`<path class="svg-plot-grid" d="M24 18V85H254M24 ${p[1]}H254"/><path d="${polyline(points)}" fill="none" stroke="${colorFor(o)}" stroke-width="1.5"/><circle cx="${p[0]}" cy="${p[1]}" r="2.7" fill="${colorFor(o)}"/><text x="8" y="20" class="svg-plot-label">1</text><text x="10" y="89" class="svg-plot-label">0</text><text x="23" y="102" class="svg-plot-label">0</text><text x="254" y="102" class="svg-plot-label" text-anchor="end">${nf(maxR,1)}</text>${mathSvg(M.isSpherical(o)?'r':'u',259,73,18,25)}${mathSvg(String.raw`\pi`,7,-4,18,25)}`;
  $('#profile-formula').innerHTML=mathHTML(M.spatialFormula(o));
}
function historyChart(selector,run,key,log=false){
  const all=run?.trace||[],data=all.filter((_,i)=>i%Math.max(1,Math.floor(all.length/700))===0||i===all.length-1),svg=$(selector);
  if(!data.length){svg.innerHTML='<text x="20" y="65" class="svg-plot-label">Запустите алгоритм, чтобы увидеть историю</text>';return;}
  const values=data.map(t=>log?Math.log10(Math.max(t[key],1e-12)):t[key]);let lo=Math.min(...values),hi=Math.max(...values);if(hi-lo<1e-9){hi+=.5;lo-=.5;}
  const minX=0,maxX=Math.max(1,all.at(-1).k),path=polyline(data.map((t,i)=>[48+t.k/maxX*455,102-(values[i]-lo)/(hi-lo)*88]));let grid='';
  for(let i=0;i<3;i++){const value=lo+(hi-lo)*i/2,y=102-i*44;grid+=`<path class="svg-plot-grid" d="M48 ${y}H505"/>${log?mathSvg('10^{'+nf(value,1).replace(',','{,}')+'}',0,y-11,42,28):`<text x="40" y="${y+3}" class="svg-plot-label" text-anchor="end">${nf(value,2)}</text>`}`;}
  svg.innerHTML=grid+`<path class="svg-plot-line" stroke="${run.color}" d="${path}"/><text x="48" y="121" class="svg-plot-label">0</text><text x="505" y="121" class="svg-plot-label" text-anchor="end">k = ${maxX}</text>`;
  if(scrubIndex!==null){const t=all[scrubIndex],x=48+t.k/maxX*455;svg.innerHTML+=`<path class="svg-axis" stroke-dasharray="2 3" d="M${x} 12V104"/>`;}
}
function render(){
  dirty=false;const ev=M.evaluate(app.x,app.model,true),o=selected(),obj=app.model.objects.find(v=>v.id===o.id),term=ev.terms.find(v=>v.id===o.id),run=app.selectedRun,t=currentTrace();
  const radial=!app.model.general&&app.solver.reduction;
  const R=radial?String.raw`\lVert x-c_j\rVert+r_j(\alpha)`:String.raw`R_j(x,\alpha)`;
  const objective=app.p===Infinity?(radial?String.raw`F_\infty(x)=\sum_j\beta_j\left(\lVert x-c_j\rVert+\sup_\alpha r_j(\alpha)\right)`:String.raw`F_\infty(x)=\sum_j\beta_j\sup_\alpha R_j(x,\alpha)`):String.raw`F_p(x)=\sum_j\beta_j\left(\int_0^1\left(${R}\right)^p\,d\alpha\right)^{1/p}`;
  $('#criterion-formula').innerHTML='Взвешенная сумма расстояний до нечётких объектов.'+mathHTML(objective,true);
  const shownGap=t?t.gap:ev.gap;
  $('#bound-tip').innerHTML='Верхняя оценка отклонения значения критерия от минимума: '+mathHTML(app.model.general?String.raw`\varepsilon\le\lVert g\rVert\frac{2F_p}{\sum_j\beta_j}`:String.raw`\varepsilon\le\lVert g\rVert\max_j d_j`)+'. Не учитывает погрешность квадратуры.';
  $('#solver-method-note').textContent='Начальный шаг задаёт величину перемещения, точность - условие остановки. Скорость меняет только темп воспроизведения. На отдельных шагах критерий может возрастать.';
  $('#coordinates-label').innerHTML=(!run?'Старт ':scrubIndex===null&&run.done&&shownGap<=run.tolerance?'Решение ':'Итерация ')+mathHTML(!run?'x_0':scrubIndex===null&&run.done&&shownGap<=run.tolerance?'x^*':'x^k');
  $('#coordinates-tip').textContent=!run?'Начальная точка, из которой запускается метод.':scrubIndex===null&&run.done&&shownGap<=run.tolerance?'Точка, в которой достигнута заданная точность по значению критерия.':'Точка на отображаемой итерации метода; при просмотре истории показывает выбранный шаг.';
  $('#total').textContent=nf(ev.F,6);$('#coordinates').textContent=pt(app.x,6);$('#coordinates').title=pt(app.x,10);$('#bound').textContent=Number.isFinite(shownGap)&&shownGap>0&&shownGap<.0001?shownGap.toExponential(2).replace('.',','):nf(shownGap,5);$('#norm').textContent=ev.norm>0&&ev.norm<.0001?ev.norm.toExponential(2).replace('.',','):nf(ev.norm,6);$('#iteration').textContent=scrubIndex!==null?t?.k||0:run?.k||0;$('#alpha-value').textContent=nf(app.alpha,2);
  const geometry=M.cutGeometry(o,app.x,app.alpha);$('#selected-radius').textContent=nf(geometry.r);$('#selected-d').textContent=nf(geometry.d);$('#selected-R').textContent=nf(geometry.R);$('#selected-distance').textContent=nf(term?.D??Infinity);$('#selected-m').textContent=nf(obj.m);$('#selected-s').textContent=nf(obj.s2);
  $('#issue').hidden=!app.model.problem;$('#issue').textContent=app.model.problem;for(const id of['step','play','finish','multi'])$('#'+id).disabled=!!app.model.problem;
  $('#show-step').disabled=!!app.model.problem;
  const F=ev.F;$('#contribution-rows').innerHTML=app.objects.map(v=>{const a=ev.terms.find(t=>t.id===v.id),geo=M.cutGeometry(v,app.x,app.alpha),r=geo.r,d=geo.d,share=a&&Number.isFinite(F)&&F>0?a.contribution/F:0;return `<tr data-selected="${v.id===app.selected}" style="--object:${colorFor(v)}"><td><button data-table-object="${v.id}"><i class="object-dot"></i>${mathHTML('A_{'+v.id+'}')}</button></td><td>${M.profiles[v.type]}${M.isSpherical(v)?'':' · '+M.shapes[v.shape]}</td><td>${nf(v.b,2)}</td><td>${nf(r)}</td><td>${nf(d)}</td><td>${nf(d+r)}</td><td>${nf(geo.R)}</td><td>${nf(a?.D??Infinity)}</td><td>${nf(a?.contribution??Infinity)}</td><td><i class="share-bar" style="width:${share*75}px"></i>${nf(share*100,1)}%</td></tr>`;}).join('');
  profilePlot(o);historyChart('#cost-chart',run,'F');historyChart('#gap-chart',run,'gap',true);
  $('#scrub').max=Math.max(0,(run?.trace.length||1)-1);$('#scrub').value=scrubIndex===null?(run?.trace.length||1)-1:scrubIndex;$('#scrub-value').textContent=scrubIndex===null?run?.k||0:t?.k||0;$('#runs-count').textContent=app.runs.length;
  $('#run-list').innerHTML=app.runs.length?app.runs.map(r=>{const end=r.trace.at(-1);return `<button class="run-card" data-run-id="${r.id}" data-selected="${r===run}"><div><span style="color:${r.color}">Запуск ${r.id}</span><span>p = ${pn(r.p)}</span></div><small>${M.algorithms[r.solver.algorithm]} · ${mathHTML(String.raw`\eta_0`)} = ${nf(r.solver.eta0,2)} · ${r.solver.reduction?'с редукцией':'без редукции'}</small><small>${mathHTML('x_0')} = ${pt(r.start,2)}</small><small>x = ${pt(end?.x||r.start,6)}</small><small>F = <strong>${nf(end?.F??NaN,6)}</strong> · k = ${r.k}</small>${r.best?`<small>Лучшая F = ${nf(r.best.F,6)} при x = ${pt(r.best.x,6)}, k = ${r.best.k}</small>`:''}<small>${r.done?r.reason||'Завершено':'Остановлен / выполняется'}</small></button>`;}).join(''):'<p class="empty">Здесь появятся отдельные запуски с их стартами, настройками и результатами.</p>';
  app.iteration=t?.k??run?.k??0;scene.render(app);
}
function tab(name){showAnalysis();$$('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===name)));for(const v of['contributions','convergence','runs'])$('#tab-'+v).hidden=v!==name;schedule();}
function loadExample(name){
  let objects=M.initialObjects();app.p=2;
  if(name==='wide')objects[1].a=6;
  if(name==='gaussian'||name==='center')objects.forEach(o=>o.type='gaussian');
  if(name==='center')objects.forEach((o,j)=>o.b=[4,1,1][j]);
  if(name==='two'){objects=objects.slice(0,2);objects[1].a=3;objects.forEach(o=>o.b=1);}
  if(name==='mixed')objects=M.mixedObjects();
  if(name==='anisotropic')objects=M.initialObjects().map((o,i)=>({...o,shape:['ellipse','rectangle','ellipse'][i],aspect:[2.5,.5,1.7][i],angle:[30,-20,75][i],type:i===0?'gaussian':'triangle'}));
  app.objects=objects;app.selected=objects[0].id;app.x=[8,7];app.start=[8,7];$('#p').value=2;$('#infinity').setAttribute('aria-pressed','false');$('#start-x').value=8;$('#start-y').value=7;invalidate();scene.fit(objects);$('#example-dialog').close();setTool('select');schedule();
}
$('#obj-shape').innerHTML=Object.entries(M.shapes).map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
$('#obj-type').innerHTML=Object.entries(M.profiles).map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
$('#object-list').addEventListener('click',e=>{const b=e.target.closest('[data-object-id]');if(b)setSelected(Number(b.dataset.objectId));});
$('#contribution-rows').addEventListener('click',e=>{const b=e.target.closest('[data-table-object]');if(b)setSelected(Number(b.dataset.tableObject));});
for(const key of['x','y','a','b','core','q','aspect','angle'])$('#obj-'+key).addEventListener('change',e=>safe(()=>changeObject(key,Number(e.target.value)))===false&&syncEditor());
$('#obj-shape').addEventListener('change',e=>safe(()=>changeObject('shape',e.target.value))===false&&syncEditor());
$('#obj-type').addEventListener('change',e=>safe(()=>changeObject('type',e.target.value)));
$('#scale-slider').addEventListener('input',e=>safe(()=>changeObject('a',Number(e.target.value))));
$('#add').addEventListener('click',()=>{setTool('add');$('#stage').focus();toast('Щёлкните в пространстве для добавления объекта');});
$('#duplicate').addEventListener('click',()=>safe(()=>{const o=selected();addObject([o.x+1,o.y+1],true);}));
function remove(){if(app.objects.length<=1)return toast('Для задачи нужен хотя бы один объект');app.objects=app.objects.filter(v=>v.id!==app.selected);app.selected=app.objects[0].id;closeEditor();invalidate();}
$('#delete').addEventListener('click',remove);
$('#p').addEventListener('change',e=>{if(safe(()=>setP(Number(e.target.value)))===false)e.target.value=app.p===Infinity?'':app.p;});$('#infinity').addEventListener('click',()=>safe(()=>setP(app.p===Infinity?2:Infinity)));$$('[data-p]').forEach(b=>b.addEventListener('click',()=>safe(()=>setP(Number(b.dataset.p)))));
$('#alpha').addEventListener('input',e=>{app.alpha=Number(e.target.value);schedule();});
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>{app.view=b.dataset.view;$$('[data-view]').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));$('#scene-equation').innerHTML=mathHTML(app.view==='landscape'?String.raw`z\propto F_p(x)-\min F_p`:app.view==='levels'?String.raw`A_j(\alpha)\subset\mathbb R^2`:String.raw`z=\pi_j(x,y)`);$('#scene-description').textContent=app.view==='landscape'?'Поле критерия на видимой сетке':app.view==='levels'?'Проекция α-уровневых множеств на координатную плоскость':'Высота - возможность положения';scene.changed();schedule();}));
$$('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
$('#rays').addEventListener('change',e=>{app.display.rays=e.target.value;schedule();});
for(const key of['grid','labels','contours','paths','gradient','step'])$('#show-'+key).addEventListener('change',e=>{app.display[key]=e.target.checked;schedule();});
$('#algorithm').innerHTML=Object.entries(M.algorithms).map(([value,label])=>`<option value="${value}">${label}</option>`).join('');syncSolverControls();
for(const id of ['algorithm','reduction','eta0','tolerance','maxIterations'])$('#'+id).addEventListener('change',()=>{if(safe(()=>{const {speed,...solver}=solverParameters();app.solver=solver;invalidate(false);})===false)syncSolverControls();});
for(const [id,key]of [['height','heightFactor'],['elevation','elevation'],['azimuth','azimuth']])$('#'+id).addEventListener('input',e=>{scene[key]=Number(e.target.value);scene.fit(app.objects);schedule();});
$('#fit').addEventListener('click',()=>{scene.fit(app.objects,[app.start,app.x]);schedule();});$('#top-view').addEventListener('click',()=>{scene.elevation=scene.elevation===90?25:90;$('#elevation').value=scene.elevation;$('#top-view').textContent=scene.elevation===90?'Изометрия':'Сверху';scene.fit(app.objects);schedule();});
$('#new-run').addEventListener('click',()=>safe(()=>setStart([Number($('#start-x').value),Number($('#start-y').value)])));
for(const id of['start-x','start-y'])$('#'+id).addEventListener('change',()=>safe(()=>setStart([Number($('#start-x').value),Number($('#start-y').value)],false)));
$('#step').addEventListener('click',()=>safe(()=>{multiQueue=[];pause();continueRun('step');}));$('#finish').addEventListener('click',()=>safe(()=>{multiQueue=[];continueRun('finish');}));$('#play').addEventListener('click',()=>safe(()=>{multiQueue=[];if(running)pause();else continueRun('play');}));
$('#multi').addEventListener('click',()=>safe(()=>{const b=scene.bounds;multiQueue=[[b.xmin,b.ymax],[b.xmax,b.ymin]];startRun('finish',app.start);tab('runs');}));
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
$('#scrub').addEventListener('input',e=>{pause();scrubIndex=Number(e.target.value);const t=currentTrace();if(t)app.x=[...t.x];schedule();});$('#live-end').addEventListener('click',()=>{scrubIndex=null;if(app.selectedRun?.trace.length)app.x=[...app.selectedRun.trace.at(-1).x];schedule();});
$('#run-list').addEventListener('click',e=>{const b=e.target.closest('[data-run-id]');if(!b)return;pause();const run=app.runs.find(r=>r.id===Number(b.dataset.runId));if(run.p!==app.p||JSON.stringify(run.solver)!==JSON.stringify(app.solver)){app.p=run.p;app.solver={...run.solver};syncSolverControls();invalidate(false);}app.selectedRun=run;scrubIndex=null;app.x=[...(run.trace.at(-1)?.x||run.start)];app.start=[...run.start];$('#start-x').value=run.start[0];$('#start-y').value=run.start[1];$('#solver-status').textContent='Просмотр запуска '+run.id+' · p = '+pn(run.p)+' · '+(run.reason||'Остановлен');schedule();});
$('#clear-runs').addEventListener('click',()=>invalidate());
$('#examples').addEventListener('click',()=>$('#example-dialog').showModal());$$('[data-example]').forEach(b=>b.addEventListener('click',()=>loadExample(b.dataset.example)));
function openInfo(id){
  for(const other of ['help','model-dialog'])if($('#'+other).open)$('#'+other).close();
  $('#'+id).showModal();
}
$('#help-open').addEventListener('click',()=>openInfo('help'));
for(const id of ['help-footer','model-from-help'])$('#'+id).addEventListener('click',()=>openInfo('model-dialog'));
for(const id of ['help','model-dialog','criterion-dialog']){
  const dialog=$('#'+id);
  const onBackdrop=e=>{
    const r=dialog.getBoundingClientRect();
    return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);
  };
  let pressedBackdrop=false;
  dialog.addEventListener('pointerdown',e=>{pressedBackdrop=onBackdrop(e);});
  dialog.addEventListener('pointercancel',()=>{pressedBackdrop=false;});
  dialog.addEventListener('click',e=>{if(pressedBackdrop&&onBackdrop(e))dialog.close();pressedBackdrop=false;});
}

$('#theme').addEventListener('click',()=>{const dark=document.body.dataset.theme!=='dark';document.body.dataset.theme=dark?'dark':'light';$('#theme').setAttribute('aria-pressed',String(dark));$('#theme').setAttribute('aria-label',dark?'Светлая тема':'Тёмная тема');schedule();});
$('#export').addEventListener('click',async()=>{
  const data={version:2,revision:11,objects:app.objects,p:app.p===Infinity?'Infinity':app.p,start:app.start,alpha:app.alpha,solver:{...app.solver}},blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  try{
    if(window.showSaveFilePicker){
      const handle=await window.showSaveFilePicker({suggestedName:'weber-scene.json',types:[{description:'Сценарий Вебера (JSON)',accept:{'application/json':['.json']}}]}),file=await handle.createWritable();
      await file.write(blob);await file.close();
    }else{
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='weber-scene.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      toast('Папку сохранения определяет браузер. Включите в его настройках запрос места для каждого скачивания.');
    }
  }catch(error){if(error.name!=='AbortError')toast('Не удалось сохранить: '+error.message);}
});
$('#import').addEventListener('click',()=>$('#file-input').click());$('#file-input').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>2e6)throw Error('Сценарий должен быть не больше 2 МБ.');const data=JSON.parse(await file.text()),p=data.p==='Infinity'?Infinity:data.p,solver=M.solverOptions(data.solver);M.validate(data.objects,p);if(!Array.isArray(data.start)||data.start.length!==2||!data.start.every(Number.isFinite)||data.start.some(v=>Math.abs(v)>1e6)||!Number.isFinite(data.alpha)||data.alpha<.01||data.alpha>1)throw Error('Некорректная начальная точка или α.');app.objects=data.objects.map(o=>({id:o.id,x:o.x,y:o.y,a:o.a,b:o.b,type:o.type,core:o.core,q:o.q,...M.shapeOf(o)}));app.selected=app.objects[0].id;app.p=p;app.solver=solver;syncSolverControls();app.alpha=data.alpha;app.start=[...data.start];app.x=[...data.start];$('#p').value=p===Infinity?'':p;$('#infinity').setAttribute('aria-pressed',String(p===Infinity));$('#alpha').value=app.alpha;$('#start-x').value=app.start[0];$('#start-y').value=app.start[1];invalidate();scene.fit(app.objects);schedule();toast('Сценарий загружен');}catch(error){toast('Не удалось открыть: '+error.message);}e.target.value='';
});
function position(e){const r=$('#stage').getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
function previewAt(p){const show=app.tool==='select'&&!app.model.problem&&(app.display.gradient||app.display.step&&!app.selectedRun);if(!show&&!app.hover)return;app.hover=show?scene.floor(...p):null;schedule();}
function hitPoint(p){let hit=null,best=15;for(const o of app.objects){const d=Math.min(M.distance(p,scene.at(o.x,o.y)),M.distance(p,scene.at(o.x,o.y,scene.Z)));if(d<best){hit=o.id;best=d;}}return hit;}
$('#stage').addEventListener('contextmenu',e=>e.preventDefault());
$('#stage').addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault();});
$('#stage').addEventListener('pointerdown',e=>safe(()=>{
  if(e.button!==0&&e.button!==1&&e.button!==2)return;
  e.preventDefault();
  app.hover=null;schedule();
  const p=position(e);$('#stage').classList.add('pointer-focus');$('#stage').focus({preventScroll:true});
  if(e.button===1){
    closeEditor();
    e.preventDefault();const anchor=[scene.width/2,scene.height/2];
    drag={kind:'orbit',p,azimuth:scene.azimuth,elevation:scene.elevation,anchor,pivot:scene.floor(...anchor)};
    $('#stage').style.cursor='grabbing';$('#scene-tooltip').hidden=true;$('#stage').setPointerCapture(e.pointerId);return;
  }
  pause();const world=scene.floor(...p),id=hitPoint(p);
  if(e.button===2||app.tool==='pan'){closeEditor();drag={kind:'pan',p,origin:[...scene.P.origin]};}
  else if(app.tool==='add'){addObject(world);$('#stage').setPointerCapture(e.pointerId);return;}
  else if(app.tool==='start'){setStart(world);return;}
  else if(id){setSelected(id);const o=selected();drag={kind:'object',p,world,object:[o.x,o.y],id,changed:false};}
  else{setStart(world,false);drag={kind:'start'};}
  $('#stage').setPointerCapture(e.pointerId);
}));
$('#stage').addEventListener('pointermove',e=>{
  const p=position(e);if(drag){
    if(drag.kind==='orbit'){
      scene.azimuth=((drag.azimuth+(p[0]-drag.p[0])*.4)%360+360)%360;
      scene.elevation=Math.max(20,Math.min(90,drag.elevation-(p[1]-drag.p[1])*.3));
      scene.P.azimuth=scene.azimuth;scene.P.elevation=scene.elevation;
      const projected=scene.at(...drag.pivot);scene.P.origin=scene.P.origin.map((v,i)=>v+drag.anchor[i]-projected[i]);
      $('#azimuth').value=scene.azimuth;$('#elevation').value=scene.elevation;$('#top-view').textContent=scene.elevation===90?'Изометрия':'Сверху';schedule();
    }
    if(drag.kind==='pan'){scene.P.origin=drag.origin.map((v,i)=>v+p[i]-drag.p[i]);schedule();}
    if(drag.kind==='object')safe(()=>{const world=scene.floor(...p),o=selected(),next={...o,x:Number((drag.object[0]+world[0]-drag.world[0]).toPrecision(10)),y:Number((drag.object[1]+world[1]-drag.world[1]).toPrecision(10))};M.validate(app.objects.map(v=>v.id===o.id?next:v),app.p);Object.assign(o,next);if(!drag.changed){invalidate();drag.changed=true;}app.model=M.createModel(app.objects,app.p,64,app.solver.reduction);scene.changed();syncEditor();schedule();});
    if(drag.kind==='start')safe(()=>setStart(scene.floor(...p),false));return;
  }
  previewAt(p);
  const id=hitPoint(p);$('#stage').style.cursor=id&&app.tool==='select'?'grab':app.tool==='pan'?'grab':'crosshair';
  if(id){const o=app.objects.find(v=>v.id===id),tt=$('#scene-tooltip');tt.textContent='A'+id+' · '+M.profiles[o.type]+' · c = '+pt([o.x,o.y],2);tt.style.left=Math.min(p[0]+13,scene.width-215)+'px';tt.style.top=Math.max(8,p[1]-34)+'px';tt.hidden=false;}else $('#scene-tooltip').hidden=true;
});
function endDrag(e){if(drag?.changed)syncObjects();drag=null;$('#stage').style.cursor=app.tool==='pan'?'grab':'crosshair';if($('#stage').hasPointerCapture(e.pointerId))$('#stage').releasePointerCapture(e.pointerId);}
$('#stage').addEventListener('pointerup',endDrag);$('#stage').addEventListener('pointercancel',endDrag);$('#stage').addEventListener('lostpointercapture',endDrag);$('#stage').addEventListener('pointerleave',()=>{$('#scene-tooltip').hidden=true;app.hover=null;schedule();});
$('#stage').addEventListener('dblclick',e=>safe(()=>{if(!hitPoint(position(e)))addObject(scene.floor(...position(e)));}));
$('#stage').addEventListener('wheel',e=>{e.preventDefault();const p=position(e),factor=Math.exp(-e.deltaY*.001),next=Math.max(.05,Math.min(1e5,scene.P.scale*factor)),f=next/scene.P.scale;scene.P.origin=p.map((v,i)=>v+(scene.P.origin[i]-v)*f);scene.P.scale=next;if(!drag)previewAt(p);schedule();},{passive:false});
$('#stage').addEventListener('keydown',e=>{
  const step=e.shiftKey?1:.1,moves={ArrowRight:[step,0],ArrowLeft:[-step,0],ArrowUp:[0,step],ArrowDown:[0,-step]};
  if(moves[e.key]){e.preventDefault();safe(()=>{const o=selected(),v=moves[e.key],next={...o,x:o.x+v[0],y:o.y+v[1]};M.validate(app.objects.map(a=>a.id===o.id?next:a),app.p);Object.assign(o,next);invalidate();});}
  if(e.key==='Delete'){e.preventDefault();remove();}
  if(e.key==='Escape'){pause();multiQueue=[];setTool('select');toast('Расчёт остановлен');}
});
new IntersectionObserver(es=>{visible=es.at(-1).isIntersecting;if(visible)schedule();else if(raf){cancelAnimationFrame(raf);raf=0;}},{rootMargin:'150px'}).observe($('.space-column'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
window.weberState=()=>({version:2,revision:11,objects:app.objects.map(o=>({...o})),p:app.p,solver:{...app.solver},alpha:app.alpha,x:[...app.x],start:[...app.start],F:M.evaluate(app.x,app.model).F,gap:M.evaluate(app.x,app.model).gap,running,view:app.view,tool:app.tool,selected:app.selected,issue:app.model.problem,runs:app.runs.map(r=>({id:r.id,p:r.p,solver:r.solver,start:r.start,x:r.trace.at(-1)?.x,F:r.trace.at(-1)?.F,k:r.k,done:r.done,reason:r.reason,best:r.best,traceLength:r.trace.length})),webgl:!!scene.gl,viewBounds:{...scene.bounds}});
syncObjects();scene.fit(app.objects);render();

// Escape dismisses a hint until the pointer or keyboard focus leaves its button.
$$('[data-tooltip]').forEach(button=>{
  for(const type of ['pointerenter','focus','pointerleave','blur'])button.addEventListener(type,()=>button.classList.remove('tooltip-dismissed'));
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('[data-tooltip]').forEach(button=>button.classList.add('tooltip-dismissed'));});
