/* Isolated optical study. No network, frameworks, fonts, or production imports. */
(() => {
  'use strict';
  const G = window.OpticalGeometry, stage = document.querySelector('#stage');
  const canvas = document.querySelector('#optical'), svg = document.querySelector('#svg-demo');
  const status = document.querySelector('#engine-status'), metrics = document.querySelector('#metrics');
  const xInput = document.querySelector('#light-x'), yInput = document.querySelector('#light-y');
  const dispersionInput = document.querySelector('#dispersion'), staticInput = document.querySelector('#static');
  const motion = matchMedia('(prefers-reduced-motion: reduce)'), abort = new AbortController();
  const opts = {signal: abort.signal};
  let mode = 'webgl', gl = null, gpu = null, failed = false, failureReason = '', visible = true, disposed = false;
  let request = 0, last = 0, light = [-.4,-.55], target = [...light], scale = 1;
  let frames = 0, cpuTotal = 0, cpuMax = 0, resized = true, svgFaces = [];
  const reduced = () => motion.matches || staticInput.checked;
  const ns = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    const node = document.createElementNS(ns,name);
    Object.entries(attrs).forEach(([k,v]) => node.setAttribute(k,v));
    parent.append(node); return node;
  }
  const path = G.outlines.map(p => 'M'+p.map(v=>v.join(',')).join('L')+'Z').join(' ');
  svg.setAttribute('viewBox',`0 0 ${G.width} ${G.height}`);
  const defs = el('defs',{},svg);
  const clip = el('clipPath',{id:'letters'},defs);el('path',{d:path},clip);
  // A literal background witness: its displaced duplicate is visible through the cuts.
  const grid = el('pattern',{id:'witness',width:130,height:95,patternUnits:'userSpaceOnUse',patternTransform:'rotate(-18)'},defs);
  el('rect',{width:130,height:95,fill:'#0e121b'},grid);
  el('path',{d:'M0 0H130M0 0V95',stroke:'#a4b7d1','stroke-width':1.3,opacity:.35},grid);
  el('path',{d:'M65 0V95',stroke:'#dcdee7','stroke-width':9,opacity:.14},grid);
  el('rect',{width:G.width,height:G.height,fill:'url(#witness)',opacity:.12},svg);
  const caustic = el('g',{},svg);
  const causticFaces = G.faces.map(face=>[el('polygon',{fill:'#bbc5dd',opacity:0},caustic),face]);
  el('path',{d:path,transform:'translate(3 7)',fill:'#181c2a',stroke:'#8792ae','stroke-width':1.2},svg);
  const refracted = el('g',{'clip-path':'url(#letters)'},svg);
  const glassGrid = el('rect',{x:-100,y:-100,width:G.width+200,height:G.height+200,fill:'url(#witness)'},refracted);
  for (const face of G.faces) {
    const node = el('polygon',{points:face.p.map(p=>p.join(',')).join(' '),'stroke-width':.35},svg);
    svgFaces.push([node,face]);
  }
  el('path',{d:path,fill:'none',stroke:'#e9f2ff','stroke-width':.9,opacity:.75},svg);
  function drawSVG() {
    const L=normalize([light[0],light[1],.9]), D=+dispersionInput.value/100;
    for(const [node,face] of svgFaces) {
      const n=face.n, dot=Math.max(0,n[0]*L[0]+n[1]*L[1]+n[2]*L[2]);
      const spec=Math.pow(Math.max(0,n[0]*L[0]*.6+n[1]*L[1]*.6+n[2]*.86),18);
      const value=42+dot*135+spec*115;
      const spectral=Math.sin(n[0]*8+light[0]*4+n[1]*5+light[1]*3)*D*(face.edge?35:15);
      const rgb=[value+spectral,value+9-Math.abs(spectral)*.3,value+20-spectral].map(v=>Math.round(Math.max(0,Math.min(255,v))));
      node.setAttribute('fill',`rgb(${rgb})`);node.setAttribute('fill-opacity',face.edge?.94:.76);
      node.setAttribute('stroke',`rgba(${rgb},.55)`);
    }
    glassGrid.setAttribute('transform',`translate(${light[0]*24},${light[1]*18}) skewX(${light[0]*8})`);
    causticFaces.forEach(([node,face])=>{
      const n=face.n,dot=Math.max(0,n[0]*L[0]+n[1]*L[1]+n[2]*L[2]);
      node.setAttribute('points',face.p.map(([x,y])=>[x+n[0]*28+light[0]*32,330+(y-170)*.16+n[1]*15+light[1]*12].join(',')).join(' '));
      node.setAttribute('opacity',Math.pow(dot,6)*.1);
    });
  }
  function normalize(v){const l=Math.hypot(...v);return v.map(x=>x/l);}
  const vertex = `precision mediump float;attribute vec2 aPos;attribute vec3 aNormal;attribute float aEdge;
    uniform vec2 uSize;uniform vec2 uLight;uniform float uPass;
    varying vec2 vPos;varying vec3 vNormal;varying float vEdge;
    void main(){vec2 p=aPos;vPos=aPos;vNormal=aNormal;vEdge=aEdge;
    if(uPass>0.5&&uPass<1.5){p.x+=aNormal.x*28.+uLight.x*32.;p.y=330.+(aPos.y-170.)*.16+aNormal.y*15.+uLight.y*12.;}
    gl_Position=vec4(p.x/uSize.x*2.-1.,1.-p.y/uSize.y*2.,0.,1.);}`;
  const fragment = `precision mediump float;
    uniform vec2 uSize;uniform vec2 uLight;uniform float uDispersion;uniform float uPass;
    varying vec2 vPos;varying vec3 vNormal;varying float vEdge;
    vec3 environment(vec2 p){
      p+=uLight*.12;
      vec3 c=vec3(.028,.035,.052);
      // Shared studio light cards and backdrop: sampled at refracted coordinates.
      float stripe=exp(-pow((p.x*.62+p.y*.9-.46)*28.,2.));
      float card=exp(-pow((p.x*.8-p.y*.35-.35)*9.,2.));
      float band=exp(-pow((p.y+.12*p.x-.48)*27.,2.));
      vec2 grid=abs(fract(p*vec2(11.,7.))-.5);
      float line=1.-smoothstep(.008,.018,min(grid.x,grid.y));
      c+=vec3(.66,.72,.85)*stripe+vec3(.32,.29,.39)*card+vec3(.14,.19,.22)*band;
      c+=vec3(.08,.10,.13)*line;
      return c;
    }
    vec3 sampleGlass(vec3 incident,vec3 n,float eta,vec2 uv){
      vec3 ray=refract(incident,n,1./eta);
      vec2 entry=uv+ray.xy/max(.25,abs(ray.z))*.22;
      vec3 exitRay=refract(ray,normalize(vec3(-n.xy*.52,n.z)),eta);
      // Total internal reflection approximation; no scene ray tracing.
      float tir=1.-step(.01,length(exitRay));
      return mix(environment(entry+exitRay.xy*.14),environment(entry-ray.xy*.26)*1.1,tir);
    }
    void main(){vec2 uv=vPos/uSize;
      if(uPass>1.5){gl_FragColor=vec4(environment(uv)*.12,1.);return;}
      vec3 n=normalize(vec3(vNormal.xy,-vNormal.z));
      vec3 l=normalize(vec3(uLight,-.85));
      if(uPass>.5){
        float focus=pow(max(0.,dot(n,l)),6.)*.1;
        vec3 spectrum=.65+.35*cos(vec3(0.,2.1,4.2)+vNormal.x*6.+uLight.x*3.+uLight.y*2.);
        gl_FragColor=vec4(mix(vec3(.7,.8,1.),spectrum,uDispersion),focus);return;
      }
      vec3 incident=normalize(vec3((uv-.5)*.09,1.));
      float d=uDispersion*.22;
      vec3 rr=sampleGlass(incident,n,1.52-d,uv);
      vec3 gg=sampleGlass(incident,n,1.52,uv);
      vec3 bb=sampleGlass(incident,n,1.52+d,uv);
      vec3 transmission=vec3(rr.r,gg.g,bb.b);
      vec3 reflected=reflect(incident,n);
      vec3 reflection=environment(uv+reflected.xy*.6+uLight*.19);
      float fresnel=.043+.957*pow(1.-max(0.,dot(-incident,n)),5.);
      vec3 halfVector=normalize(l-incident);
      float spec=pow(max(0.,dot(n,halfVector)),95.);
      float soft=pow(max(0.,dot(n,l)),4.);
      vec3 color=transmission*.9+reflection*(.28+fresnel*.65);
      // Controlled crown illumination keeps the full word readable.
      color+=vec3(.12,.14,.17)+soft*vec3(.21,.23,.26);
      color+=spec*vec3(1.,.99,.96)*1.3;
      color+=vEdge*(.05+pow(max(0.,dot(n,l)),12.)*.7);
      color=vec3(1.)-exp(-color*1.45);
      gl_FragColor=vec4(pow(color,vec3(.88)),1.);
    }`;
  function createGPU(){
    if(gl||failed||reduced())return;
    try {
      gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:false,stencil:false,powerPreference:'low-power',preserveDrawingBuffer:false});
      if(!gl)throw new Error('WebGL no disponible');
      const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(message);}return s;};
      const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const vertices=[];
      const push=(p,n,e)=>vertices.push(...p,...n,e);
      [[0,0],[G.width,0],[0,G.height],[0,G.height],[G.width,0],[G.width,G.height]].forEach(p=>push(p,[0,0,1],0));
      G.faces.forEach(f=>f.p.forEach(p=>push(p,f.n,f.edge)));
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
      [['aPos',2,0],['aNormal',3,8],['aEdge',1,20]].forEach(([name,size,offset])=>{const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,24,offset);});
      const uniforms=Object.fromEntries(['uSize','uLight','uPass','uDispersion'].map(n=>[n,gl.getUniformLocation(program,n)]));
      gpu={program,buffer,uniforms};gl.uniform2f(uniforms.uSize,G.width,G.height);resized=true;
    }catch(error){failed=true;failureReason=error.message;status.textContent='WebGL no disponible · SVG activo';releaseGPU();}
  }
  function releaseGPU(){if(gl&&gpu){gl.deleteBuffer(gpu.buffer);gl.deleteProgram(gpu.program);}gpu=null;gl=null;canvas.width=1;canvas.height=1;resized=true;}
  function drawGL(){
    if(resized){const r=stage.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.5)*scale;
      canvas.width=Math.max(1,Math.min(1800,Math.round(r.width*ratio)));canvas.height=Math.round(canvas.width*G.height/G.width);
      gl.viewport(0,0,canvas.width,canvas.height);resized=false;}
    const u=gpu.uniforms;gl.uniform2f(u.uLight,light[0],light[1]);gl.uniform1f(u.uDispersion,+dispersionInput.value/100);
    gl.disable(gl.BLEND);gl.uniform1f(u.uPass,2);gl.drawArrays(gl.TRIANGLES,0,6);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.uniform1f(u.uPass,1);gl.drawArrays(gl.TRIANGLES,6,G.faces.length*3);
    gl.disable(gl.BLEND);gl.uniform1f(u.uPass,0);gl.drawArrays(gl.TRIANGLES,6,G.faces.length*3);
  }
  function report(){metrics.textContent=`Método: ${stage.dataset.renderer||'fallback estático'}\nGeometría: ${G.faces.length} triángulos / ${G.faces.length*3} vértices\nDibujos de sesión: ${frames} · CPU envío media ${frames?(cpuTotal/frames).toFixed(2):'0'} ms · máximo ${cpuMax.toFixed(2)} ms\nBuffer WebGL: ${gpu?canvas.width+' × '+canvas.height:'no activo'} · ${gpu?'3':'0'} draw calls por actualización\nBucle pendiente: ${request?'sí':'no'} · visibilidad: ${visible&&!document.hidden?'visible':'pausado'}\nMovimiento del sistema: ${motion.matches?'reducido':'normal'} · escala adaptativa: ${scale.toFixed(2)}\n${failureReason?'Motivo de fallback: '+failureReason+'\n':''}GPU real, energía y FPS sostenidos: no medidos por este contador.`;}
  function frame(time){
    request=0;if(disposed||!visible||document.hidden||reduced()){report();return;}
    if(time-last<33.34){request=requestAnimationFrame(frame);return;}last=time;
    light=light.map((v,i)=>v+(target[i]-v)*.25);
    if(mode==='webgl'&&!failed)createGPU();
    const begin=performance.now();
    if(mode==='webgl'&&gpu){drawGL();stage.dataset.renderer='webgl';status.textContent='WebGL / refracción RGB';}
    else{drawSVG();stage.dataset.renderer='svg';status.textContent=failed&&mode==='webgl'?'Fallback SVG / WebGL no disponible':'SVG / caras iluminadas';}
    const duration=performance.now()-begin;frames++;cpuTotal+=duration;cpuMax=Math.max(cpuMax,duration);
    if(gpu&&duration>8&&scale>.6){scale=Math.max(.6,scale-.1);resized=true;}
    if(Math.hypot(light[0]-target[0],light[1]-target[1])>.002)request=requestAnimationFrame(frame);
    report();
  }
  function schedule(){if(!request&&!disposed&&visible&&!document.hidden&&!reduced())request=requestAnimationFrame(frame);}
  function sync(){cancelAnimationFrame(request);request=0;
    if(reduced()){delete stage.dataset.renderer;releaseGPU();status.textContent=motion.matches?'Estático / movimiento reducido del sistema':'Estático / sin renderizado activo';}
    else{if(mode==='svg')releaseGPU();schedule();}report();}
  function setLight(x,y){target=[x,y];xInput.value=Math.round(x*100);yInput.value=Math.round(y*100);schedule();}
  stage.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||reduced())return;const r=stage.getBoundingClientRect();setLight((e.clientX-r.left)/r.width*2-1,(e.clientY-r.top)/r.height*2-1);},opts);
  stage.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||reduced())return;const r=stage.getBoundingClientRect();setLight((e.clientX-r.left)/r.width*2-1,(e.clientY-r.top)/r.height*2-1);},opts);
  [xInput,yInput].forEach(n=>n.addEventListener('input',()=>setLight(+xInput.value/100,+yInput.value/100),opts));
  dispersionInput.addEventListener('input',schedule,opts);staticInput.addEventListener('change',sync,opts);motion.addEventListener('change',sync,opts);
  document.querySelector('#reset').addEventListener('click',()=>{dispersionInput.value=55;setLight(-.4,-.55);},opts);
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{
    mode=b.dataset.mode;frames=0;cpuTotal=0;cpuMax=0;document.querySelectorAll('[data-mode]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));
    document.querySelector('#material-title').textContent=mode==='svg'?'02 / Talla editorial':'01 / Cristal refractivo';
    document.querySelector('#description').textContent=mode==='svg'?'Caras vectoriales iluminadas por sus normales. Transparencia y desplazamiento del fondo mediante clip; dispersión aproximada en las caras. Más gráfico, menos profundidad óptica.':'Refracción RGB, reflexión Fresnel y caras ópticas con normales independientes. Entorno de estudio procedural, sin imágenes ni librerías externas.';
    sync();
  },opts));
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(request);request=0;}else schedule();report();},{threshold:.01});observer.observe(stage);
  const resize=new ResizeObserver(()=>{resized=true;schedule();});resize.observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(request);request=0;report();}else schedule();},opts);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;gpu=null;gl=null;delete stage.dataset.renderer;schedule();},opts);
  canvas.addEventListener('webglcontextrestored',()=>{failed=false;schedule();},opts);
  // Diagnostics in the UI, rather than swallowing render failures.
  window.addEventListener('error',()=>{status.textContent='Error de ejecución · fallback disponible';delete stage.dataset.renderer;},opts);
  window.addEventListener('pagehide',e=>{cancelAnimationFrame(request);request=0;if(!e.persisted){disposed=true;observer.disconnect();resize.disconnect();abort.abort();releaseGPU();}},opts);
  window.addEventListener('pageshow',()=>{if(!disposed)schedule();},opts);
  const refs=[
    ['diamond-glass/diamond.png','Diamante · caras, profundidad y destellos selectivos'],
    ['diamond-glass/diamante 2.webp','Diamante · reflexión y contraste interno'],
    ['chromatic-dispersion/images.jpeg','Prisma · separación espectral por dirección'],
    ['chromatic-dispersion/luz-prisma.avif','Dispersión · abanico de longitudes de onda'],
    ['caustics/what_is_caustic_2_0cd8cd6d1b.jpg','Caústicas · concentración de luz proyectada'],
    ['caustics/el-efecto-cáustico-hermoso-como-luz-pasa-través-de-un-vidrio-111047731.webp','Caústicas · luz y volumen'],
    ['liquid-glass/1_B6XDO0cCNt0A2EBc1bn8YQ.webp','Liquid glass · transmisión y borde'],
    ['liquid-glass/4993c6d8-d46a-4f31-89c7-c47a98696d37.avif','Liquid glass · espesor aparente'],
    ['liquid-glass/button.jpeg','Liquid glass · legibilidad sobre material']
  ];
  refs.forEach(([file,label])=>{const figure=document.createElement('figure'),a=document.createElement('a'),img=document.createElement('img'),caption=document.createElement('figcaption');a.href='../../design-references/'+file;a.target='_blank';a.rel='noopener';img.src=a.href;img.alt=label;img.loading='lazy';img.width=400;img.height=240;caption.textContent=label;a.append(img);figure.append(a,caption);document.querySelector('#references').append(figure);});
  sync();
})();
