"use strict";
(function(){
  function read(key){try{return sessionStorage.getItem(key);}catch(e){return null;}}
  let language=(navigator.language||"").startsWith("ja")?"ja":"en";
  try{const saved=localStorage.getItem("math-pattern-gen.lang")||localStorage.getItem("patternlab.lang");if(saved==="ja"||saved==="en")language=saved;}catch(e){}
  function applyLanguage(value){
    language=value;document.documentElement.lang=value;
    document.title=(value==="ja"?"構造一覧":"Structures")+" — Math Pattern Gen";
    for(const element of document.querySelectorAll('[data-ja][data-en]'))element.textContent=element.dataset[value];
    document.getElementById('langJa').setAttribute('aria-pressed',value==='ja');
    document.getElementById('langEn').setAttribute('aria-pressed',value==='en');
    try{localStorage.setItem('math-pattern-gen.lang',value);}catch(e){}
  }
  document.getElementById('langJa').addEventListener('click',()=>applyLanguage('ja'));
  document.getElementById('langEn').addEventListener('click',()=>applyLanguage('en'));
  applyLanguage(language);
  const saved=read('mpg.editorHash');
  if(saved&&saved.startsWith('#'))document.getElementById('backToEditor').href='index.html'+saved;
  for(const card of document.querySelectorAll('.card'))card.addEventListener('click',()=>{
    try{
      const state=JSON.parse(decodeURIComponent(new URL(card.href).hash.slice(1)));
      if(typeof window.mpgTrack==='function')window.mpgTrack('structure_select',{structure:state.s,selection_source:'gallery'});
    }catch(e){}
    try{sessionStorage.setItem('mpg.galleryScroll',String(scrollY));}catch(e){}
  });
  if(read('mpg.galleryReturn')==='1'){
    const y=Number(read('mpg.galleryScroll'));
    try{sessionStorage.removeItem('mpg.galleryReturn');}catch(e){}
    if(Number.isFinite(y)&&y>0)requestAnimationFrame(()=>scrollTo(0,y));
  }
})();
