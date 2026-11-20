import * as T from 'three';

/** One shared analytic ellipse for the path and its moving body. */
export function orbitPoint(angle:number,radius:number,band:number){
  return new T.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius*.16*Math.sin(band*.9),Math.sin(angle)*radius*(.78+band*.045));
}

export function orbitalPath(radius:number,band:number,color:string){
  const root=new T.Group(),points=Array.from({length:161},(_,i)=>orbitPoint(i/160*Math.PI*2,radius,band));
  const path=new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color,transparent:true,opacity:.21,depthWrite:false}));path.raycast=()=>{};root.add(path);
  const count=54,positions=new Float32Array(count*3),colors=new Float32Array(count*3),tint=new T.Color(color);
  for(let i=0;i<count;i++){const fade=(i/(count-1))**2;colors.set([tint.r*fade,tint.g*fade,tint.b*fade],i*3);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  const trail=new T.Line(geometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false}));trail.frustumCulled=false;trail.raycast=()=>{};root.add(trail);
  const tip=new T.Mesh(new T.SphereGeometry(.045,8,6),new T.MeshBasicMaterial({color}));tip.raycast=()=>{};root.add(tip);
  function update(time:number){const head=time*(.13+band*.025)+band*1.7;for(let i=0;i<count;i++){const p=orbitPoint(head-(1-i/(count-1))*.85,radius,band);p.toArray(positions,i*3);}geometry.attributes.position.needsUpdate=true;tip.position.copy(orbitPoint(head,radius,band));}
  update(0);return {root,update};
}
