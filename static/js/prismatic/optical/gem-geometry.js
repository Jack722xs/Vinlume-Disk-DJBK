import * as THREE from './vendor/three/build/three.module.js';

function offsetPolygon(points, distance) {
  return points.map((b,i)=>{
    const a=points[(i+points.length-1)%points.length],c=points[(i+1)%points.length];
    const u=new THREE.Vector2().subVectors(b,a).normalize(),v=new THREE.Vector2().subVectors(c,b).normalize();
    return b.clone().add(new THREE.Vector2(-u.y-v.y,u.x+v.x).multiplyScalar(distance/(1+u.dot(v))));
  });
}

/** Closed crown / girdle / pavilion, flat normals from actual 3D surfaces. */
export function makeGemGeometry(outlines, width) {
  const positions=[];
  function triangle(a,b,c,reverse=false) {
    positions.push(...a,...(reverse?c:b),...(reverse?b:c));
  }
  function ring(a,b,za,zb,reverse=false) {
    for(let i=0;i<a.length;i++){
      const j=(i+1)%a.length;
      triangle([...a[i],za],[...a[j],za],[...b[j],zb],reverse);
      triangle([...a[i],za],[...b[j],zb],[...b[i],zb],reverse);
    }
  }
  for(const outline of outlines){
    // Screen-space outline is clockwise after flipping Y to world coordinates.
    const edge=outline.map(([x,y])=>new THREE.Vector2((x-width/2)/100,(180-y)/100)).reverse();
    const crown=offsetPolygon(edge,.085),pavilion=offsetPolygon(edge,.08);
    ring(edge,crown,.035,.18);
    ring(edge,edge,-.07,.035);
    ring(edge,pavilion,-.07,-.34,true);
    function cap(points,z,bulge,reverse){
      const faces=THREE.ShapeUtils.triangulateShape(points,[]);
      faces.forEach((face,i)=>{
        const p=face.map(j=>points[j]);
        const center=p.reduce((v,q)=>v.add(q),new THREE.Vector2()).multiplyScalar(1/3);
        // Small crown cuts and deeper pavilion cuts create real internal paths.
        const cz=z+bulge*(.8+(i%3)*.12);
        for(let j=0;j<3;j++)triangle([...p[j],z],[...p[(j+1)%3],z],[...center,cz],reverse);
      });
    }
    cap(crown,.18,.026,false);
    cap(pavilion,-.34,-.09,true);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return geometry;
}

export function inspectSolid(geometry) {
  const edges=new Map(),p=geometry.attributes.position;
  let volume=0;
  const key=(i)=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>(Math.round(v*1e5)/1e5).toFixed(5)).join(',');
  for(let i=0;i<p.count;i+=3){
    const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,i+j));
    volume+=v[0].dot(new THREE.Vector3().crossVectors(v[1],v[2]))/6;
    for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]){
      const ka=key(a),kb=key(b),k=[ka,kb].sort().join('|');
      const entry=edges.get(k)||{count:0,direction:0};entry.count++;entry.direction+=ka<kb?1:-1;edges.set(k,entry);
    }
  }
  const invalid=[...edges.values()].filter(e=>e.count!==2||e.direction!==0).length;
  return {triangles:p.count/3,edges:edges.size,invalidEdges:invalid,volume:+volume.toFixed(4)};
}

/** A closed faceted optical disc; abstract brand object, not a product model. */
export function makeOpticalDisc() {
  const rings=[
    [1.25,-.035],[1.25,.035],[1.16,.13],[.38,.13],[.29,.035],
    [.29,-.035],[.38,-.16],[1.16,-.16]
  ],segments=96,positions=[];
  for(let ring=0;ring<rings.length;ring++){
    const [ra,za]=rings[ring],[rb,zb]=rings[(ring+1)%rings.length];
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
      const p=[ra*Math.cos(a),ra*Math.sin(a),za],q=[ra*Math.cos(b),ra*Math.sin(b),za];
      const r=[rb*Math.cos(b),rb*Math.sin(b),zb],s=[rb*Math.cos(a),rb*Math.sin(a),zb];
      // Crown facets have gentle radial folds; their shared ring stays watertight.
      const mid=[(p[0]+q[0]+r[0]+s[0])/4,(p[1]+q[1]+r[1]+s[1])/4,(za+zb)/2];
      if(ring===2)mid[2]+=.013*(i%2?1:-1);
      if(ring===6)mid[2]-=.018*(i%2?1:-1);
      for(const [u,v] of [[p,q],[q,r],[r,s],[s,p]])positions.push(...u,...v,...mid);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
