/* Landing only. Stable product photographs, one pinned exhibit, native scroll. */
(() => {
  'use strict';
  window.VinlumeMiniCD?.destroy();
  const root=document.querySelector('[data-pn-mini-story]');if(!root)return;
  const abort=new AbortController(),events={signal:abort.signal};
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)');
  const opening=root.querySelector('[data-lv-opening]'),canvas=root.querySelector('[data-lv-stage]');
  const chapter=root.querySelector('[data-lv-chapter]'),pin=chapter.querySelector('.lv-object-pin');
  const photos=[...root.querySelectorAll('[data-lv-photo]')],tabs=[...root.querySelectorAll('[data-lv-view]')];
  const controls=root.querySelector('.lv-exhibit-controls'),animations=new Set();
  const descriptions=['Una jewel case transparente. Un pequeño disco. El álbum que vuelve contigo.','Ábrelo y míralo de cerca. La transparencia hace que cada detalle forme parte del objeto.','Estuche y disco separados. El punto de partida para llevar la música que eliges.'];
  let frame=0,stage=null,creating=false,stageVisible=false,chapterVisible=false,disposed=false,epoch=0,selected=-1;
  const reduced=()=>motion.matches||forced.matches||Boolean(window.VinlumeEffects?.reduced);
  const enabled=()=>!disposed&&!reduced()&&!document.hidden&&!root.hidden;
  const ease=(a,b,p)=>{const t=Math.max(0,Math.min(1,(p-a)/(b-a)));return t*t*(3-2*t);};
  function cancelAnimations(){animations.forEach(a=>a.cancel());animations.clear();}
  function animate(node,frames,options){if(reduced()||!node.animate)return;const a=node.animate(frames,options);animations.add(a);a.finished.catch(()=>{}).finally(()=>animations.delete(a));}
  function render(){
    frame=0;if(!enabled()||!chapterVisible)return;
    const r=chapter.getBoundingClientRect(),height=pin.getBoundingClientRect().height,top=parseFloat(getComputedStyle(pin).top)||0;
    const p=Math.max(0,Math.min(1,(top-r.top)/Math.max(1,r.height-height)));
    const weights=[1-ease(.27,.37,p),ease(.27,.37,p)*(1-ease(.60,.70,p)),ease(.60,.70,p)];
    photos.forEach((photo,i)=>{photo.style.opacity=weights[i].toFixed(4);});
    chapter.style.setProperty('--lv-progress',p.toFixed(4));chapter.dataset.progress=p.toFixed(4);
    const index=p<.32?0:p<.65?1:2;
    if(index!==selected){selected=index;tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===index)));root.querySelector('[data-lv-counter]').textContent=`0${index+1} — 03`;const copy=root.querySelector('[data-lv-photo-copy]');copy.textContent=descriptions[index];animate(copy,[{opacity:.25},{opacity:1}],{duration:420,easing:'ease-out'});}
  }
  function schedule(){if(!frame&&enabled()&&chapterVisible)frame=requestAnimationFrame(render);}
  async function ensureStage(){
    if(stage||creating||!enabled()||!stageVisible)return;
    creating=true;const token=++epoch;let candidate;
    try{
      const module=await import(canvas.dataset.module);
      if(token!==epoch||!enabled()||!stageVisible)return;
      candidate=await module.createStage(canvas,opening);
      if(token!==epoch||!enabled()){candidate.dispose();return;}
      stage=candidate;stage.setVisible(stageVisible);opening.dataset.stageReady='true';
    }catch(error){candidate?.dispose();opening.dataset.stageReady='false';console.info('VINLUME landing: fotografía estática disponible.',error.message);}
    finally{creating=false;if(token!==epoch&&enabled()&&stageVisible)ensureStage();}
  }
  function releaseStage(){epoch++;stage?.dispose();stage=null;opening.dataset.stageReady='false';canvas.hidden=true;}
  function sync(){
    cancelAnimationFrame(frame);frame=0;cancelAnimations();
    root.classList.toggle('lv-enhanced',!reduced());controls.hidden=reduced();
    if(reduced()){releaseStage();photos.forEach(photo=>photo.style.removeProperty('opacity'));}
    else{stage?.setVisible(stageVisible&&enabled());ensureStage();schedule();}
  }
  const visibility=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.target===opening){stageVisible=entry.isIntersecting&&entry.intersectionRatio>.02;stage?.setVisible(stageVisible&&enabled());if(stageVisible)ensureStage();}
      if(entry.target===chapter){chapterVisible=entry.isIntersecting;if(chapterVisible)schedule();}
    });
  },{threshold:[0,.02]});visibility.observe(opening);visibility.observe(chapter);
  const revealed=new WeakSet();
  const revealObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{
    if(!entry.isIntersecting||revealed.has(entry.target))return;revealed.add(entry.target);
    animate(entry.target,[{opacity:.12,clipPath:'inset(0 0 90% 0)',filter:'blur(3px)'},{opacity:1,clipPath:'inset(0)',filter:'blur(0)'}],{duration:1050,easing:'cubic-bezier(.16,1,.3,1)'});
  });},{threshold:.3});root.querySelectorAll('[data-lv-reveal]').forEach(n=>revealObserver.observe(n));
  const cardObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting||revealed.has(entry.target))return;revealed.add(entry.target);animate(entry.target,[{opacity:.15,transform:'translateY(35px)'},{opacity:1,transform:'translateY(0)'}],{duration:950,easing:'cubic-bezier(.16,1,.3,1)'});});},{threshold:.16});root.querySelectorAll('[data-lv-card]').forEach(n=>cardObserver.observe(n));
  tabs.forEach((tab,i)=>tab.addEventListener('click',()=>{
    const top=parseFloat(getComputedStyle(pin).top)||0,r=chapter.getBoundingClientRect();
    const travel=Math.max(1,r.height-pin.getBoundingClientRect().height);
    window.scrollTo({top:scrollY+r.top-top+travel*[.08,.48,.88][i],behavior:reduced()?'instant':'smooth'});
  },events));
  opening.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;const r=opening.getBoundingClientRect();stage?.setPointer((event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height);},{...events,passive:true});
  root.addEventListener('focusin',cancelAnimations,events);
  window.addEventListener('scroll',schedule,{...events,passive:true});window.addEventListener('resize',schedule,{...events,passive:true});
  document.addEventListener('pn:effectschange',sync,events);document.addEventListener('pn:storychange',()=>{stage?.setVisible(stageVisible&&enabled());ensureStage();schedule();},events);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}stage?.setVisible(stageVisible&&enabled());if(!document.hidden){ensureStage();schedule();}},events);
  [motion,forced].forEach(q=>q.addEventListener('change',sync,events));
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;cancelAnimations();releaseStage();},events);window.addEventListener('pageshow',sync,events);
  window.VinlumeMiniCD={destroy(){disposed=true;cancelAnimationFrame(frame);cancelAnimations();releaseStage();visibility.disconnect();revealObserver.disconnect();cardObserver.disconnect();abort.abort();root.classList.remove('lv-enhanced');controls.hidden=true;photos.forEach(p=>p.style.removeProperty('opacity'));}};
  sync();
})();
