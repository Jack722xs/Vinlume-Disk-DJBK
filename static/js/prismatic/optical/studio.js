export const studio = `
    vec3 opticalStudio(vec2 uv,vec2 pointer,float energy){
      vec2 light=clamp(pointer,vec2(0.),vec2(1.));
      vec3 L=normalize(vec3((light.x-.5)*1.6,(light.y-.5)*1.2,1.15));
      vec3 H=normalize(L+vec3(0.,0.,1.));
      float curve=.43+.12*sin(uv.x*4.6+.5)+uv.x*.12;
      float slope=.552*cos(uv.x*4.6+.5)+.12;
      float d=uv.y-curve;
      float g=1.15/(1.+pow(d/.048,2.));
      vec3 n=normalize(vec3(g*slope,-g,1.));
      vec3 deep=vec3(.006),violet=vec3(.009);
      vec3 c=mix(deep,violet,smoothstep(-.08,.16,d));
      float facing=.38+.62*max(0.,dot(n,L));
      c*=facing;
      c+=vec3(.018)*exp(-pow((d+.07)/.13,2.));
      c+=vec3(.55)*pow(max(0.,dot(n,H)),55.)*.24*exp(-pow(d/.15,2.));
      // A curved pearl sheet provides recognizable detail behind the lenses.
      float seam=.72+.085*sin(uv.y*5.5+.3);
      float q=uv.x-seam;
      float sheet=smoothstep(-.003,.003,q);
      float bending=.9/(1.+pow(q/.045,2.));
      vec3 sn=normalize(vec3(-bending,bending*.4675*cos(uv.y*5.5+.3),1.));
      vec3 pearl=vec3(.018)*(.45+.55*max(0.,dot(sn,L)));
      pearl+=vec3(.65)*pow(max(0.,dot(sn,H)),70.)*.30*exp(-pow(q/.16,2.));
      pearl+=vec3(.006)*exp(-pow((q-.12)/.16,2.));
      c=mix(c,pearl,sheet);
      c+=vec3(.3)*exp(-pow(q/.0035,2.))*.28;
      // Broad studio light, coherent with the same cursor direction.
      vec2 spot=(uv-(vec2(.64,.56)+(light-.5)*.16))/vec2(.42,.48);
      c+=vec3(.005)*exp(-dot(spot,spot)*2.);
      float beam=uv.x+uv.y*.48-(.94+(light.x-.5)*.15);
      c+=vec3(.035)*exp(-pow(beam/.065,2.));
      vec2 floorPool=(uv-vec2(.55+(light.x-.5)*.15,.12))/vec2(.44,.10);
      c+=vec3(.022)*exp(-dot(floorPool,floorPool)*1.6);
      return max(c*energy,vec3(.003));
    }
  `;
