import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const html=read('../index.html');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
for(const id of ['stage','play','finish','step','multi','p','alpha','object-list','object-editor','analysis-panel','criterion-dialog','theme','algorithm','reduction','eta0','maxIterations','show-step'])assert.equal(ids.filter(v=>v===id).length,1,`Missing or duplicate ${id}`);
for(const legacy of ['id="tau"','show-prox','Дуглас','Рэкфорд','опорными плоскостями','gₘᵢₙ'])assert.ok(!html.includes(legacy),`Obsolete solver UI: ${legacy}`);
for(const name of ['contributions','convergence','runs']){
  assert.ok(html.includes(`aria-controls="tab-${name}"`));
  assert.ok(html.includes(`role="tabpanel" aria-labelledby="tab-button-${name}"`));
}
assert.ok(html.includes('href="#stage"'),'Keyboard skip link');
assert.ok(html.includes('id="object-list" class="object-list" role="group"'),'Object buttons retain their native role');
assert.ok(!html.includes('role="listitem" class="object-row"'));
assert.ok(!html.includes('__GOLOS_'),'Fonts must be inlined');
assert.ok(html.includes('SIL OPEN FONT LICENSE'),'Bundled font license');
assert.ok(html.includes('Copyright (c) 2026 Ryan'),'Bundled Anatomy license');
assert.ok(!/file:\/\/\/|[A-Z]:[\\/]/.test(html),'No local machine paths');
for(const match of html.matchAll(/data:font\/woff;base64,([A-Za-z0-9+/=]+)/g))assert.equal(Buffer.from(match[1],'base64').subarray(0,4).toString(),'wOFF');
assert.equal([...html.matchAll(/data:font\/woff;base64,/g)].length,2);
assert.ok(html.includes('@media(prefers-reduced-motion:reduce)'));
assert.ok(html.includes('.workbench.has-analysis{overflow-y:auto;'),'Short screens can scroll without overlapping controls');
console.log('Standalone fonts and license, unique controls, native object buttons, tab relationships and motion/layout safeguards passed.');
