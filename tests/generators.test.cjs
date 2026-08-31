const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {root,loadCore,defaults}=require('../scripts/core.cjs');
const {S,ORDER,svgFromDots,normalizeParams,FORMULAS,formulaFor}=loadCore();
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function valid(dots){assert(dots.length>0);assert(dots.every(d=>Number.isFinite(d.x)&&Number.isFinite(d.y)&&Number.isFinite(d.r)&&d.r>0));}
for(const id of ORDER)test(id+': deterministic finite output',()=>{
  const p=defaults(S,id),a=S[id].gen(p,1200,900),b=S[id].gen(p,1200,900);valid(a);
  assert.equal(JSON.stringify(a),JSON.stringify(b));
});
test('every structure has a concise generating rule',()=>{
  for(const id of ORDER){
    const formula=formulaFor(id,defaults(S,id));
    assert.equal(typeof formula,'string');assert(formula.length>2,id);
  }
  assert.equal(formulaFor('conformal',{fn:'z2'}),'w = z²');
  assert.equal(formulaFor('conformal',{fn:'jouk'}),'w = z + 1/z');
  assert.deepEqual(new Set([...Object.keys(FORMULAS),'conformal']),new Set(ORDER));
});
test('palette names do not retain the former Funho branding',()=>{
  const pink=loadCore().PALETTES.find(p=>p.id==='pink');
  assert.deepEqual(JSON.parse(JSON.stringify(pink.name)),{ja:'ピンク',en:'Pink'});
});

test('first visits open in English while explicit language choices remain supported',()=>{
  const editor=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const gallery=fs.readFileSync(path.join(root,'assets','gallery','gallery.js'),'utf8');
  const galleryTemplate=fs.readFileSync(path.join(root,'scripts','structures.template.html'),'utf8');
  assert.match(editor,/<html lang="en"/);
  assert.match(editor,/let LANG = \(function\(\)\{[\s\S]*return "en";[\s\S]*\}\)\(\);/);
  assert.doesNotMatch(editor,/navigator\.language/);
  assert.match(editor,/localStorage\.getItem\("math-pattern-gen\.lang"\)/);
  assert.match(gallery,/let language="en";/);
  assert.doesNotMatch(gallery,/navigator\.language/);
  assert.match(gallery,/localStorage\.getItem\("math-pattern-gen\.lang"\)/);
  assert.match(galleryTemplate,/<html lang="en"/);
  assert.match(galleryTemplate,/>Start with a pattern\.<\/h1>/);
});

test('GitHub README is English-first with a maintained Japanese version',()=>{
  const english=fs.readFileSync(path.join(root,'README.md'),'utf8');
  const japanese=fs.readFileSync(path.join(root,'README.ja.md'),'utf8');
  assert.match(english,/\*\*English\*\* \| \[日本語\]\(README\.ja\.md\)/);
  assert.match(english,/## Patterns, born from math\./);
  assert.match(japanese,/\[English\]\(README\.md\) \| \*\*日本語\*\*/);
  assert.match(japanese,/## 数学から、模様が生まれる。/);
});

test('focus styling stays inside form controls and follows the quiet UI palette',()=>{
  const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(source,/--focus:#5f6758/);
  assert.match(source,/:where\(select,input\[type=number\],input\[type=text\],input\[type=color\]\):focus-visible\{outline:0;[^}]*box-shadow:inset/);
  assert.doesNotMatch(source,/:focus-visible\{[^}]*#1644dd/);
});
test('the address bar stays clean while exact pattern links remain available on demand',()=>{
  const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.doesNotMatch(source,/function writeHash/);
  assert.doesNotMatch(source,/\bwriteHash\(\)/);
  assert.match(source,/function stateHash\(\)/);
  assert.match(source,/history\.replaceState\(null,"",url\.href\)/);
  assert.match(source,/navigator\.clipboard\.writeText\(patternURL\(\)\)/);
  assert.match(source,/sessionStorage\.setItem\("mpg\.editorHash",stateHash\(\)\)/);
});
test('GA4 tracks use without sending recipe hashes or personalized-ad signals',()=>{
  const analytics=fs.readFileSync(path.join(root,'assets','analytics.js'),'utf8');
  const editor=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const gallery=fs.readFileSync(path.join(root,'structures.html'),'utf8');
  assert.match(analytics,/G-0Q97CVXXHQ/);
  assert.match(analytics,/location\.origin\+location\.pathname\+location\.search/);
  assert.doesNotMatch(analytics,/location\.href/);
  assert.match(analytics,/allow_google_signals:false/);
  assert.match(analytics,/allow_ad_personalization_signals:false/);
  assert.match(editor,/assets\/analytics\.js/);
  assert.match(gallery,/assets\/analytics\.js/);

  const context={
    location:{origin:'https://example.com',pathname:'/math-pattern-gen/',search:'',hash:'#private-recipe'},
    document:{documentElement:{lang:'en'},createElement:()=>({}),head:{appendChild(){}}},
    Date,Object
  };
  context.window=context;
  vm.runInNewContext(analytics,context);
  const calls=context.dataLayer.map(args=>Array.from(args));
  assert.equal(calls[1][0],'config');
  assert.equal(calls[1][2].page_location,'https://example.com/math-pattern-gen/');
  assert.equal(calls[1][2].allow_google_signals,false);
  context.mpgTrack('pattern_engaged',{structure:'polar'});
  const event=Array.from(context.dataLayer.at(-1));
  assert.deepEqual(event.slice(0,2),['event','pattern_engaged']);
  assert.equal(event[2].interface_language,'en');
});
test('analytics separates visits, meaningful editing, choices and exports',()=>{
  const editor=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const gallery=fs.readFileSync(path.join(root,'assets','gallery','gallery.js'),'utf8');
  for(const event of ['pattern_engaged','structure_select','palette_select','pattern_export','pattern_link_copy'])assert.match(editor,new RegExp(event));
  assert.match(gallery,/mpgTrack\('structure_select'/);
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
