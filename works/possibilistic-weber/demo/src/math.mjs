import katex from './vendor/katex/katex.min.js';

const mathCache=new Map();
export function mathHTML(tex,display=false){
  const key=display+':'+tex;
  if(!mathCache.has(key)){
    if(mathCache.size>=512)mathCache.delete(mathCache.keys().next().value);
    mathCache.set(key,katex.renderToString(tex,{displayMode:display,throwOnError:true,trust:false,strict:'error'}));
  }
  return mathCache.get(key);
}
export function mathMarkup(html){
  return html.replace(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g,(_,inline,block)=>mathHTML((inline??block).replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&'),block!==undefined));
}
export function mathSvg(tex,x,y,width=54,height=26){
  return `<foreignObject x="${x}" y="${y}" width="${width}" height="${height}" class="svg-formula"><div xmlns="http://www.w3.org/1999/xhtml">${mathHTML(tex)}</div></foreignObject>`;
}
