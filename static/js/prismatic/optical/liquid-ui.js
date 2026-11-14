/* F06 Liquid equations, one shared GL context; native HTML owns text and actions.
   Visible surfaces receive cropped canvas copies, not independent WebGL renderers. */
import {vertex,fragment} from './liquid-shader.js';
window.VinlumeLiquid?.destroy();
const selector='.pn-button:not(.btn-secondary),.buy-btn,.pn-product-photo-label,.pn-form-panel,.pn-catalog-toolbar';
const abort=new AbortController(),events={signal:abort.signal};
const motion=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)'),compact=matchMedia('(max-width: 900px)');
const source=document.createElement('canvas'),atlas=document.createElement('canvas');atlas.width=1;atlas.height=1;
const atlas2d=atlas.getContext('2d'),surfaces=new Map(),images=new Map();
let gl,program,vao,buffer,texture,uniforms,request=0,last=0,visible=true,dead=false,failed=false,pressed=null,draws=0;
let target=[.62,.35],light=[...target],atlasDirty=true;
let framePhotos=new Set(),cpuTotal=0,cpuMax=0;
const reduced=()=>motion.matches||forced.matches||compact.matches||window.VinlumeEffects?.reduced;
const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{const s=surfaces.get(e.target);if(s)s.visible=e.isIntersecting;});schedule();},{threshold:0});
const resize=new ResizeObserver(()=>schedule());
function discover(){
  if(reduced())return;
  document.querySelectorAll(selector).forEach(node=>{
    if(surfaces.has(node))return;
    const c=document.createElement('canvas');c.width=1;c.height=1;c.className='pn-liquid-canvas';c.setAttribute('aria-hidden','true');node.prepend(c);
    surfaces.set(node,{node,canvas:c,context:c.getContext('2d'),visible:false});observer.observe(node);resize.observe(node);
  });
}
function schedule(){if(!request&&!dead&&!failed&&!reduced()&&visible&&!document.hidden)request=requestAnimationFrame(draw);}
function compile(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(error);}return s;}
function initialize(){
  if(gl)return;
  atlas.width=2048;atlas.height=1024;images.clear();
  gl=source.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
  if(!gl)throw Error('WebGL2 unavailable');
  const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
  program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);vao=gl.createVertexArray();gl.bindVertexArray(vao);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  uniforms=Object.fromEntries(['uSize','uResolution','uLight','uEnergy','uRects[0]','uOptics[0]','uCount','uThickness','uIOR','uChroma','uHue','uPhotoRects[0]','uPhotoSlots[0]','uAtlas'].map(n=>[n,gl.getUniformLocation(program,n)]));
  atlasDirty=true;
}
function release(){
  cancelAnimationFrame(request);request=0;
  if(gl){gl.useProgram(null);gl.bindVertexArray(null);if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);}
  gl=null;source.width=1;source.height=1;
  atlas.width=1;atlas.height=1;images.clear();atlasDirty=true;
  document.documentElement.dataset.liquidState='released';
  surfaces.forEach(s=>{s.node.removeAttribute('data-liquid-ready');s.canvas.width=1;s.canvas.height=1;});
}
function imageSlot(img){
  if(!img?.complete||!img.naturalWidth)return -1;
  if(images.has(img.currentSrc))return images.get(img.currentSrc);
  let slot=images.size;
  if(images.size>=8){const stale=[...images.keys()].find(key=>!framePhotos.has(key));if(!stale)return -1;slot=images.get(stale);images.delete(stale);}
  // Match object-fit:cover of the real product photograph; no DOM capture.
  const r=img.getBoundingClientRect(),ratio=r.width/r.height;
  let sw=img.naturalWidth,sh=img.naturalHeight,sx=0,sy=0;
  if(sw/sh>ratio){sx=(sw-sh*ratio)/2;sw=sh*ratio;}else{sy=(sh-sw/ratio)/2;sh=sw/ratio;}
  atlas2d.filter=img.classList.contains('pn-hero-environment')?'grayscale(88%) brightness(50%) contrast(115%)':'none';
  atlas2d.drawImage(img,sx,sy,sw,sh,(slot%4)*512,Math.floor(slot/4)*512,512,512);atlas2d.filter='none';images.set(img.currentSrc,slot);atlasDirty=true;return slot;
}
function draw(time){
  request=0;if(dead||failed||reduced()||document.hidden)return;
  if(time-last<50){schedule();return;}last=time;
  const list=[...surfaces.values()].filter(s=>s.visible&&s.node.getClientRects().length&&(!s.node.closest('dialog')||s.node.closest('dialog').open)).slice(0,18);
  if(!list.length)return;
  try{
    const begin=performance.now();
    framePhotos=new Set(list.map(s=>(s.node.closest('.card-image')?.querySelector('img')||s.node.closest('.pn-cover')?.querySelector('.pn-hero-environment'))?.currentSrc).filter(Boolean));
    initialize();light=light.map((v,i)=>v+(target[i]-v)*.28);
    const ratio=Math.min(2,Math.sqrt(2400000/(innerWidth*innerHeight)),gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)/Math.max(innerWidth,innerHeight));
    const w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);if(source.width!==w||source.height!==h){source.width=w;source.height=h;}
    gl.viewport(0,0,w,h);gl.useProgram(program);gl.bindVertexArray(vao);
    const rects=new Float32Array(72),optics=new Float32Array(72),photos=new Float32Array(72),slots=new Float32Array(18).fill(-1),bounds=[];
    list.forEach((s,i)=>{
      const r=s.node.getBoundingClientRect();bounds.push(r);const panel=s.node.matches('.pn-form-panel,.pn-catalog-toolbar');
      rects.set([r.left+r.width/2,r.top+r.height/2,r.width/2,r.height/2],i*4);
      const radius=Math.min(parseFloat(getComputedStyle(s.node).borderRadius)||24,r.height/2,r.width/2);
      optics.set([radius,panel?.65:1,panel?0:1,s.node===pressed?1:0],i*4);
      const img=s.node.closest('.card-image')?.querySelector('img')||s.node.closest('.pn-cover')?.querySelector('.pn-hero-environment');
      if(img){const slot=imageSlot(img);if(slot>=0){const p=img.getBoundingClientRect();slots[i]=slot;photos.set([p.left,p.top,p.width,p.height],i*4);}}
    });
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    if(atlasDirty){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);atlasDirty=false;}
    const u=uniforms;gl.uniform1i(u.uAtlas,0);gl.uniform2f(u.uSize,innerWidth,innerHeight);gl.uniform2f(u.uResolution,w,h);gl.uniform2f(u.uLight,...light);
    gl.uniform4fv(u['uRects[0]'],rects);gl.uniform4fv(u['uOptics[0]'],optics);gl.uniform4fv(u['uPhotoRects[0]'],photos);gl.uniform1fv(u['uPhotoSlots[0]'],slots);gl.uniform1i(u.uCount,list.length);
    gl.uniform1f(u.uEnergy,2.0);gl.uniform1f(u.uThickness,18);gl.uniform1f(u.uIOR,1.58);gl.uniform1f(u.uChroma,1);gl.uniform1f(u.uHue,(light[0]-.5)*.35);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
    list.forEach((s,i)=>{
      const r=bounds[i],cw=Math.max(1,Math.round(r.width*ratio)),ch=Math.max(1,Math.round(r.height*ratio));
      if(s.canvas.width!==cw||s.canvas.height!==ch){s.canvas.width=cw;s.canvas.height=ch;}
      s.context.clearRect(0,0,cw,ch);
      s.context.drawImage(source,r.left*ratio,r.top*ratio,r.width*ratio,r.height*ratio,0,0,cw,ch);
      s.node.dataset.liquidReady='true';
    });
    draws++;const elapsed=performance.now()-begin;cpuTotal+=elapsed;cpuMax=Math.max(cpuMax,elapsed);
    document.documentElement.dataset.liquidState='active';
    document.documentElement.style.setProperty('--pn-liquid-hue',((light[0]-.5)*100).toFixed(1)+'deg');
    document.documentElement.dataset.liquidMetrics=JSON.stringify({contexts:1,surfaces:list.length,width:w,height:h,draws,cpuMean:cpuTotal/draws,cpuMax});
    if(Math.hypot(light[0]-target[0],light[1]-target[1])>.003)schedule();
  }catch(error){failed=true;release();console.info('VINLUME Liquid: fallback CSS.',error.message);}
}
function sync(){if(reduced())release();else{discover();schedule();}}
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;target=[e.clientX/innerWidth,e.clientY/innerHeight];schedule();},{...events,passive:true});
document.addEventListener('pointerdown',e=>{pressed=e.target.closest(selector);schedule();},events);
window.addEventListener('pointerup',()=>{pressed=null;schedule();},events);
document.addEventListener('focusin',e=>{const n=e.target.closest(selector);if(n){const r=n.getBoundingClientRect();target=[(r.left+r.width/2)/innerWidth,(r.top+r.height/2)/innerHeight];schedule();}},events);
window.addEventListener('scroll',schedule,{...events,passive:true});window.addEventListener('resize',()=>{images.clear();atlasDirty=true;schedule();},{...events,passive:true});
document.addEventListener('load',schedule,{...events,capture:true});
document.addEventListener('pn:effectschange',sync,events);document.addEventListener('pn:storychange',schedule,events);
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(!visible){cancelAnimationFrame(request);request=0;}else schedule();},events);
[motion,forced,compact].forEach(q=>q.addEventListener('change',sync,events));
window.addEventListener('pagehide',()=>release(),events);window.addEventListener('pageshow',sync,events);
source.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;release();},events);
window.VinlumeLiquid={destroy(){dead=true;release();observer.disconnect();resize.disconnect();abort.abort();surfaces.forEach(s=>s.canvas.remove());}};
sync();
