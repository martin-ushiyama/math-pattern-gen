const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {root,loadCore,defaults}=require('../scripts/core.cjs');
const {S,ORDER,svgFromDots,normalizeParams}=loadCore();
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function valid(dots){assert(dots.length>0);assert(dots.every(d=>Number.isFinite(d.x)&&Number.isFinite(d.y)&&Number.isFinite(d.r)&&d.r>0));}
for(const id of ORDER)test(id+': deterministic finite output',()=>{
  const p=defaults(S,id),a=S[id].gen(p,1200,900),b=S[id].gen(p,1200,900);valid(a);
  assert.equal(JSON.stringify(a),JSON.stringify(b));
});
for(const id of ['truchet','voronoi']){
  test(id+': every parameter boundary and wide/tall canvases',()=>{
    for(const spec of S[id].params){for(const value of spec.opts?spec.opts.map(o=>o[0]):[spec.min,spec.max])valid(S[id].gen({...defaults(S,id),[spec.k]:value},480,320));}
    for(const [w,h] of [[100,4000],[4000,100],[4000,4000]]){const p={...defaults(S,id),step:5,cell:60,jitter:1};const dots=S[id].gen(p,w,h);valid(dots);assert(dots.length<=91000);}
  });
  test(id+': seed changes arrangement and SVG supports gradients/transparency',()=>{
    const p=defaults(S,id),a=S[id].gen(p,480,320),b=S[id].gen({...p,seed:p.seed+1},480,320);
    assert.notEqual(JSON.stringify(a),JSON.stringify(b));
    const svg=svgFromDots(480,320,a,['#1644dd','#ed52ac'],[.3,.7,1],null,0);
    assert(svg.includes('linearGradient'));assert(!svg.includes('<rect'));assert(!/NaN|Infinity/.test(svg));
  });
}
test('recipe parameters reject invalid values without changing valid saved values',()=>{
  const p=normalizeParams('voronoi',{step:0,cell:Infinity,seed:NaN,mode:'invalid',width:0.231,extra:9});
  assert.equal(p.step,5);assert.equal(p.cell,180);assert.equal(p.seed,73);assert.equal(p.mode,'edges');assert.equal(p.width,.231);assert(!Object.hasOwn(p,'extra'));
  assert.equal(normalizeParams('voronoi',null).seed,73);
});
test('saved recipes for all 11 original structures retain their exact SVG output',()=>{
  const fixtures=require('./fixtures/legacy-recipes.json');
  for(const {state:st,svgSha256} of fixtures.recipes){
    const p=normalizeParams(st.s,st.p);assert.equal(JSON.stringify(p),JSON.stringify(st.p));
    assert.equal(sha(svgFromDots(+st.w,+st.h,S[st.s].gen(p,+st.w,+st.h),st.fg,st.op,st.bg,+st.ang)),svgSha256,st.s);
  }
});
test('all cards use valid recipes and generated thumbnails match their source',()=>{
  const recipes=JSON.parse(fs.readFileSync(path.join(root,'assets/gallery/recipes.json'))),manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/gallery/manifest.json')));
  assert.deepEqual(new Set(recipes.map(r=>r.id)),new Set(ORDER));assert.equal(manifest.length,ORDER.length);
  for(const r of recipes){
    const st=r.state,m=manifest.find(x=>x.id===r.id);assert.equal(JSON.stringify(normalizeParams(r.id,st.p)),JSON.stringify(st.p));
    assert.deepEqual(JSON.parse(decodeURIComponent(m.href.split('#')[1])),st);
    const svg=svgFromDots(+st.w,+st.h,S[r.id].gen(st.p,+st.w,+st.h),st.fg,st.op,st.bg,+st.ang);
    assert.equal(sha(svg),m.svgSha256,r.id+' SVG');
    assert.equal(sha(fs.readFileSync(path.join(root,'assets/gallery',r.id+'.webp'))),m.thumbnailSha256,r.id+' thumbnail');
  }
});
