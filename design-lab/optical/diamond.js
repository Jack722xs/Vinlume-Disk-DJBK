import * as THREE from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {TAARenderPass} from 'three/addons/postprocessing/TAARenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {MeshBVH,MeshBVHUniformStruct,BVHShaderGLSL,SAH} from 'three-mesh-bvh';
import {makeGemGeometry,makeOpticalDisc,inspectSolid} from './diamond-geometry.js';

const $=s=>document.querySelector(s),stage=$('#stage'),canvas=$('#gem'),status=$('#status'),metrics=$('#metrics');
const motion=matchMedia('(prefers-reduced-motion: reduce)'),controller=new AbortController(),events={signal:controller.signal};
const controls={object:$('#object'),x:$('#light-x'),y:$('#light-y'),dispersion:$('#dispersion'),energy:$('#energy'),resolution:$('#resolution'),material:$('#material'),backdrop:$('#backdrop'),quality:$('#quality'),static:$('#static')};
let active=null,initializing=false,epoch=0,visible=false,request=0,lastTime=0,disposed=false;
let target=[-.25,.25],light=[...target],sizeDirty=true;
const reduced=()=>motion.matches||controls.static.checked;

function objectGeometry(){
  const g=window.OpticalGeometry;
  const geometry=controls.object.value==='disc'?makeOpticalDisc():makeGemGeometry(controls.object.value==='monogram'?[g.outlines[0]]:g.outlines,g.width);
  geometry.center();return geometry;
}
function makeTAA(scene,camera){const pass=new TAARenderPass(scene,camera);pass.sampleLevel=0;pass.unbiased=false;return pass;}
function clearNativeExport(){delete window.VinlumeNativeExport;const a=$('#native-download');if(a){if(a.hasAttribute('href'))status.textContent='Sólido 3D / refracción RGB con BVH';a.hidden=true;a.removeAttribute('href');}}
function invalidate(){clearNativeExport();if(active){active.taa.accumulateIndex=-1;active.taa.accumulate=false;}schedule();}

function backdropTexture(witness=false){
  const c=document.createElement('canvas');c.width=witness?4096:2;c.height=witness?1536:2;
  const ctx=c.getContext('2d');ctx.fillStyle='#08090d';ctx.fillRect(0,0,c.width,c.height);
  if(witness){
    ctx.scale(2,2);
    ctx.fillStyle='#2e3441';ctx.fillRect(0,200,2048,368);
    ctx.fillStyle='#cbd0dc';ctx.font='500 138px Segoe UI, sans-serif';ctx.textAlign='center';ctx.fillText('PURE LIGHT',1024,440);
    ctx.strokeStyle='#6e7e93';ctx.lineWidth=2;
    for(let x=0;x<2048;x+=96){ctx.beginPath();ctx.moveTo(x,150);ctx.lineTo(x,620);ctx.stroke();}
  }
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

const vertex=/*glsl*/`
varying vec3 vPoint;varying vec3 vFace;
uniform mat4 uWorldInverse;
void main(){
  vec4 world=modelMatrix*vec4(position,1.);
  vPoint=world.xyz;
  vFace=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*viewMatrix*world;
}`;

const fragment=/*glsl*/`
precision highp isampler2D;
precision highp usampler2D;
#define BVH_STACK_DEPTH 32
${BVHShaderGLSL.common_functions}
${BVHShaderGLSL.bvh_struct_definitions}
${BVHShaderGLSL.bvh_ray_functions}
uniform BVH bvh;
uniform sampler2D uEnvironment;uniform sampler2D uBackdrop;
uniform float uIOR;uniform float uDispersion;uniform int uBounces;
uniform float uEnergy;uniform float uWitness;uniform vec2 uWallSize;
uniform vec2 uLight;uniform mat4 uWorld;uniform mat4 uWorldInverse;
varying vec3 vPoint;varying vec3 vFace;
${window.OpticalStudioGLSL}

vec3 studio(vec3 ray){
  float a=uLight.x*1.15;
  ray=mat3(cos(a),0.,sin(a),0.,1.,0.,-sin(a),0.,cos(a))*ray;
  float b=uLight.y*.5;
  ray=mat3(1.,0.,0.,0.,cos(b),sin(b),0.,-sin(b),cos(b))*ray;
  vec2 uv=vec2(atan(ray.z,ray.x)*.159154943+.5,asin(clamp(ray.y,-1.,1.))*.318309886+.5);
  vec3 key=normalize(vec3(-.35+uLight.x*.35,.5+uLight.y*.2,1.));
  vec3 softbox=vec3(.6,.76,1.)*pow(max(0.,dot(ray,key)),55.)*.55;
  return (texture2D(uEnvironment,uv).rgb*.65+softbox)*uEnergy;
}
vec3 room(vec3 p,vec3 ray){
  vec3 result=studio(ray);
  if(ray.z<-.001){
    float t=(-1.8-p.z)/ray.z;
    vec2 uv=(p+ray*t).xy/uWallSize+.5;
    if(t>0.&&all(greaterThan(uv,vec2(0.)))&&all(lessThan(uv,vec2(1.)))){
      result=uWitness>.5?texture2D(uBackdrop,uv).rgb:opticalStudio(uv,uLight*.5+.5,uEnergy);
    }
  }
  return result;
}
vec3 transmit(float eta,vec3 eyeRay,vec3 surfaceNormal){
  vec3 direction=refract(eyeRay,surfaceNormal,1./eta);
  vec3 origin=(uWorldInverse*vec4(vPoint+direction*.0006,1.)).xyz;
  direction=normalize(mat3(uWorldInverse)*direction);
  float distanceInGlass=0.;bool escaped=false;
  for(int bounce=0;bounce<10;bounce++){
    if(bounce>=uBounces)break;
    uvec4 indices=uvec4(0u);vec3 normal=vec3(0.),barycentric=vec3(0.);
    float side=0.,distance=0.;
    bool hit=bvhIntersectFirstHit(bvh,origin,direction,indices,normal,barycentric,side,distance);
    if(!hit){escaped=true;break;}
    origin+=direction*max(distance,.00001);distanceInGlass+=distance;
    vec3 exitDirection=refract(direction,normal,eta);
    if(dot(exitDirection,exitDirection)>.0001){direction=normalize(exitDirection);escaped=true;break;}
    direction=reflect(direction,normal);origin+=direction*.0006;
  }
  vec3 worldOrigin=(uWorld*vec4(origin,1.)).xyz;
  vec3 worldDirection=normalize(mat3(uWorld)*direction);
  vec3 radiance=escaped?room(worldOrigin,worldDirection):studio(worldDirection)*.2;
  // Near-colourless absorption. No opaque base, metallic lobe or diffuse fill.
  return radiance*exp(-vec3(.012,.007,.003)*distanceInGlass);
}
void main(){
  vec3 n=normalize(vFace),incident=normalize(vPoint-cameraPosition);
  if(dot(incident,n)>0.)n=-n;
  float delta=uDispersion*.025;
  vec3 green=transmit(uIOR,incident,n);
  vec3 red=transmit(uIOR*(1.-delta),incident,n);
  vec3 blue=transmit(uIOR*(1.+delta),incident,n);
  vec3 transmission=vec3(red.r,green.g,blue.b);
  float base=pow((uIOR-1.)/(uIOR+1.),2.);
  float fresnel=base+(1.-base)*pow(1.-max(0.,dot(-incident,n)),5.);
  vec3 reflected=studio(reflect(incident,n));
  vec3 color=mix(transmission,reflected,fresnel);
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

async function initialize(){
  if(active||initializing||reduced()||disposed)return;
  initializing=true;const token=++epoch,start=performance.now();status.textContent='Construyendo sólido y cargando estudio HDR…';
  let session,failed=false;
  try{
    const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(26,3,.1,100);camera.position.set(0,.12,17);camera.lookAt(0,0,0);
    const geometry=objectGeometry(),solid=inspectSolid(geometry);
    if(solid.invalidEdges)throw new Error('El sólido no está cerrado.');
    const bvh=new MeshBVH(geometry,{strategy:SAH,targetLeafSize:4}),bvhUniform=new MeshBVHUniformStruct();bvhUniform.updateFrom(bvh);
    const backdrop=backdropTexture(controls.backdrop.value==='witness');
    const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{
      bvh:{value:bvhUniform},uEnvironment:{value:null},uBackdrop:{value:backdrop},uIOR:{value:+controls.material.value},
      uDispersion:{value:+controls.dispersion.value/100},uBounces:{value:6},uLight:{value:new THREE.Vector2(...light)},
      uWorld:{value:new THREE.Matrix4()},uWorldInverse:{value:new THREE.Matrix4()},
      uEnergy:{value:+controls.energy.value/100},uWitness:{value:0},uWallSize:{value:new THREE.Vector2(18,6)}
    }});
    const planeMaterial=new THREE.ShaderMaterial({uniforms:{uBackdrop:material.uniforms.uBackdrop,uLight:material.uniforms.uLight,uEnergy:material.uniforms.uEnergy,uWitness:material.uniforms.uWitness},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vUv;uniform sampler2D uBackdrop;uniform vec2 uLight;uniform float uEnergy;uniform float uWitness;
      ${window.OpticalStudioGLSL}
      void main(){vec3 c=uWitness>.5?texture2D(uBackdrop,vUv).rgb:opticalStudio(vUv,uLight*.5+.5,uEnergy);gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),planeMaterial);plane.position.z=-1.8;scene.add(plane);
    const gem=new THREE.Mesh(geometry,material);gem.rotation.set(.055,-.035,0);scene.add(gem);gem.updateMatrixWorld(true);
    material.uniforms.uWorld.value.copy(gem.matrixWorld);material.uniforms.uWorldInverse.value.copy(gem.matrixWorld).invert();
    const gl=renderer.getContext(),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const composer=new EffectComposer(renderer),taa=makeTAA(scene,camera),output=new OutputPass();composer.addPass(taa);composer.addPass(output);
    renderer.info.autoReset=false;
    session={renderer,composer,taa,output,scene,camera,geometry,solid,bvh,bvhUniform,backdrop,plane,gem,material,environment:null,gl,timer,query:null,poll:0,
      draws:0,cpu:0,cpuMax:0,gpuTimes:[],scale:3,initMs:0,error:'',droppedQueries:0};
    active=session;
    renderer.debug.onShaderError=()=>{session.error='Error de shader; consulta la consola.';};
    const environment=await new HDRLoader().loadAsync('assets/studio_small_09_4k.hdr');
    if(token!==epoch||disposed||reduced()){environment.dispose();if(active===session)release();return;}
    environment.wrapS=THREE.RepeatWrapping;environment.magFilter=THREE.LinearFilter;environment.minFilter=THREE.LinearFilter;
    session.environment=environment;material.uniforms.uEnvironment.value=environment;
    sizeDirty=true;resize(session);await renderer.compileAsync(scene,camera);
    if(token!==epoch||disposed||reduced())return;
    if(session.error)throw new Error(session.error);
    session.initMs=performance.now()-start;status.textContent='Sólido 3D / refracción RGB con BVH';schedule();
  }catch(error){failed=true;if(token===epoch){release();status.textContent='Fallback estático · '+error.message;metrics.textContent=error.stack||error.message;}}
  finally{initializing=false;if(!failed&&!active&&token!==epoch&&!reduced()&&!disposed)schedule();}
}

function release(){
  epoch++;clearNativeExport();if(!active)return;
  const s=active;active=null;clearTimeout(s.poll);
  if(s.query)s.gl.deleteQuery(s.query);
  s.bvhUniform.dispose();s.geometry.dispose();s.material.dispose();s.backdrop.dispose();s.environment?.dispose();
  s.plane.geometry.dispose();s.plane.material.dispose();s.taa.dispose();s.output.dispose();s.composer.dispose();s.renderer.dispose();canvas.width=1;canvas.height=1;delete stage.dataset.ready;
}
function resize(s){
  const r=stage.getBoundingClientRect(),limit=Math.min(8192,s.renderer.capabilities.maxTextureSize,s.gl.getParameter(s.gl.MAX_RENDERBUFFER_SIZE));
  const ratio=Math.min(+controls.resolution.value,limit/r.width,limit/r.height,Math.sqrt(16000000/(r.width*r.height)));
  const width=Math.round(r.width*ratio),height=Math.round(r.height*ratio);s.scale=ratio;
  s.renderer.setSize(width,height,false);s.camera.aspect=r.width/r.height;
  // Preserve the full word on mobile and wide desktop, allowing room for refraction.
  const box=s.geometry.boundingBox,extent=new THREE.Vector3();box.getSize(extent);
  const halfHeight=Math.max(extent.y*.8,extent.x*.59/s.camera.aspect);
  s.camera.position.z=halfHeight/Math.tan(THREE.MathUtils.degToRad(13));s.camera.lookAt(0,0,0);
  const wallHeight=(s.camera.position.z+1.8)*Math.tan(THREE.MathUtils.degToRad(13))*2*1.06,wallWidth=wallHeight*s.camera.aspect;
  s.plane.scale.set(wallWidth,wallHeight,1);s.material.uniforms.uWallSize.value.set(wallWidth,wallHeight);
  s.camera.updateProjectionMatrix();s.camera.updateMatrixWorld();
  s.taa.dispose();s.taa=makeTAA(s.scene,s.camera);s.composer.passes[0]=s.taa;s.composer.setSize(width,height);sizeDirty=false;
}
function readGPU(s){
  if(active!==s||!s.query)return;
  clearTimeout(s.poll);if(!visible||document.hidden||reduced())return;
  const gl=s.gl;
  if(gl.getQueryParameter(s.query,gl.QUERY_RESULT_AVAILABLE)){
    if(!gl.getParameter(s.timer.GPU_DISJOINT_EXT)){
      const ms=gl.getQueryParameter(s.query,gl.QUERY_RESULT)/1e6;s.gpuTimes.push(ms);
      if(s.gpuTimes.length>60)s.gpuTimes.shift();
    }else{s.droppedQueries++;}
    gl.deleteQuery(s.query);s.query=null;report();
  }else{s.poll=setTimeout(()=>readGPU(s),60);}
}
function report(){
  const s=active;
  if(!s){if(reduced())metrics.textContent='Vista estática. Renderer y recursos GPU liberados. Sin bucle de dibujo.';return;}
  const gpu=s.gpuTimes,average=gpu.length?gpu.reduce((a,b)=>a+b,0)/gpu.length:0;
  metrics.textContent=`Three.js ${THREE.REVISION} / three-mesh-bvh 0.9.18\nSólido: ${s.solid.triangles} triángulos · ${s.solid.invalidEdges} aristas abiertas o mal orientadas\nTrayectorias: 3 canales RGB × hasta ${s.material.uniforms.uBounces.value} rebotes\nBuffer: ${canvas.width} × ${canvas.height} · ${s.scale.toFixed(2)}× resolución / TAA ${Math.max(0,s.taa.accumulateIndex)}/32 · llamadas ${s.renderer.info.render.calls}\nEntorno HDR: ${s.environment?.image.width||0} × ${s.environment?.image.height||0} · luz ${controls.energy.value}%\nDibujos: ${s.draws} · CPU media ${s.draws?(s.cpu/s.draws).toFixed(2):'0'} ms · máximo ${s.cpuMax.toFixed(2)} ms\nGPU: ${gpu.length?'media '+average.toFixed(2)+' ms · último '+gpu.at(-1).toFixed(2)+' ms · '+gpu.length+' muestras':s.timer?'esperando consulta':'consulta no disponible'}\nInicialización: ${s.initMs.toFixed(0)} ms · texturas ${s.renderer.info.memory.textures} · geometrías ${s.renderer.info.memory.geometries}\nBucle de dibujo: ${request?'activo':'detenido'} · ${visible&&!document.hidden?'visible':'pausado'}\n${s.error||'No se miden energía, temperatura ni memoria GPU total.'}`;
}
function frame(time){
  request=0;if(disposed||!visible||document.hidden||reduced())return;
  if(!active){initialize();return;}if(initializing)return;
  if(time-lastTime<33.3){request=requestAnimationFrame(frame);return;}lastTime=time;
  const s=active;light=light.map((v,i)=>v+(target[i]-v)*.23);
  if(s.query){readGPU(s);if(s.query){request=requestAnimationFrame(frame);report();return;}}
  if(sizeDirty)resize(s);
  const u=s.material.uniforms;u.uLight.value.set(...light);u.uIOR.value=+controls.material.value;
  u.uDispersion.value=+controls.dispersion.value/100;u.uBounces.value=controls.quality.value==='ultra'?10:6;
  u.uEnergy.value=+controls.energy.value/100;u.uWitness.value=controls.backdrop.value==='witness'?1:0;
  // Tiny view change reveals real sidewalls, instead of distorting the silhouette.
  const disc=controls.object.value==='disc';
  s.gem.rotation.set((disc?.18:.055)-light[1]*.025,(disc?-.22:-.035)+light[0]*.025,0);s.gem.updateMatrixWorld(true);
  u.uWorld.value.copy(s.gem.matrixWorld);u.uWorldInverse.value.copy(s.gem.matrixWorld).invert();
  const query=s.timer&&!s.query?s.gl.createQuery():null;
  if(query){s.query=query;s.gl.beginQuery(s.timer.TIME_ELAPSED_EXT,query);}
  const moving=Math.hypot(light[0]-target[0],light[1]-target[1])>.002;
  s.taa.accumulate=!moving;s.renderer.info.reset();
  const start=performance.now();s.composer.render();
  const duration=performance.now()-start;s.cpu+=duration;s.cpuMax=Math.max(s.cpuMax,duration);s.draws++;
  if(query){s.gl.endQuery(s.timer.TIME_ELAPSED_EXT);s.poll=setTimeout(()=>readGPU(s),60);}
  if(!s.error)stage.dataset.ready='true';
  if(s.exportRequest&&s.taa.accumulateIndex>=32){
    s.exportRequest=false;
    const png=canvas.toDataURL('image/png');window.VinlumeNativeExport=png;
    const a=$('#native-download');a.href=png;a.download=`VINLUME-studio-${canvas.width}x${canvas.height}.png`;a.hidden=false;
    status.textContent=`PNG nativo listo / ${canvas.width} × ${canvas.height}`;
  }
  if(moving||s.taa.accumulateIndex<32)request=requestAnimationFrame(frame);
  report();
}
function schedule(){if(!request&&!disposed&&!reduced()&&visible&&!document.hidden)request=requestAnimationFrame(frame);}
function sync(){cancelAnimationFrame(request);request=0;
  if(reduced()){release();status.textContent=motion.matches?'Estático / movimiento reducido del sistema':'Estático / GPU liberada';report();}
  else{schedule();}
}
function setLight(x,y){target=[x,y];controls.x.value=Math.round(x*100);controls.y.value=Math.round(y*100);invalidate();}
stage.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||reduced())return;const r=stage.getBoundingClientRect();setLight((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);},events);
stage.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||reduced())return;const r=stage.getBoundingClientRect();setLight((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);},events);
[controls.x,controls.y].forEach(n=>n.addEventListener('input',()=>setLight(+controls.x.value/100,+controls.y.value/100),events));
[controls.dispersion,controls.energy,controls.material,controls.quality].forEach(n=>n.addEventListener('input',invalidate,events));
controls.resolution.addEventListener('change',()=>{sizeDirty=true;invalidate();},events);
controls.backdrop.addEventListener('change',()=>{if(active){const t=backdropTexture(controls.backdrop.value==='witness');active.backdrop.dispose();active.backdrop=t;active.material.uniforms.uBackdrop.value=t;}invalidate();},events);
function changeObject(){
  const kind=controls.object.value;
  stage.setAttribute('aria-label',kind==='word'?'VINLUME construido en cristal transparente tallado':kind==='monogram'?'Monograma V de cristal tallado':'Disco óptico abstracto de cristal');
  $('#fallback').src=kind==='word'?'fallback-lit.svg':kind==='monogram'?'v-fallback.svg':'disc-fallback.svg';
  if(active){
    const s=active;clearTimeout(s.poll);if(s.query){s.gl.deleteQuery(s.query);s.query=null;}
    s.geometry.dispose();s.bvhUniform.dispose();s.geometry=objectGeometry();s.solid=inspectSolid(s.geometry);
    if(s.solid.invalidEdges)throw new Error('Objeto sin cierre válido.');
    s.bvh=new MeshBVH(s.geometry,{strategy:SAH,targetLeafSize:4});s.bvhUniform=new MeshBVHUniformStruct();s.bvhUniform.updateFrom(s.bvh);
    s.gem.geometry=s.geometry;s.material.uniforms.bvh.value=s.bvhUniform;sizeDirty=true;
    s.draws=0;s.cpu=0;s.cpuMax=0;s.gpuTimes=[];
  }
  invalidate();
}
controls.object.addEventListener('change',changeObject,events);
document.querySelectorAll('[data-object]').forEach(b=>b.addEventListener('click',()=>{controls.object.value=b.dataset.object;changeObject();stage.scrollIntoView({block:'center',behavior:'instant'});controls.object.focus({preventScroll:true});},events));
controls.static.addEventListener('change',sync,events);motion.addEventListener('change',sync,events);
$('#native-export').addEventListener('click',()=>{if(active&&!initializing&&!reduced()){active.exportRequest=true;status.textContent='Preparando PNG con 32 muestras…';stage.scrollIntoView({block:'center',behavior:'instant'});stage.focus({preventScroll:true});schedule();}else{status.textContent='Activa el material y espera la carga para exportar.';}},events);
const intersection=new IntersectionObserver(e=>{visible=e[0].isIntersecting&&e[0].intersectionRatio>=.1;if(!visible){cancelAnimationFrame(request);request=0;if(active)clearTimeout(active.poll);}else schedule();report();},{threshold:[0,.1]});intersection.observe(stage);
const resizeObserver=new ResizeObserver(()=>{sizeDirty=true;schedule();});resizeObserver.observe(stage);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(request);request=0;if(active)clearTimeout(active.poll);}else schedule();report();},events);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(request);request=0;release();status.textContent='Contexto perdido · fallback estático';},events);
canvas.addEventListener('webglcontextrestored',()=>{schedule();},events);
window.addEventListener('pagehide',e=>{cancelAnimationFrame(request);request=0;if(!e.persisted){disposed=true;release();intersection.disconnect();resizeObserver.disconnect();controller.abort();}},events);
window.addEventListener('pageshow',()=>schedule(),events);
sync();
