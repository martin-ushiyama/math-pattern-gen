const test=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const {loadCore,defaults}=require('../scripts/core.cjs');
const {S,ORDER,svgFromDots,pixelDots,normalizeOutput}=loadCore();
test('pixel rendering is an output mode, not an additional structure',()=>{
  assert.equal(ORDER.length,13);assert(!ORDER.includes('dither'));
  assert.throws(()=>pixelDots('missing',{},100,100,4),/Unknown structure/);
});
test('original contour dots and pixel output use the same underlying tone field',()=>{
  const p=defaults(S,'contour'),original=JSON.stringify(p);
  for(const d of S.contour.gen(p,320,240))assert.equal(d.r,p.rmin+(p.rmax-p.rmin)*S.contour.tone(p,d.x,d.y,320,240));
  const a=pixelDots('contour',p,320,240,4),b=pixelDots('contour',p,320,240,4);
  assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(JSON.stringify(p),original);
  assert.notEqual(JSON.stringify(a),JSON.stringify(pixelDots('contour',{...p,ox:100},320,240,4)));
});
test('Bayer sampling represents constant tones with the expected coverage',()=>{
  S.testField={tone:()=>.5};
  assert.equal(pixelDots('testField',{},32,32,4).length,32);
  S.testField.tone=()=>0;assert.equal(pixelDots('testField',{},32,32,4).length,0);
  S.testField.tone=()=>1;assert.equal(pixelDots('testField',{},32,32,4).length,64);
  delete S.testField;
});
test('pixel SVG renders with exactly two colors at integer export scales',async()=>{
  const dots=pixelDots('contour',defaults(S,'contour'),127,93,4);
  for(const scale of [1,2,3]){
    const svg=svgFromDots(127,93,dots,'#ffffff',[.3,.7,1],'#3023dd',90);
    const {data,info}=await sharp(Buffer.from(svg),{density:72*scale}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,127*scale);assert.equal(info.height,93*scale);
    const colors=new Set();for(let i=0;i<data.length;i+=4)colors.add([...data.subarray(i,i+4)].join(','));
    assert.deepEqual(colors,new Set(['255,255,255,255','48,35,221,255']));
  }
});
test('transparent output has no partially transparent edge pixels',async()=>{
  const svg=svgFromDots(127,93,pixelDots('contour',defaults(S,'contour'),127,93,4),'#fff',[1,1,1],null,90);
  const data=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer(),alpha=new Set();
  for(let i=3;i<data.length;i+=4)alpha.add(data[i]);assert.deepEqual(alpha,new Set([0,255]));
});
test('old recipes default to normal; malformed output options are bounded',()=>{
  assert.equal(normalizeOutput().mode,'normal');assert.equal(normalizeOutput().pixel,4);
  assert.equal(normalizeOutput({mode:'pixel',pixel:0}).pixel,2);
  assert.equal(normalizeOutput({mode:'pixel',pixel:100}).pixel,16);
  assert.equal(normalizeOutput({mode:'pixel',pixel:NaN}).pixel,4);
  assert.equal(normalizeOutput({mode:'pixel',pixel:3.6}).pixel,4);
});

for(const key of ORDER)test(key+': pixel output is deterministic, bounded, and does not alter shape parameters',()=>{
  const p=defaults(S,key),before=JSON.stringify(p);
  const a=pixelDots(key,p,1200,630,4),b=pixelDots(key,p,1200,630,4);
  assert(a.length>0,key);assert(a.length<=300*158);assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(JSON.stringify(p),before);
  assert(a.every(d=>Number.isInteger(d.x)&&Number.isInteger(d.y)&&d.pixel===4&&d.x>=0&&d.y>=0&&d.x<1200&&d.y<630));
  const coarse=pixelDots(key,p,1200,630,12);assert.notEqual(JSON.stringify(a),JSON.stringify(coarse));
});

for(const angle of [0,90,135])test('gradient cells stay flat and opaque at angle '+angle,async()=>{
  const dots=pixelDots('contour',defaults(S,'contour'),127,93,8);
  const svg=svgFromDots(127,93,dots,['#ff0000','#0000ff'],[1,1,1],['#ffffff','#00ff00'],angle);
  assert(!svg.includes('linearGradient'));
  const occupied=new Set(dots.map(d=>d.x+','+d.y));
  for(const scale of [1,2]){
    const {data,info}=await sharp(Buffer.from(svg),{density:72*scale}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const sample=(x,y)=>[...data.subarray((y*info.width+x)*4,(y*info.width+x)*4+4)];
    const colors=new Set();
    for(let y=0;y<93;y+=8)for(let x=0;x<127;x+=8){
      const c=sample(x*scale,y*scale);assert.equal(c[3],255);colors.add(c.join(','));
      if(occupied.has(x+','+y)){assert.equal(c[1],0);assert.equal(c[0]+c[2],255);}else {assert.equal(c[1],255);assert.equal(c[0],c[2]);}
      for(let yy=y*scale;yy<Math.min(y+8,93)*scale;yy++)for(let xx=x*scale;xx<Math.min(x+8,127)*scale;xx++)assert.deepEqual(sample(xx,yy),c);
    }
    assert(colors.size>8);
  }
});
test('empty pixel fields retain grid size for background gradients',async()=>{
  S.testField={tone:()=>0};const dots=pixelDots('testField',{},16,8,8);delete S.testField;
  assert.equal(dots.pixelSize,8);assert.equal(dots.length,0);
  const svg=svgFromDots(16,8,dots,'#000',[1,1,1],['#000','#fff'],0);
  const data=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  assert.deepEqual([...data.subarray(0,4)],[64,64,64,255]);assert.deepEqual([...data.subarray(8*4,9*4)],[191,191,191,255]);
});

test('background colors cannot cover foreground cells with shared palette colors',async()=>{
 const dots=[{x:0,y:0,pixel:8}];dots.pixel=true;dots.pixelSize=8;
 const svg=svgFromDots(16,8,dots,'#404040',[1,1,1],['#000','#fff'],0);
 const data=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
 assert.deepEqual([...data.subarray(0,4)],[64,64,64,255]);
});
