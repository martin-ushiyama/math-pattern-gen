const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function loadCore(html=fs.readFileSync(path.join(root,'index.html'),'utf8')){
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const end=script.indexOf(';',script.indexOf('const ORDER='))+1;
  if(!end)throw new Error('Missing structure registry');
  const context=vm.createContext({});
  vm.runInContext(script.slice(0,end)+'\nthis.core={S,ORDER,svgFromDots,brandLogoSVG,PALETTES,normalizeParams:typeof normalizeParams==="function"?normalizeParams:null,FORMULAS,formulaFor};',context);
  return context.core;
}
function defaults(S,id){return Object.fromEntries(S[id].params.map(p=>[p.k,p.d]));}
module.exports={root,loadCore,defaults};
