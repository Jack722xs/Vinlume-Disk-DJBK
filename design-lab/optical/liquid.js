/* A screen-space optical lens, aligned with native, functional HTML controls. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s),stage=$('#stage'),canvas=$('#liquid'),status=$('#renderer-status'),metrics=$('#metrics');
  const thickness=$('#thickness'),refraction=$('#refraction'),ambient=$('#ambient'),quality=$('#resolution'),chroma=$('#chroma'),freeze=$('#freeze'),staticMode=$('#static');
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)');
  const abort=new AbortController(),events={signal:abort.signal};
  let renderer=null,request=0,last=0,visible=false,disposed=false,failed='',pressed=null,preset=0;
  let light=[.3,.2],target=[...light],sizeDirty=true;
  const reduced=()=>motion.matches||forced.matches||staticMode.checked;
  const names=['violeta','azul frío','prisma cálido'],angles=[0,-.55,.8];
  const vertex=`#version 300 es
    in vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}`;
  const fragment=`#version 300 es
    precision highp float;
    uniform vec2 uSize;uniform vec2 uResolution;uniform vec2 uLight;uniform float uEnergy;
    uniform vec4 uRects[12];uniform vec4 uOptics[12];uniform int uCount;
    uniform float uThickness;uniform float uIOR;uniform float uChroma;uniform float uHue;
    out vec4 outColor;
    ${window.OpticalStudioGLSL}
    float box(vec2 p,vec4 r,float radius){vec2 q=abs(p-r.xy)-(r.zw-radius);return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;}
    vec3 hue(vec3 c){vec3 axis=normalize(vec3(1.));return c*cos(uHue)+cross(axis,c)*sin(uHue)+axis*dot(axis,c)*(1.-cos(uHue));}
    vec3 backdrop(vec2 p){vec2 uv=vec2(p.x/uSize.x,1.-p.y/uSize.y);return max(vec3(0.),hue(opticalStudio(uv,vec2(uLight.x,1.-uLight.y),uEnergy)));}
    vec3 displayColor(vec3 c){c=c/(vec3(1.)+c*.65);return pow(clamp(c,0.,1.),vec3(1./2.2));}
    float heightAt(vec2 p,vec4 r,vec4 o){
      float distance=-box(p,r,o.x),rim=max(2.,min(o.x,min(r.z,r.w))*.88);
      float q=clamp(1.-distance/rim,0.,1.);
      return (uThickness*o.y+2.)*sqrt(max(0.,1.-q*q))*(1.-o.w*.12);
    }
    vec3 transmit(vec2 p,vec3 normal,float eta,float depth){
      vec3 ray=refract(vec3(0.,0.,-1.),normal,1./eta);
      vec2 offset=ray.xy/max(.2,abs(ray.z))*depth*3.6;
      return backdrop(p+offset);
    }
    void main(){
      vec2 p=vec2(gl_FragCoord.x,uResolution.y-gl_FragCoord.y)*uSize/uResolution;
      vec3 base=backdrop(p);int chosen=-1;float distance=1000.;
      // Last shape wins: panel, button, slider tracks, lenses, switch.
      for(int i=0;i<12;i++){
        if(i>=uCount)break;
        float d=box(p,uRects[i],uOptics[i].x);
        if(d<1.3){chosen=i;distance=d;}
      }
      if(chosen<0){outColor=vec4(displayColor(base),1.);return;}
      vec4 r=uRects[chosen],o=uOptics[chosen];
      float dx=heightAt(p+vec2(.65,0.),r,o)-heightAt(p-vec2(.65,0.),r,o);
      float dy=heightAt(p+vec2(0.,.65),r,o)-heightAt(p-vec2(0.,.65),r,o);
      vec2 crown=(p-r.xy)/max(r.zw,vec2(1.));
      vec3 n=normalize(vec3(-dx-crown.x*.10,-dy-crown.y*.14,1.1));
      float depth=uThickness*o.y+12.;
      float separation=uChroma*.022;
      float magnification=1.+uThickness*.015*o.y*(uIOR-1.);
      vec2 lensPoint=r.xy+(p-r.xy)/magnification;
      vec3 red=transmit(lensPoint,n,uIOR-separation,depth);
      vec3 green=transmit(lensPoint,n,uIOR,depth);
      vec3 blue=transmit(lensPoint,n,uIOR+separation,depth);
      vec3 transmission=vec3(red.r,green.g,blue.b);
      // Slight absorption protects label contrast without painting an opaque face.
      transmission*=o.z<.5?.62:.96;
      vec3 l=normalize(vec3((uLight*uSize-r.xy)/max(uSize.x,uSize.y)*1.4,1.25));
      vec3 h=normalize(l+vec3(0.,0.,1.));
      float edge=1.-smoothstep(1.,min(20.,o.x*.8),max(0.,-distance));
      float spec=pow(max(0.,dot(n,h)),65.)*edge;
      float f0=pow((uIOR-1.)/(uIOR+1.),2.);
      float fresnel=f0+(1.-f0)*pow(1.-max(0.,n.z),5.);
      float rim=exp(-pow((distance+1.2)/1.15,2.));
      float directional=.3+.7*max(0.,dot(normalize(vec3(n.xy,.25)),l));
      vec3 reflection=vec3(.82,.92,1.)*(fresnel*.18+spec*.55+rim*.26*directional)*sqrt(uEnergy);
      // The track has its own optical wall and a slightly darker transmitted core.
      if(o.z>1.5&&o.z<2.5)transmission*=.6;
      vec3 material=transmission+reflection+o.w*edge*.035;
      float aa=.8*max(uSize.x/uResolution.x,uSize.y/uResolution.y),coverage=1.-smoothstep(-aa,aa,distance);
      vec3 color=mix(base,material,coverage);
      outColor=vec4(displayColor(color),1.);
    }`;

  function initialize(){
    if(renderer||failed||disposed||reduced()||!visible)return;
    let gl,program,buffer,vao;
    try{
      gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
      if(!gl)throw new Error('WebGL 2 no disponible');
      const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(message);}return shader;};
      const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
      program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);vao=gl.createVertexArray();gl.bindVertexArray(vao);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      const uniforms=Object.fromEntries(['uSize','uResolution','uLight','uEnergy','uRects[0]','uOptics[0]','uCount','uThickness','uIOR','uChroma','uHue'].map(n=>[n,gl.getUniformLocation(program,n)]));
      const timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
      renderer={gl,program,buffer,vao,uniforms,timer,query:null,poll:0,draws:0,cpu:0,cpuMax:0,gpu:[],pixelScale:0};sizeDirty=true;
    }catch(error){failed=error.message;if(gl){gl.useProgram(null);gl.bindVertexArray(null);if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);if(buffer)gl.deleteBuffer(buffer);}status.textContent='Superficies estáticas / '+failed;report();}
  }
  function release(){
    if(renderer){const s=renderer;clearTimeout(s.poll);if(s.query)s.gl.deleteQuery(s.query);s.gl.useProgram(null);s.gl.bindVertexArray(null);s.gl.deleteVertexArray(s.vao);s.gl.bindBuffer(s.gl.ARRAY_BUFFER,null);s.gl.deleteBuffer(s.buffer);s.gl.deleteProgram(s.program);renderer=null;}
    canvas.width=1;canvas.height=1;delete stage.dataset.ready;
  }
  function shapes(){
    const rects=new Float32Array(48),optics=new Float32Array(48),root=stage.getBoundingClientRect();let count=0;
    function add(r,radius,depth,kind,pressure=0){if(count>=12||r.width<=0)return;rects.set([r.left-root.left+r.width/2,r.top-root.top+r.height/2,r.width/2,r.height/2],count*4);optics.set([radius,depth,kind,pressure],count*4);count++;}
    const panel=$('[data-glass=panel]'),panelRect=panel.getBoundingClientRect();add(panelRect,parseFloat(getComputedStyle(panel).borderRadius),.6,0);
    document.querySelectorAll('[data-glass=button]').forEach(node=>{const r=node.getBoundingClientRect();add(r,Math.min(r.height/2,r.width/2),1.,1,pressed===node?1:0);});
    document.querySelectorAll('[data-range]').forEach(shell=>{
      const input=shell.querySelector('input'),r=input.getBoundingClientRect(),t=(+input.value-+input.min)/(+input.max-+input.min),w=62;
      add({left:r.left,top:r.top+r.height/2-4,width:r.width,height:8},4,.22,2);
      add({left:r.left+t*(r.width-w),top:r.top+r.height/2-18,width:w,height:36},18,1.15,3,pressed===input?1:0);
    });
    const toggle=chroma.getBoundingClientRect();add(toggle,toggle.height/2,.6,1,pressed===chroma?1:0);
    const thumb=chroma.querySelector('span').getBoundingClientRect();add(thumb,thumb.width/2,1.,3);
    return {rects,optics,count,root};
  }
  function readGPU(s){
    if(s!==renderer||!s.query)return;clearTimeout(s.poll);if(!visible||document.hidden||reduced())return;
    if(s.gl.getQueryParameter(s.query,s.gl.QUERY_RESULT_AVAILABLE)){
      if(!s.gl.getParameter(s.timer.GPU_DISJOINT_EXT)){s.gpu.push(s.gl.getQueryParameter(s.query,s.gl.QUERY_RESULT)/1e6);if(s.gpu.length>80)s.gpu.shift();}
      s.gl.deleteQuery(s.query);s.query=null;report();
    }else{s.poll=setTimeout(()=>readGPU(s),60);}
  }
  function report(){const s=renderer;
    if(!s){metrics.textContent=reduced()?'Modo estático: controles nativos, sin renderer ni bucle GPU.':failed?'Fallback activo: '+failed:'Esperando visibilidad.';return;}
    const avg=s.gpu.length?s.gpu.reduce((a,b)=>a+b,0)/s.gpu.length:0;
    metrics.textContent=`WebGL 2 / fondo procedural sin textura raster · ${canvas.width} × ${canvas.height}\nResolución solicitada ${quality.value}× · efectiva ${s.pixelScale.toFixed(2)}× · una pasada\nLentes alineadas con ${s.count||0} superficies HTML · 3 recorridos RGB por lente\nDibujos: ${s.draws} · CPU preparación/envío media ${s.draws?(s.cpu/s.draws).toFixed(2):'0'} ms · máximo ${s.cpuMax.toFixed(2)} ms\nGPU: ${s.gpu.length?'media '+avg.toFixed(2)+' ms · último '+s.gpu.at(-1).toFixed(2)+' ms · '+s.gpu.length+' consultas':s.timer?'esperando consulta':'consulta no disponible'}\nBucle: ${request?'activo':'detenido'} · ${visible&&!document.hidden?'visible':'pausado'}\nEspesor ${thickness.value} px · IOR ${(+refraction.value/100).toFixed(2)} · luz ${ambient.value}%\nTiempo GPU no equivale a energía, temperatura o FPS sostenidos.`;
  }
  function frame(time){
    request=0;if(disposed||reduced()||!visible||document.hidden)return;
    if(time-last<33.34){request=requestAnimationFrame(frame);return;}last=time;
    initialize();if(!renderer)return;
    const s=renderer,{gl,uniforms:u}=s;if(s.query){readGPU(s);if(s.query){request=requestAnimationFrame(frame);report();return;}}const begin=performance.now();
    light=light.map((v,i)=>v+(target[i]-v)*.25);
    const {root,rects,optics,count}=shapes();s.count=count;
    if(sizeDirty){
      const limit=Math.min(8192,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)),viewport=gl.getParameter(gl.MAX_VIEWPORT_DIMS);
      const ratio=Math.min(+quality.value,limit/root.width,limit/root.height,viewport[0]/root.width,viewport[1]/root.height,Math.sqrt(24000000/(root.width*root.height)));
      canvas.width=Math.round(root.width*ratio);canvas.height=Math.round(root.height*ratio);s.pixelScale=ratio;
      gl.viewport(0,0,canvas.width,canvas.height);sizeDirty=false;
    }
    gl.uniform2f(u.uSize,root.width,root.height);gl.uniform2f(u.uResolution,canvas.width,canvas.height);gl.uniform2f(u.uLight,...light);
    gl.uniform4fv(u['uRects[0]'],rects);gl.uniform4fv(u['uOptics[0]'],optics);gl.uniform1i(u.uCount,count);
    gl.uniform1f(u.uThickness,+thickness.value);gl.uniform1f(u.uIOR,+refraction.value/100);gl.uniform1f(u.uChroma,chroma.getAttribute('aria-checked')==='true'?1:0);gl.uniform1f(u.uHue,angles[preset]);
    gl.uniform1f(u.uEnergy,+ambient.value/100);
    const query=s.timer&&!s.query?gl.createQuery():null;if(query){s.query=query;gl.beginQuery(s.timer.TIME_ELAPSED_EXT,query);}
    gl.drawArrays(gl.TRIANGLES,0,6);const duration=performance.now()-begin;s.cpu+=duration;s.cpuMax=Math.max(s.cpuMax,duration);s.draws++;
    if(query){gl.endQuery(s.timer.TIME_ELAPSED_EXT);s.poll=setTimeout(()=>readGPU(s),60);}
    stage.dataset.ready='true';status.textContent='Lentes refractivas / controles HTML';
    if(Math.hypot(light[0]-target[0],light[1]-target[1])>.002)request=requestAnimationFrame(frame);report();
  }
  function schedule(){if(!request&&!disposed&&!reduced()&&visible&&!document.hidden)request=requestAnimationFrame(frame);}
  function sync(){cancelAnimationFrame(request);request=0;if(reduced()){release();status.textContent='Superficies estáticas / controles activos';report();}else{status.textContent='Material preparado / esperando visibilidad';schedule();report();}}
  function values(){
    $('#thickness-value').textContent=thickness.value+' px';$('#refraction-value').textContent=(+refraction.value/100).toFixed(2).replace('.',',');$('#ambient-value').textContent=ambient.value+'%';stage.style.setProperty('--studio-energy',+ambient.value/130);schedule();
  }
  [thickness,refraction,ambient].forEach(n=>n.addEventListener('input',values,events));
  quality.addEventListener('change',()=>{sizeDirty=true;schedule();},events);
  $('#change-light').addEventListener('click',()=>{preset=(preset+1)%3;stage.style.setProperty('--backdrop-hue',angles[preset]*180/Math.PI+'deg');$('#scene-label').textContent='Estudio / '+names[preset];$('#action-status').textContent='Iluminación cambiada a '+names[preset]+'.';schedule();},events);
  freeze.addEventListener('click',()=>{const frozen=freeze.getAttribute('aria-pressed')!=='true';freeze.setAttribute('aria-pressed',String(frozen));freeze.setAttribute('aria-label',frozen?'Reanudar respuesta al puntero':'Congelar respuesta al puntero');freeze.querySelector('span').textContent=frozen?'▷':'Ⅱ';$('#action-status').textContent=frozen?'Respuesta al puntero congelada. Los ajustes siguen activos.':'La luz vuelve a seguir al puntero.';schedule();},events);
  chroma.addEventListener('click',()=>{const checked=chroma.getAttribute('aria-checked')!=='true';chroma.setAttribute('aria-checked',String(checked));$('#action-status').textContent=checked?'Dispersión cromática activada.':'Dispersión cromática desactivada.';schedule();},events);
  stage.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||freeze.getAttribute('aria-pressed')==='true'||reduced())return;const r=stage.getBoundingClientRect();target=[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];schedule();},events);
  stage.addEventListener('pointerdown',e=>{pressed=e.target.closest('button,input');schedule();},events);
  stage.addEventListener('keydown',e=>{if([' ','Enter','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){pressed=e.target.closest('button,input');schedule();}},events);
  stage.addEventListener('keyup',()=>clearPressure(),events);
  function clearPressure(){if(pressed){pressed=null;schedule();}}
  window.addEventListener('pointerup',clearPressure,events);window.addEventListener('pointercancel',clearPressure,events);window.addEventListener('blur',clearPressure,events);
  stage.addEventListener('focusin',e=>{if(freeze.getAttribute('aria-pressed')==='true')return;const a=e.target.getBoundingClientRect(),b=stage.getBoundingClientRect();target=[(a.left-b.left+a.width/2)/b.width,(a.top-b.top+a.height/2)/b.height];schedule();},events);
  staticMode.addEventListener('change',sync,events);motion.addEventListener('change',sync,events);forced.addEventListener('change',sync,events);
  const resize=new ResizeObserver(()=>{sizeDirty=true;schedule();});resize.observe(stage);
  const intersection=new IntersectionObserver(e=>{visible=e[0].isIntersecting&&e[0].intersectionRatio>=.1;if(!visible){cancelAnimationFrame(request);request=0;if(renderer)clearTimeout(renderer.poll);}else schedule();report();},{threshold:[0,.1]});intersection.observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(request);request=0;if(renderer)clearTimeout(renderer.poll);pressed=null;}else schedule();report();},events);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(request);request=0;release();failed='Contexto perdido';status.textContent='Superficies estáticas / contexto perdido';report();},events);
  canvas.addEventListener('webglcontextrestored',()=>{failed='';schedule();},events);
  window.addEventListener('pagehide',e=>{cancelAnimationFrame(request);request=0;if(renderer)clearTimeout(renderer.poll);if(!e.persisted){disposed=true;release();resize.disconnect();intersection.disconnect();abort.abort();}},events);
  window.addEventListener('pageshow',schedule,events);
  sync();
})();
