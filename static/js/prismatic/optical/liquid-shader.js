import {studio} from './studio.js';
  const vertex=`#version 300 es
    in vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}`;
  const fragment=`#version 300 es
    precision highp float;
    uniform vec2 uSize;uniform vec2 uResolution;uniform vec2 uLight;uniform float uEnergy;
    uniform vec4 uRects[18];uniform vec4 uOptics[18];uniform int uCount;
    uniform float uThickness;uniform float uIOR;uniform float uChroma;uniform float uHue;
    uniform sampler2D uAtlas;uniform vec4 uPhotoRects[18];uniform float uPhotoSlots[18];
    int activeShape=-1;
    out vec4 outColor;
    ${studio}
    float box(vec2 p,vec4 r,float radius){vec2 q=abs(p-r.xy)-(r.zw-radius);return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;}
    vec3 hue(vec3 c){vec3 axis=normalize(vec3(1.));return c*cos(uHue)+cross(axis,c)*sin(uHue)+axis*dot(axis,c)*(1.-cos(uHue));}
    vec3 backdrop(vec2 p){
      if(activeShape>=0&&uPhotoSlots[activeShape]>=0.){
        float slot=uPhotoSlots[activeShape];vec4 r=uPhotoRects[activeShape];
        vec2 uv=clamp((p-r.xy)/r.zw,vec2(.002),vec2(.998));
        vec2 cell=vec2(mod(slot,4.),floor(slot/4.));
        vec3 photo=texture(uAtlas,(cell+uv)/vec2(4.,2.)).rgb;
        return pow(photo,vec3(2.2));
      }
      vec2 uv=vec2(p.x/uSize.x,1.-p.y/uSize.y);
      vec3 c=opticalStudio(uv,vec2(uLight.x,1.-uLight.y),uEnergy);
      float d=uv.x+uv.y*.55-(.65+uLight.x*.25);
      c+=vec3(.10,.018,.025)*exp(-pow((d-.013)/.012,2.));
      c+=vec3(.018,.10,.075)*exp(-pow(d/.012,2.));
      c+=vec3(.025,.035,.12)*exp(-pow((d+.013)/.012,2.));
      return max(vec3(0.),hue(c));
    }
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
      int chosen=-1;float distance=1000.;
      // Last shape wins: panel, button, slider tracks, lenses, switch.
      for(int i=0;i<18;i++){
        if(i>=uCount)break;
        float d=box(p,uRects[i],uOptics[i].x);
        if(d<1.3){chosen=i;distance=d;}
      }
      if(chosen<0){outColor=vec4(0.);return;}
      activeShape=chosen;vec3 base=backdrop(p);
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
      if(uPhotoSlots[chosen]>=0.)transmission*=.20;
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
      outColor=vec4(displayColor(color),coverage);
    }`;

export {vertex,fragment};
