import * as THREE from '../optical/vendor/three/build/three.module.js';
import {HDRLoader} from '../optical/vendor/three/examples/jsm/loaders/HDRLoader.js';
import {RoundedBoxGeometry} from './RoundedBoxGeometry.js';

// One scene and one shared optical pass. HTML retains all text and actions.
export async function createStage(canvas, opening){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#050609');
  const camera=new THREE.PerspectiveCamera(33,1,.1,40);camera.position.set(0,0,7.2);
  const geometries=new Set(),materials=new Set(),textures=new Set();
  const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
  const mesh=(g,m,parent=scene)=>{const o=new THREE.Mesh(geometry(g),m);parent.add(o);return o;};
  let disposed=false,visible=false,frame=0,last=0,draws=0,cpu=0,elapsed=0,width=1,height=1;
  const intervals=[],pointer=new THREE.Vector2(.55,.4),smooth=pointer.clone();
  const model=new THREE.Group();scene.add(model);
  const glass=material(new THREE.MeshPhysicalMaterial({color:'#f6fcff',metalness:0,roughness:.075,transmission:1,thickness:.16,ior:1.48,dispersion:.24,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.6}));
  const edge=material(new THREE.MeshPhysicalMaterial({color:'#d8e2e8',roughness:.12,metalness:.15,transmission:.94,thickness:.22,ior:1.48,dispersion:.2,clearcoat:1}));
  const chrome=material(new THREE.MeshPhysicalMaterial({color:'#e1e6ed',metalness:1,roughness:.23,iridescence:1,iridescenceIOR:1.34,iridescenceThicknessMinimum:120,iridescenceThicknessMaximum:420,clearcoat:1}));
  const face=new RoundedBoxGeometry(2.55,2.4,.055,4,.065);
  mesh(face,glass,model).position.z=.16;mesh(face.clone(),glass,model).position.z=-.17;
  [[2.55,.075,0,1.18],[2.55,.075,0,-1.18],[.075,2.35,-1.24,0],[.075,2.35,1.24,0]].forEach(([w,h,x,y])=>{const o=mesh(new RoundedBoxGeometry(w,h,.35,3,.03),edge,model);o.position.set(x,y,0);});
  for(const x of [-1.23,1.23])for(const y of [-.78,.78]){const lug=mesh(new RoundedBoxGeometry(.12,.32,.24,3,.035),edge,model);lug.position.set(x,y,.04);}
  const inner=mesh(new THREE.TorusGeometry(.35,.018,8,80),edge,model);inner.position.z=.10;
  const hinge=mesh(new RoundedBoxGeometry(.14,2.25,.32,3,.025),edge,model);hinge.position.set(-1.10,0,0);
  const tab=mesh(new RoundedBoxGeometry(.46,.30,.12,4,.07),glass,model);tab.position.set(0,1.32,0);
  const loop=mesh(new THREE.TorusGeometry(.14,.04,12,56),chrome,model);loop.position.set(0,1.49,0);
  const disc=new THREE.Group();disc.position.set(.04,-.025,0);model.add(disc);
  const discMaterial=material(chrome.clone());mesh(new THREE.RingGeometry(.16,1.03,160,8),discMaterial,disc);
  const grooves=document.createElement('canvas');grooves.width=grooves.height=1024;
  const ctx=grooves.getContext('2d');ctx.fillStyle='#d8dde3';ctx.fillRect(0,0,1024,1024);
  for(let i=92;i<510;i+=2){ctx.beginPath();ctx.arc(512,512,i,0,Math.PI*2);ctx.strokeStyle=i%4?'#b0b8c1':'#edf0f3';ctx.lineWidth=.55;ctx.stroke();}
  ctx.fillStyle='#12171d';ctx.font='500 30px sans-serif';ctx.textAlign='center';ctx.fillText('V I N L U M E',512,277);ctx.font='12px sans-serif';ctx.fillText('MUSIC, MADE TANGIBLE.',512,304);ctx.fillText('SIDE A / YOUR UNIVERSE',512,770);
  const map=new THREE.CanvasTexture(grooves);map.colorSpace=THREE.SRGBColorSpace;textures.add(map);discMaterial.map=map;
  const hub=mesh(new THREE.TorusGeometry(.18,.045,12,80),edge,disc);hub.position.z=.035;
  const rim=mesh(new THREE.TorusGeometry(1.032,.009,8,160),chrome,disc);rim.position.z=.018;
  const softbox=new THREE.HemisphereLight('#e8f3ff','#111419',2.8);scene.add(softbox);
  const key=new THREE.DirectionalLight('#ffffff',5);key.position.set(-3,4,5);scene.add(key);
  const cyan=new THREE.PointLight('#97f3ea',17,14,2);cyan.position.set(3,-1,3);scene.add(cyan);
  const warm=new THREE.PointLight('#f1c5a0',12,12,2);warm.position.set(-1,2,-1);scene.add(warm);
  const ribbons=[];
  for(let i=0;i<3;i++){
    const points=Array.from({length:40},(_,j)=>{const t=j/39;return new THREE.Vector3(-.4+t*7.4,-1.95+Math.sin(t*5+i*.19)*.20+i*.035,-1.3-i*.06);});
    const line=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),100,.012,6,false),material(new THREE.MeshBasicMaterial({color:['#76cabd','#929ec8','#d3c6b2'][i]})));ribbons.push(line);
  }
  let environment;
  try{
    const hdr=await new HDRLoader().loadAsync(canvas.dataset.hdr);
    if(disposed){hdr.dispose();throw new Error('Stage disposed');}
    const pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromEquirectangular(hdr);scene.environment=environment.texture;hdr.dispose();pmrem.dispose();
  }catch(error){console.info('VINLUME: iluminación local de reserva.',error.message);}
  renderer.info.autoReset=false;
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true,samples:4});
  const rects=Array.from({length:4},()=>new THREE.Vector4());
  const uniforms={uScene:{value:target.texture},uSize:{value:new THREE.Vector2(1,1)},uLight:{value:smooth},uRects:{value:rects},uCount:{value:0}};
  const postMaterial=material(new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`varying vec2 vUv;uniform sampler2D uScene;uniform vec2 uSize;uniform vec2 uLight;uniform vec4 uRects[4];uniform int uCount;
    float capsule(vec2 p,vec2 b){float r=min(b.x,b.y);return length(max(abs(p)-(b-r),0.))+min(max(abs(p).x-b.x+r,abs(p).y-b.y+r),0.)-r;}
    void main(){vec3 color=texture2D(uScene,vUv).rgb;vec2 pixel=vUv*uSize;
    for(int i=0;i<4;i++){if(i>=uCount)break;vec4 rect=uRects[i];vec2 p=pixel-rect.xy;vec2 halfSize=rect.zw*.5;float d=capsule(p,halfSize);if(d<1.){
      float h=max(0.,-d);vec2 n=normalize(vec2(capsule(p+vec2(.7,0.),halfSize)-capsule(p-vec2(.7,0.),halfSize),capsule(p+vec2(0.,.7),halfSize)-capsule(p-vec2(0.,.7),halfSize))+.00001);
      float edge=exp(-h*.12);vec2 lensUV=(rect.xy+p*.94)/uSize;vec2 bend=n*(7.+19.*edge)/uSize;
      vec3 refracted=vec3(texture2D(uScene,lensUV-bend*1.08).r,texture2D(uScene,lensUV-bend).g,texture2D(uScene,lensUV-bend*.91).b);
      vec2 light=normalize(uLight*uSize-rect.xy+.001);float spec=pow(max(0.,dot(n,light)),9.)*exp(-h*.35);float rim=exp(-h*.85);
      vec3 glassColor=refracted*.94+vec3(.035,.044,.055)*(1.-edge)+vec3(.72,.84,.92)*spec*.65+vec3(.22,.3,.33)*rim;
      color=mix(color,glassColor,smoothstep(1.,-1.,d));}}
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }` }));
  const postScene=new THREE.Scene();const quad=mesh(new THREE.PlaneGeometry(2,2),postMaterial,postScene);quad.frustumCulled=false;const postCamera=new THREE.Camera();
  const lenses=[...opening.querySelectorAll('[data-lv-lens]')];
  function resize(){
    if(disposed)return;const r=opening.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);
    const scale=Math.min(devicePixelRatio||1,2.5,Math.sqrt(5000000/(width*height)));
    renderer.setSize(Math.round(width*scale),Math.round(height*scale),false);target.setSize(Math.round(width*scale),Math.round(height*scale));uniforms.uSize.value.set(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
    const viewHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z;
    model.position.set(viewHeight*camera.aspect*.235,-.05,0);model.scale.setScalar(Math.min(1,viewHeight/3.65));
    uniforms.uCount.value=Math.min(4,lenses.length);lenses.slice(0,4).forEach((node,i)=>{const b=node.getBoundingClientRect();rects[i].set(b.left-r.left+b.width/2,height-(b.top-r.top+b.height/2),b.width,b.height);});
  }
  const observer=new ResizeObserver(resize);observer.observe(opening);lenses.forEach(n=>observer.observe(n));
  function draw(now){
    frame=0;if(!visible||disposed)return;const start=performance.now();
    if(last&&now-last<250){intervals.push(now-last);if(intervals.length>120)intervals.shift();}last=now;
    const dt=Math.min(.05,(now-elapsed)/1000||.016);elapsed=now;const alpha=1-Math.exp(-dt*12);smooth.lerp(pointer,alpha);
    model.rotation.set(.10+(smooth.y-.5)*.08,-.38+(smooth.x-.5)*.13,Math.sin(now*.00016)*.022);
    key.position.x=-3+smooth.x*5;cyan.position.y=.8-smooth.y*3;
    ribbons.forEach((line,i)=>{line.position.y=Math.sin(now*.00022+i*.15)*.08;});
    renderer.info.reset();renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
    draws++;cpu+=performance.now()-start;
    if(draws%30===0)canvas.dataset.landingMetrics=JSON.stringify({draws,width:target.width,height:target.height,fps:intervals.length?1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length):null,cpuMean:cpu/draws,running:true,triangles:renderer.info.render.triangles,renderCalls:renderer.info.render.calls});
    frame=requestAnimationFrame(draw);
  }
  function setVisible(value){visible=Boolean(value)&&!document.hidden;if(!visible){cancelAnimationFrame(frame);frame=0;last=0;canvas.dataset.landingPaused='true';if(canvas.dataset.landingMetrics){const metrics=JSON.parse(canvas.dataset.landingMetrics);metrics.running=false;canvas.dataset.landingMetrics=JSON.stringify(metrics);}}else if(!frame&&!disposed){canvas.dataset.landingPaused='false';frame=requestAnimationFrame(draw);}}
  resize();canvas.hidden=false;
  return {setVisible,setPointer(x,y){pointer.set(x,1-y);},dispose(){if(disposed)return;disposed=true;setVisible(false);observer.disconnect();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment?.dispose();target.dispose();renderer.dispose();canvas.hidden=true;}};
}
