const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const {loadCore,defaults}=require('../scripts/core.cjs');
const {S,svgFromDots}=loadCore();
test('dither uses integer squares and every control changes the pattern',()=>{
  const p=defaults(S,'dither'),base=S.dither.gen(p,400,300);
  assert(base.pixel);assert(base.every(d=>Number.isInteger(d.x)&&Number.isInteger(d.y)&&Number.isInteger(d.pixel)));
  for(const spec of S.dither.params){
    const dots=S.dither.gen({...p,[spec.k]:spec.max},400,300);
    assert.notEqual(JSON.stringify(base),JSON.stringify(dots),spec.k);
  }
});
test('pixel output has exactly two opaque colors, including integer-scale PNG rasterization',async()=>{
  const dots=S.dither.gen(defaults(S,'dither'),127,93);
  const svg=svgFromDots(127,93,dots,['#ffffff','#ff0000'],[.2,.5,.7],['#3023dd','#00ff00'],90);
  assert.match(svg,/shape-rendering="crispEdges"/);assert.doesNotMatch(svg,/opacity|linearGradient/);
  for(const scale of [1,2,3]){
    const {data,info}=await sharp(Buffer.from(svg),{density:72*scale}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,127*scale);assert.equal(info.height,93*scale);
    const colors=new Set();
    for(let i=0;i<data.length;i+=4)colors.add([...data.subarray(i,i+4)].join(','));
    assert.deepEqual(colors,new Set(['255,255,255,255','48,35,221,255']));
  }
});
test('transparent exports have only fully opaque or fully transparent pixels',async()=>{
  const svg=svgFromDots(127,93,S.dither.gen(defaults(S,'dither'),127,93),'#ffffff',[.2,.5,1],null,90);
  const data=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  const alpha=new Set();for(let i=3;i<data.length;i+=4)alpha.add(data[i]);
  assert.deepEqual(alpha,new Set([0,255]));
});
test('an empty field still uses the pixel renderer and crops edge cells',async()=>{
  const dots=[];dots.pixel=true;
  const svg=svgFromDots(101,99,dots,'#fff',[.3,.7,1],'#3023dd',90);
  assert.match(svg,/crispEdges/);
  assert.equal((await sharp(Buffer.from(svg)).metadata()).width,101);
});
