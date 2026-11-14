/* Diamond F06 material and geometry; bounded production scene, no lab UI. */
import * as THREE from './vendor/three/build/three.module.js';
import {HDRLoader} from './vendor/three/examples/jsm/loaders/HDRLoader.js';
import {EffectComposer} from './vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import {TAARenderPass} from './vendor/three/examples/jsm/postprocessing/TAARenderPass.js';
import {OutputPass} from './vendor/three/examples/jsm/postprocessing/OutputPass.js';
import {MeshBVH,MeshBVHUniformStruct,SAH} from './vendor/three-mesh-bvh/build/index.module.js';
import {makeGemGeometry} from './gem-geometry.js';
import outlines from './outlines.js';
import {vertex,fragment,cacheFragment} from './gem-shader.js?v=paths1';

export async function createHero(canvas,heading,{capture=false}={}) {
  let renderer,composer,taa,output,geometry,bvhUniform,material,environment,backdrop,resizeObserver;
  let disposed=false,visible=false,frame=0,last=0,query=null,poll=0,sizeDirty=true;
  const controller=new AbortController(),events={signal:controller.signal};
  const light=[.3,.3],target=[...light];
  const stats={draws:0,cpuMs:0,gpuMs:[],samples:0,width:0,height:0,scale:0,running:false};
  let gl,timer,scene,camera,gem,shaderFailed=false,cacheMaterial,cacheTargets=[],cacheDirty=true;
  let interval=0;
  const frameIntervals=[];let pathBuildMs=0;
  function report(){canvas.dataset.opticalMetrics=JSON.stringify({draws:stats.draws,samples:stats.samples,width:stats.width,height:stats.height,scale:stats.scale,cpuMean:stats.draws?stats.cpuMs/stats.draws:0,gpuMean:stats.gpuMs.length?stats.gpuMs.reduce((a,b)=>a+b,0)/stats.gpuMs.length:null,running:Boolean(frame||poll),interval,cachedPaths:true,pathBuildMs,pathColorBytes:stats.width*stats.height*8*3,fps:frameIntervals.length?1000/(frameIntervals.reduce((a,b)=>a+b,0)/frameIntervals.length):null,light:[...light],rotation:gem?[gem.rotation.x,gem.rotation.y,gem.rotation.z]:null});}
  function stop(){cancelAnimationFrame(frame);frame=0;clearTimeout(poll);poll=0;stats.running=false;report();}
  function destroy(){
    if(disposed)return;disposed=true;stop();controller.abort();resizeObserver?.disconnect();
    if(query)gl.deleteQuery(query);query=null;
    bvhUniform?.dispose();geometry?.dispose();material?.dispose();cacheMaterial?.dispose();cacheTargets.forEach(t=>t.dispose());environment?.dispose();backdrop?.dispose();
    taa?.dispose();output?.dispose();composer?.dispose();renderer?.dispose();
    heading.classList.remove('pn-crystal-ready');canvas.hidden=true;canvas.width=1;canvas.height=1;
  }
  function fallback(reason){canvas.dataset.optical=reason;destroy();}
  function schedule(){if(!disposed&&visible&&!document.hidden&&!frame){stats.running=true;frame=requestAnimationFrame(draw);}}
  function invalidate(){if(disposed)return;taa.accumulateIndex=-1;taa.accumulate=false;schedule();}
  function resize(){
    const r=heading.getBoundingClientRect(),limit=Math.min(6144,renderer.capabilities.maxTextureSize,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
    const scale=Math.min(2.5,limit/r.width,limit/r.height,Math.sqrt(3000000/(r.width*r.height)));
    const w=Math.max(1,Math.round(r.width*scale)),h=Math.max(1,Math.round(r.height*scale));
    renderer.setSize(w,h,false);composer.setSize(w,h);
    geometry.computeBoundingBox();const extent=new THREE.Vector3();geometry.boundingBox.getSize(extent);
    camera.aspect=r.width/r.height;
    const halfHeight=Math.max(extent.y*.65,extent.x*.55/camera.aspect);
    camera.position.z=halfHeight/Math.tan(THREE.MathUtils.degToRad(13));camera.lookAt(0,0,0);
    camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const wallHeight=(camera.position.z+1.8)*Math.tan(THREE.MathUtils.degToRad(13))*2*1.06;
    material.uniforms.uWallSize.value.set(wallHeight*camera.aspect,wallHeight);
    cacheTargets.forEach(t=>t.setSize(w,h));material.uniforms.uResolution.value.set(w,h);cacheDirty=true;
    Object.assign(stats,{width:w,height:h,scale});sizeDirty=false;taa.accumulateIndex=-1;
  }
  function readQuery(){
    clearTimeout(poll);poll=0;
    if(disposed||!query||!visible||document.hidden)return;
    if(gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){
      if(!gl.getParameter(timer.GPU_DISJOINT_EXT)){
        stats.gpuMs.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);
        if(stats.gpuMs.length>20)stats.gpuMs.shift();
      }
      gl.deleteQuery(query);query=null;
      // GPU timing is observational: never wait for it before drawing the next frame.
      if(taa.accumulateIndex<32||Math.hypot(light[0]-target[0],light[1]-target[1])>.003)schedule();
      report();
    }else{poll=setTimeout(readQuery,16);}
  }
  function draw(time){
    frame=0;stats.running=false;if(disposed||!visible||document.hidden)return;
    if(query)readQuery();
    if(time-last<interval){schedule();return;}
    if(last&&time-last<250){frameIntervals.push(time-last);if(frameIntervals.length>90)frameIntervals.shift();}else frameIntervals.length=0;
    last=time;
    if(sizeDirty)resize();
    light.forEach((v,i)=>light[i]=v+(target[i]-v)*.5);
    const moving=Math.hypot(light[0]-target[0],light[1]-target[1])>.003;
    material.uniforms.uLight.value.set(...light);
    gem.rotation.set(.04,-.025,0);gem.updateMatrixWorld(true);
    material.uniforms.uWorld.value.copy(gem.matrixWorld);material.uniforms.uWorldInverse.value.copy(gem.matrixWorld).invert();
    if(cacheDirty){
      const pathStart=performance.now();gem.material=cacheMaterial;camera.clearViewOffset();
      cacheTargets.forEach((target,i)=>{cacheMaterial.uniforms.uCacheChannel.value=[-1,0,1][i];renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);});
      renderer.setRenderTarget(null);gem.material=material;cacheDirty=false;pathBuildMs=performance.now()-pathStart;
    }
    taa.accumulate=!moving;
    const measured=timer&&!query?gl.createQuery():null;
    if(measured){query=measured;gl.beginQuery(timer.TIME_ELAPSED_EXT,measured);}
    const start=performance.now();composer.render();stats.cpuMs+=performance.now()-start;stats.draws++;stats.samples=Math.max(0,taa.accumulateIndex);
    if(measured){gl.endQuery(timer.TIME_ELAPSED_EXT);poll=setTimeout(readQuery,16);}
    if(shaderFailed){fallback('shader-fallback');return;}
    canvas.hidden=false;heading.classList.add('pn-crystal-ready');canvas.dataset.optical='diamond';
    if(moving||taa.accumulateIndex<32)schedule();
    report();
  }
  try{
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:capture});
    renderer.setPixelRatio(1);renderer.setClearColor(0x08090d,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
    renderer.debug.onShaderError=()=>{shaderFailed=true;};
    gl=renderer.getContext();timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(26,4.5,.1,100);
    geometry=makeGemGeometry(outlines.outlines,outlines.width);geometry.center();
    const bvh=new MeshBVH(geometry,{strategy:SAH,targetLeafSize:4});bvhUniform=new MeshBVHUniformStruct();bvhUniform.updateFrom(bvh);
    backdrop=new THREE.DataTexture(new Uint8Array([8,9,13,255]),1,1);backdrop.needsUpdate=true;
    material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{
      bvh:{value:bvhUniform},uEnvironment:{value:null},uBackdrop:{value:backdrop},uIOR:{value:1.52},uDispersion:{value:.26},uBounces:{value:6},
      uLight:{value:new THREE.Vector2(...light)},uWorld:{value:new THREE.Matrix4()},uWorldInverse:{value:new THREE.Matrix4()},
      uEnergy:{value:1.3},uWitness:{value:0},uWallSize:{value:new THREE.Vector2(18,4)}
    }});
    cacheTargets=Array.from({length:3},()=>new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter}));
    Object.assign(material.uniforms,{uCacheR:{value:cacheTargets[0].texture},uCacheG:{value:cacheTargets[1].texture},uCacheB:{value:cacheTargets[2].texture},uResolution:{value:new THREE.Vector2(1,1)}});
    cacheMaterial=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:cacheFragment,uniforms:{...material.uniforms,uCacheChannel:{value:0}}});
    gem=new THREE.Mesh(geometry,material);scene.add(gem);
    composer=new EffectComposer(renderer);taa=new TAARenderPass(scene,camera);taa.sampleLevel=0;taa.unbiased=false;taa.clearColor=new THREE.Color(0x08090d);taa.clearAlpha=0;
    output=new OutputPass();composer.addPass(taa);composer.addPass(output);
    environment=await new HDRLoader().loadAsync(canvas.dataset.opticalEnvironment);
    environment.wrapS=THREE.RepeatWrapping;environment.magFilter=THREE.LinearFilter;environment.minFilter=THREE.LinearFilter;
    material.uniforms.uEnvironment.value=environment;resize();await renderer.compileAsync(scene,camera);
    if(shaderFailed)throw new Error('Shader incompatible');
    resizeObserver=new ResizeObserver(()=>{sizeDirty=true;invalidate();});resizeObserver.observe(heading);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback('context-fallback');},events);
    return {
      setLight(x,y){const next=[x*2-1,1-y*2];if(Math.hypot(next[0]-target[0],next[1]-target[1])<.006)return;target.splice(0,2,...next);invalidate();},
      reset(){target.splice(0,2,.3,.3);invalidate();},
      setVisible(value){visible=value;if(!visible)stop();else if(query)readQuery();else if(sizeDirty||taa.accumulateIndex<32)schedule();},
      diagnostics(){return {...stats,cpuMean:stats.draws?stats.cpuMs/stats.draws:0,gpuMean:stats.gpuMs.length?stats.gpuMs.reduce((a,b)=>a+b,0)/stats.gpuMs.length:null,disposed};},
      destroy
    };
  }catch(error){destroy();throw error;}
}
