import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as M from './model.mjs';
import * as C from './criterion-model.mjs';
import {mathHTML,mathMarkup,mathSvg} from './math.mjs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const fraction=mathHTML(String.raw`F_p(x)=\sum_j\beta_j\left(\int_0^1R_j(x,\alpha)^p\,d\alpha\right)^{1/p}`);
assert.match(fraction,/<math /);assert.match(fraction,/class="katex-html"/);assert.match(mathHTML(String.raw`\frac12`),/<mfrac>/);assert.match(fraction,/<msub>/);
assert.match(mathHTML(String.raw`\sqrt{x^2+y^2}`),/<msqrt>/);
assert.match(mathMarkup(String.raw`До \(x^2\), после \[\frac12\].`),/katex-display/);
assert.throws(()=>mathHTML(String.raw`\missingCommand`));
assert.ok(!mathHTML(String.raw`\href{javascript:alert(1)}{x}`).includes('<a href='),'TeX cannot inject trusted HTML');
for(const type of Object.keys(M.profiles))for(const shape of Object.keys(M.shapes)){
  const formula=M.spatialFormula({...M.initialObjects()[0],type,shape,aspect:2});
  assert.match(mathHTML(formula),/<math /,type+' / '+shape);
}
assert.match(mathSvg('x_0',1,2),/<foreignObject[^>]*>.*<math /);
// Run all four lesson screens with the real math renderer and numerical model.
const elements=new Map();
const element=id=>{
  if(!elements.has(id))elements.set(id,{innerHTML:'',dataset:{},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(){},focus(){},showModal(){this.open=true;},close(){this.open=false;}});
  return elements.get(id);
};
const stages=Array.from({length:4},(_,i)=>Object.assign(element('step'+i),{dataset:{criterionStep:String(i)}}));
const dialog=element('#criterion-dialog');dialog.querySelector=element;dialog.querySelectorAll=s=>s==='[data-criterion-step]'?stages:[];
const context=vm.createContext({C,mathHTML,mathMarkup,Math,URLSearchParams,location:{search:'?explain=criterion'},window:{},document:{querySelector:element,getElementById:id=>element('#'+id),body:{dataset:{}},addEventListener(){}},matchMedia:()=>({matches:true,addEventListener(){}}),CriterionFigure:class{constructor(){this.outputTime=C.outputSeconds;}draw(){return false;}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},IntersectionObserver:class{observe(){}}});
vm.runInContext(read('criterion-live.mjs'),context);
element('#help').showModal();element('#criterion-from-help').listeners.click();assert.equal(element('#help').open,false);assert.equal(dialog.open,true);
element('#model-dialog').showModal();element('#criterion-open').listeners.click();assert.equal(element('#model-dialog').open,false);
dialog.close();element('#criterion-from-tip').listeners.click();assert.equal(dialog.open,true);
for(let stage=0;stage<4;stage++){
  stages[stage].listeners.click();
  assert.match(element('#criterion-step-formula').innerHTML,/<math /);
  for(const id of ['criterion-step-formula','criterion-step-values','criterion-step-note','criterion-readout'])assert.ok(!element('#'+id).innerHTML.includes('\\('),'No raw TeX delimiters in '+id);
}
const html=read('../index.html');
const modelHTML=html.match(/<dialog id="model-dialog"[\s\S]*?<\/dialog>/)[0];
assert.match(modelHTML,/<mfrac>/);assert.match(modelHTML,/<msqrt>/);assert.match(modelHTML,/F_p\(x\)/);
assert.equal((html.match(/data:font\/woff2;base64,/g)||[]).length,20,'Every math font is embedded');
assert.ok(!/url\(["']?fonts\//.test(html),'No external math font requests');
new vm.Script(html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
console.log('TeX fractions, roots, indices, safe rendering, every profile/shape, all lesson stages, static formulas, embedded fonts and bundled script passed.');
