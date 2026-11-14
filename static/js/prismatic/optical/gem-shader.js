import {BVHShaderGLSL} from './vendor/three-mesh-bvh/build/index.module.js';
import {studio} from './studio.js';
const vertex=/*glsl*/`
varying vec3 vPoint;varying vec3 vFace;
uniform mat4 uWorldInverse;
void main(){
  vec4 world=modelMatrix*vec4(position,1.);
  vPoint=world.xyz;
  vFace=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*viewMatrix*world;
}`;

const shared=/*glsl*/`
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
${studio}

vec3 studio(vec3 ray){
  float a=uLight.x*1.15;
  ray=mat3(cos(a),0.,sin(a),0.,1.,0.,-sin(a),0.,cos(a))*ray;
  float b=uLight.y*.5;
  ray=mat3(1.,0.,0.,0.,cos(b),sin(b),0.,-sin(b),cos(b))*ray;
  vec2 uv=vec2(atan(ray.z,ray.x)*.159154943+.5,asin(clamp(ray.y,-1.,1.))*.318309886+.5);
  vec3 key=normalize(vec3(-.35+uLight.x*.35,.5+uLight.y*.2,1.));
  vec3 softbox=vec3(1.)*pow(max(0.,dot(ray,key)),55.)*.55;
  return (vec3(dot(texture2D(uEnvironment,uv).rgb,vec3(.2126,.7152,.0722)))*.65+softbox)*uEnergy;
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
vec4 tracePath(float eta,vec3 eyeRay,vec3 surfaceNormal){
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
  vec3 d=worldDirection/(abs(worldDirection.x)+abs(worldDirection.y)+abs(worldDirection.z));
  vec2 oct=d.z>=0.?d.xy:(1.-abs(d.yx))*sign(d.xy);
  vec2 wall=vec2(escaped?-2.:-3.);
  if(escaped&&worldDirection.z<-.001){float t=(-1.8-worldOrigin.z)/worldDirection.z;vec2 uv=(worldOrigin+worldDirection*t).xy/uWallSize+.5;if(t>0.&&all(greaterThan(uv,vec2(0.)))&&all(lessThan(uv,vec2(1.))))wall=uv;}
  return vec4(oct,wall);
}
`;
const cacheFragment=shared+/*glsl*/`
uniform float uCacheChannel;
void main(){vec3 n=normalize(vFace),incident=normalize(vPoint-cameraPosition);if(dot(incident,n)>0.)n=-n;gl_FragColor=tracePath(uIOR*(1.+uCacheChannel*uDispersion*.025),incident,n);}
`;
const fragment=shared+/*glsl*/`
uniform sampler2D uCacheR;uniform sampler2D uCacheG;uniform sampler2D uCacheB;uniform vec2 uResolution;
vec3 cachedLight(vec4 path){vec3 d=vec3(path.xy,1.-abs(path.x)-abs(path.y));if(d.z<0.)d.xy=(1.-abs(d.yx))*sign(d.xy);d=normalize(d);
  if(path.z>=0.)return uWitness>.5?texture2D(uBackdrop,path.zw).rgb:opticalStudio(path.zw,uLight*.5+.5,uEnergy);
  return studio(d)*(path.z< -2.5?.2:1.);
}
void main(){
  vec3 n=normalize(vFace),incident=normalize(vPoint-cameraPosition);
  if(dot(incident,n)>0.)n=-n;
  vec2 uv=gl_FragCoord.xy/uResolution;
  vec3 green=cachedLight(texture2D(uCacheG,uv));
  vec3 red=cachedLight(texture2D(uCacheR,uv));
  vec3 blue=cachedLight(texture2D(uCacheB,uv));
  vec3 transmission=vec3(red.r,green.g,blue.b);
  float base=pow((uIOR-1.)/(uIOR+1.),2.);
  float fresnel=base+(1.-base)*pow(1.-max(0.,dot(-incident,n)),5.);
  vec3 reflected=studio(reflect(incident,n));
  vec3 color=mix(transmission,reflected,fresnel);
  // Fixed geometry: the pointer is a nearby light source, never a camera move.
  vec3 lamp=vec3(uLight.x*7.,uLight.y*2.1,3.2);
  vec3 L=normalize(lamp-vPoint),H=normalize(L-incident);
  float pool=exp(-dot(vPoint.xy-lamp.xy,vPoint.xy-lamp.xy)*.20);
  float glint=pow(max(0.,dot(n,H)),75.);
  color+=vec3(1.,.985,.96)*(glint*.9+pool*fresnel*.38);
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export {vertex,fragment,cacheFragment};
