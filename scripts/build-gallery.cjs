const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const {root,loadCore,defaults}=require('./core.cjs');
const {S,ORDER,svgFromDots,brandLogoSVG}=loadCore();
const dir=path.join(root,'assets/gallery'),recipes=JSON.parse(fs.readFileSync(path.join(dir,'recipes.json'),'utf8'));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const text=(tag,value,extra='')=>`<${tag} ${extra} data-ja="${esc(value.ja)}" data-en="${esc(value.en)}">${esc(value.en)}</${tag}>`;
async function main(){
  if(recipes.length!==ORDER.length||new Set(recipes.map(r=>r.id)).size!==ORDER.length||ORDER.some(id=>!recipes.some(r=>r.id===id)))throw new Error('Gallery must cover every structure exactly once');
  const cards=[],manifest=[];
  const sorted=[...recipes].sort((a,b)=>Number(['truchet','voronoi'].includes(b.id))-Number(['truchet','voronoi'].includes(a.id)));
  for(const [i,item] of sorted.entries()){
    const st=item.state,structure=S[item.id];
    if(st.s!==item.id)throw new Error('Recipe id mismatch');
    for(const spec of structure.params){const v=st.p[spec.k];if(spec.opts?!spec.opts.some(o=>o[0]===v):!Number.isFinite(v)||v<spec.min||v>spec.max)throw new Error(item.id+': invalid '+spec.k);}
    const start=performance.now(),dots=structure.gen(st.p,+st.w,+st.h);
    if(!dots.length||dots.some(d=>![d.x,d.y,d.r].every(Number.isFinite)))throw new Error(item.id+': invalid dots');
    const svg=svgFromDots(+st.w,+st.h,dots,st.fG?[st.fg,st.f2]:st.fg,st.op,st.t?null:st.bG?[st.bg,st.b2]:st.bg,+st.ang);
    const png=await sharp(Buffer.from(svg)).resize(720,540).webp({quality:90}).toBuffer();
    fs.writeFileSync(path.join(dir,item.id+'.webp'),png);
    const href='index.html#'+encodeURIComponent(JSON.stringify(st));
    const fresh=['truchet','voronoi'].includes(item.id)?'<span class="badge">NEW</span>':'';
    cards.push(`<a class="card" href="${esc(href)}" aria-labelledby="name-${item.id}" aria-describedby="note-${item.id}"><div class="thumb"><img src="assets/gallery/${item.id}.webp" alt="" width="720" height="540" loading="${i<3?'eager':'lazy'}" decoding="async">${fresh}</div><div class="card-head">${text('h2',item.title,`id="name-${item.id}"`)}<span class="number">${String(i+1).padStart(2,'0')}</span></div>${text('p',structure.note,`id="note-${item.id}"`)}<span class="open" data-ja="この模様から作る" data-en="Make it yours">Make it yours</span><span class="arrow" aria-hidden="true">→</span></a>`);
    manifest.push({id:item.id,href,dots:dots.length,svgSha256:hash(svg),thumbnailSha256:hash(png),bytes:png.length});
    console.log(item.id+': '+dots.length+' dots / '+png.length+' bytes / '+Math.round(performance.now()-start)+'ms');
  }
  let html=fs.readFileSync(path.join(root,'scripts/structures.template.html'),'utf8');
  html=html.replaceAll('{{COUNT}}',String(ORDER.length)).replace('{{LOGO}}',brandLogoSVG()).replace('{{CARDS}}','\n'+cards.join('\n')+'\n');
  fs.writeFileSync(path.join(root,'structures.html'),html);
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
