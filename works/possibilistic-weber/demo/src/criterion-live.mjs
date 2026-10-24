(()=>{
  const dialog=document.querySelector('#criterion-dialog'),svg=document.querySelector('#criterion-svg'),canvas=document.querySelector('#criterion-canvas');
  const q=s=>dialog.querySelector(s),all=s=>[...dialog.querySelectorAll(s)];
  const lesson=C.createLesson(),figure=new CriterionFigure(svg,lesson),still=matchMedia('(prefers-reduced-motion: reduce)');
  const fmt=v=>v.toLocaleString('ru-RU',{maximumFractionDigits:3,minimumFractionDigits:3});
  let selected=5,stage=0,collected=new Set(),flight=null,drag=null,frame=0,last=0,touring=false,tourClock=0,visible=true,returnFocus=null,drawing=false;
  q('#criterion-slices').innerHTML=lesson.slices.map(s=>'<button data-level="'+s.k+'" aria-label="Выбрать α = '+fmt(s.alpha)+'" aria-pressed="false">'+s.alpha.toFixed(2).replace('.',',')+'</button>').join('');
  function story(){
    const s=lesson.slices[selected],mass=[...collected].reduce((n,k)=>n+lesson.slices[k].mass,0);
    const content=[
      ['Область, слой за слоем','Высота слоя — степень возможности α. Его контур охватывает все положения, для которых π(z) ≥ α. Внизу срезы широкие, у вершины сужаются. Выдвиньте любой слой: весь дальнейший путь относится именно к нему.',
        'π(z) = exp(−‖z − c‖² / 2a²)<br>A(α) = B̄(c, a√(−2 ln α))',
        [['Выбранный уровень α',fmt(s.alpha)],['Радиус среза r(α)',fmt(s.r)],['Центр / точка x','(0; 0) / (3; 0)']],
        'Кассета показывает 12 выбранных горизонтальных сечений. Это не 12 отдельных объектов. Возможность не является вероятностью.'],
      ['Измерить до дальней границы','На измерительном столе тот же срез лежит рядом с неподвижной точкой x. Светлый отрезок соединяет x с самой удалённой точкой круга. Для точки и множества именно это расстояние выбирает метрика Хаусдорфа.',
        'R(α) = d<sub>H</sub>({x}, A(α))<br>= max<sub>z ∈ A(α)</sub> ‖x − z‖<br>= 3 + r(α)',
        [['До ближайшей точки',fmt(s.near)],['До дальней точки R(α)',fmt(s.R)],['Её координаты', '('+fmt(s.far[0])+'; 0)']],
        'Срез перенесён параллельно плоскости без изменения масштаба. Высота α не входит в евклидово расстояние; измерение происходит в одной горизонтальной плоскости.'],
      ['Каждый слой оставляет вклад','Нажмите на диск измерительного стола или перетащите диск из кассеты в гребёнку интегратора. В пути он превращается в объёмный элемент: ширина соответствует Δα, высота — квадрату R(α). Соседние элементы заполняют площадь под профилем. Повторный перенос не удваивает вклад.',
        'I = ∫₀¹ R(α)² dα<br>I₁₂ = Σ R(αₖ)² · Δα<br>D₂ = √I',
        [['Δα', '1 / 12'],['Вклад выбранного среза',fmt(s.mass)],['Собрано в приборе',fmt(mass)],['Учебная сумма I₁₂',fmt(lesson.approximateI)],['Полный интеграл I',fmt(lesson.I)]],
        'Учебные элементы берут середины интервалов. У гауссовой области r → ∞ при α → 0, поэтому 12 элементов дают приближение. Полный интеграл учитывает весь хвост. Масштаб высот интегратора свой.'],
      ['Расстояния сходятся в сумму','Элементы интеграла сжимаются в одну мерную деталь: √I даёт расстояние D₂, а вес β — длину детали. Она проходит через пресс к упору рейки. Ещё два заранее подготовленных вклада выходят из держателя, проходят через тот же узел и встают рядом. Общая длина равна F₂.',
        'D₂,ⱼ = √(∫₀¹ Rⱼ(α)² dα)<br>F₂(x) = Σⱼ βⱼ D₂,ⱼ',
        [...lesson.terms.map((t,i)=>['β'+(i+1)+'D₂,'+(i+1)+' · β = '+lesson.objects[i].b.toLocaleString('ru-RU'),fmt(t.contribution)]),['Итог F₂(x)',fmt(lesson.F)]],
        'Для первого объекта D₂ = '+fmt(lesson.D)+'. Корень извлекают отдельно для каждого объекта, затем умножают на вес и складывают. Рейка показывает полные значения; число перенесённых учебных срезов их не меняет.']
    ][stage];
    q('#criterion-step-number').textContent='Шаг '+(stage+1)+' из 4';
    q('#criterion-step-title').textContent=content[0];q('#criterion-step-text').textContent=content[1];
    q('#criterion-step-formula').innerHTML=content[2];
    q('#criterion-step-values').innerHTML=content[3].map(([a,b])=>'<div><span>'+a+'</span><strong>'+b+'</strong></div>').join('');
    q('#criterion-step-note').textContent=content[4];
    all('[data-criterion-step]').forEach(b=>b.setAttribute('aria-current',Number(b.dataset.criterionStep)===stage?'step':'false'));
    all('[data-level]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.level)===selected));b.dataset.collected=collected.has(Number(b.dataset.level));});
    q('#criterion-progress').textContent=collected.size+' / 12 срезов собрано';
    q('#criterion-tour').disabled=still.matches;
    q('#criterion-tour').textContent=still.matches?'Автопоказ отключён':touring?'Пауза':'Запустить механизм';
    q('#criterion-readout').textContent=stage===3?'F₂ = '+fmt(lesson.F):'α = '+fmt(s.alpha)+' / R = '+fmt(s.R);
    q('#criterion-hint').textContent=drag?.active?'Отпустите диск над интегратором':flight?'Срез превращается в элемент R²Δα':stage===3?'Интеграл → мерная деталь → сумма':'Клик по диску на столе / перетащите диск в интегратор';
  }
  function paint(dt=.016){
    const moving=figure.draw(lesson,selected,collected,stage,dt,still.matches,flight,drag);
    if(stage===3)q('#criterion-readout').textContent=figure.outputTime<.84?'I → √I: собираем мерную деталь':figure.outputTime<C.outputSeconds?'Проводим вклады через пресс…':'F₂ = '+fmt(lesson.F);
    return moving;
  }
  function stopTour(){touring=false;tourClock=0;q('#criterion-tour').textContent=still.matches?'Автопоказ отключён':'Запустить механизм';}
  function wake(){if(!frame&&!drawing&&dialog.open&&visible&&!document.hidden){last=0;frame=requestAnimationFrame(tick);}}
  function choose(k,manual=true){
    if(manual){stopTour();flight=null;}else if(flight)return;selected=Math.max(0,Math.min(11,k));story();if(still.matches)paint();else wake();
  }
  function chooseStage(n,manual=true){if(manual){stopTour();flight=null;}stage=Math.max(0,Math.min(3,n));if(stage===3)collected=new Set(lesson.slices.map(s=>s.k));story();paint();wake();}
  function transfer(manual=true,from=null){
    if(flight||collected.has(selected))return;
    if(manual)stopTour();stage=2;
    if(still.matches){collected.add(selected);if(collected.size===12)stage=3;story();paint();return;}
    flight={t:0,from,duration:from ? .3 : C.transferSeconds};story();wake();
  }
  function reset(){
    stopTour();flight=null;drag=null;collected=new Set();selected=5;stage=0;story();paint();wake();
  }
  function startTour(){
    if(still.matches)return;flight=null;collected=new Set();selected=0;stage=0;tourClock=0;touring=true;story();wake();
  }
  function tick(now){
    frame=0;if(!dialog.open||!visible||document.hidden)return;
    drawing=true;
    const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    if(flight){
      flight.t=Math.min(1,flight.t+dt/flight.duration);
      if(flight.t>=1){collected.add(selected);flight=null;if(!touring&&collected.size===12)stage=3;story();if(touring)tourClock=0;}
    }else if(touring){
      tourClock+=dt;
      if(stage===0&&tourClock>.8){stage=1;tourClock=0;story();}
      else if(stage===1&&tourClock>.8)transfer(false);
      else if(stage===2&&tourClock>.1){
        const next=lesson.slices.findIndex(s=>!collected.has(s.k));
        if(next<0){stage=3;tourClock=0;story();}
        else{choose(next,false);transfer(false);}
      }else if(stage===3&&tourClock>C.outputSeconds+2)startTour();
    }
    const moving=paint(dt);
    drawing=false;
    if(moving||flight||touring||drag?.active)frame=requestAnimationFrame(tick);
  }
  function open(){
    returnFocus=document.activeElement;
    const help=document.querySelector('#help');if(help.open)help.close();
    q('#criterion-card').dataset.theme=document.body.dataset.theme==='dark'?'dark':'light';
    dialog.showModal();reset();
    if(!still.matches)startTour();
  }
  for(const id of['criterion-open','criterion-from-help'])document.getElementById(id).addEventListener('click',open);
  q('#criterion-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{stopTour();cancelAnimationFrame(frame);frame=0;flight=null;cancelDrag();returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus.focus():document.querySelector('#criterion-open').focus();});
  dialog.addEventListener('keydown',e=>{
    e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();dialog.close();}
  });
  all('[data-criterion-step]').forEach(b=>b.addEventListener('click',()=>chooseStage(Number(b.dataset.criterionStep))));
  q('#criterion-slices').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(b)choose(Number(b.dataset.level));});
  const pick=e=>e.target.closest('[data-slice],[data-bin]');
  canvas.addEventListener('pointerover',e=>{if(drag)return;const target=pick(e);if(target&&!target.contains(e.relatedTarget))choose(Number(target.dataset.slice??target.dataset.bin));});
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    const target=e.target.closest('[data-slice],[data-seat]');if(!target)return;
    e.preventDefault();
    if(target.hasAttribute('data-slice'))choose(Number(target.dataset.slice));else{stopTour();flight=null;}
    stage=1;story();canvas.focus({preventScroll:true});
    const p=figure.point(e.clientX,e.clientY),s=lesson.slices[selected];
    const origin=target.hasAttribute('data-slice')?iso([-215,-25+24*figure.pulls[selected],13+s.alpha*124],figure.P):iso([-68,-6,8],figure.P);
    const rest=iso([-68,-6,8],figure.P),offset=origin.map((v,i)=>v-rest[i]);
    drag={id:e.pointerId,start:[p.x,p.y],offset,at:[...offset],origin:offset,active:false,seat:target.hasAttribute('data-seat')};
    canvas.setPointerCapture(e.pointerId);paint();wake();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const p=figure.point(e.clientX,e.clientY),delta=[p.x-drag.start[0],p.y-drag.start[1]];
    if(Math.hypot(...delta)>6)drag.active=true;
    if(drag.active){e.preventDefault();drag.offset=drag.origin.map((v,i)=>v+delta[i]);canvas.classList.add('is-dragging');story();paint();wake();}
  });
  function cancelDrag(){
    if(!drag)return;const id=drag.id;drag=null;canvas.classList.remove('is-dragging');
    if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  }
  canvas.addEventListener('pointerup',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const send=drag.active?Boolean(document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-integrator]')):drag.seat;
    let from=null;
    if(send&&drag.active){
      const camera=cameraOf(figure.P),sx=drag.at[0]/camera.k,sy=drag.at[1]/(camera.k*camera.sinE);
      from={ring:circleRing(-68+sx*camera.sinA+sy*camera.cosA,-6-sx*camera.cosA+sy*camera.sinA,lesson.slices[selected].r*15,64),z:8,h:2.5};
    }
    cancelDrag();if(send)transfer(true,from);else{story();paint();wake();}
  });
  canvas.addEventListener('pointercancel',()=>{cancelDrag();story();paint();});
  canvas.addEventListener('lostpointercapture',()=>{if(drag){cancelDrag();story();paint();}});
  canvas.addEventListener('click',e=>{const bin=e.target.closest('[data-bin]');if(bin&&!drag){choose(Number(bin.dataset.bin));chooseStage(2);}});
  canvas.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){
      e.preventDefault();choose(e.key==='Home'?0:e.key==='End'?11:selected+(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1));
    }
    if(e.key==='Enter'||e.key===' '){e.preventDefault();transfer();}
    if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();chooseStage(stage+(e.key==='PageDown'?1:-1));}
  });
  q('#criterion-reset').addEventListener('click',reset);
  q('#criterion-tour').addEventListener('click',()=>{if(touring){stopTour();story();}else startTour();});
  new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;if(visible)wake();else{cancelAnimationFrame(frame);frame=0;last=0;}}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
  still.addEventListener('change',()=>{
    if(still.matches){stopTour();if(flight){collected.add(selected);flight=null;}cancelAnimationFrame(frame);frame=0;}
    story();paint();
  });
  window.criterionState=()=>({selected,alpha:lesson.slices[selected].alpha,stage,collected:[...collected],touring,transferring:Boolean(flight),dragging:Boolean(drag?.active),progress:flight?.t??null,outputTime:figure.outputTime,tourClock,visible,documentHidden:document.hidden,framePending:Boolean(frame),D:lesson.D,F:lesson.F,I:lesson.I,approximateI:lesson.approximateI,objects:lesson.objects.map(o=>({...o})),x:[...lesson.x],p:2,open:dialog.open,parts:CRITERION_GEOMETRY.parts});
  if(new URLSearchParams(location.search).get('explain')==='criterion')open();
})();
