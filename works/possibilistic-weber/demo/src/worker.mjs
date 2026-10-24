let state=null,token=0,runId=null,sent=0;
function snapshot(){
  const tail=state.trace.slice(sent).map(t=>({x:t.x,F:t.F,gap:t.gap,norm:t.norm,k:t.k}));sent=state.trace.length;
  postMessage({runId,x:state.x,k:state.k,done:state.done,reason:state.reason,best:state.best,tail});
}
function pump(mine,fast,speed){
  if(mine!==token||!state||state.done)return;
  const begin=performance.now();let count=0;
  do{M.iterate(state);count++;}while(fast&&count<100&&performance.now()-begin<24&&!state.done);
  snapshot();if(!state.done)setTimeout(()=>pump(mine,fast,speed),fast?0:1000/speed);
}
onmessage=e=>{
  const d=e.data;
  try{
    if(d.type==='pause'){token++;return;}
    if(d.type==='init'){token++;runId=d.runId;sent=0;state=null;const options=M.solverOptions(d.solver);state=M.startSolver(M.createModel(d.objects,d.p,64,options.reduction),d.start,options);snapshot();}
    if(d.type==='step'){token++;if(state&&!state.done){M.iterate(state);snapshot();}}
    if(d.type==='play'||d.type==='finish'){token++;pump(token,d.type==='finish',d.speed||12);}
  }catch(error){token++;postMessage({runId,error:error.message});}
};
