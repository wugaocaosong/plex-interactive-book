import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {planetMaterial,random} from './galaxy-art';
import {GalaxyEffects,stellarMaterial} from './galaxy-vfx';

export interface SolarLabel {x:number;y:number;visible:boolean}
export class SolarEngine {
  private renderer:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.PerspectiveCamera(43,1,.1,150);private controls:OrbitControls;private worlds:T.Mesh[]=[];private times:number[]=[];private effects:GalaxyEffects;
  private perfTime=0;private perfFrames=0;private degraded=false;private sun:T.Mesh<T.SphereGeometry,T.ShaderMaterial>;
  private observer:ResizeObserver;private raf=0;private last=0;private labelTime=0;private stopped=false;private held=-1;private active=true;private disposed=false;
  constructor(private canvas:HTMLCanvasElement,private count:number,private labels:(labels:SolarLabel[])=>void,private select:(index:number)=>void,private failed:()=>void){
    try{
      this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
      this.camera.position.set(0,13,21);this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=18;this.controls.maxDistance=40;this.controls.maxPolarAngle=Math.PI*.48;
      this.scene.add(new T.AmbientLight('#a8c8ee',1.6));this.scene.add(new T.PointLight('#ffe4b1',80,40));
      this.sun=new T.Mesh(new T.SphereGeometry(.9,32,24),stellarMaterial('#ffe3a2'));this.scene.add(this.sun);
      const halo=new T.Mesh(new T.SphereGeometry(1.12,24,20),new T.MeshBasicMaterial({color:'#80dce5',transparent:true,opacity:.12,depthWrite:false}));this.scene.add(halo);
      const colors=['#70cfc9','#8b9bdf','#d6b57e','#cc90c1'];
      for(let band=0;band<4;band++){const r=3.2+band*2.1;const points=Array.from({length:129},(_,i)=>{const a=i/128*Math.PI*2;return new T.Vector3(Math.cos(a)*r,0,Math.sin(a)*r);});this.scene.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:colors[band],transparent:true,opacity:.3})));}
      for(let i=0;i<count;i++){const mesh=new T.Mesh(new T.SphereGeometry(.26+(i%3)*.07,24,16),planetMaterial(colors[Math.floor(i/4)%4],i*7));mesh.name=String(i);this.worlds.push(mesh);this.times.push(i%4*Math.PI/2+Math.floor(i/4)*.42);this.scene.add(mesh);}
      const rand=random(314),points=Array.from({length:1800},()=>new T.Vector3((rand()-.5)*65,(rand()-.5)*45,(rand()-.5)*65));this.scene.add(new T.Points(new T.BufferGeometry().setFromPoints(points),new T.PointsMaterial({size:.035,color:'#b5c7ed',transparent:true,opacity:.6})));
      this.effects=new GalaxyEffects(this.scene,canvas.clientWidth<700);this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();canvas.addEventListener('webglcontextlost',this.lost);document.addEventListener('visibilitychange',this.visibility);this.frame(performance.now());
    }catch(error){this.dispose();throw error;}
  }
  private resize(){if(this.disposed)return;const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/Math.max(1,h);this.camera.fov=w<600?62:43;this.camera.updateProjectionMatrix();}
  pause(value:boolean){this.stopped=value;}
  hover(index:number){this.held=index;}
  choose(index:number){if(!this.stopped)this.effects.burst(this.worlds[index].position);this.select(index);}
  private visibility=()=>{this.active=!document.hidden;cancelAnimationFrame(this.raf);if(this.active){this.last=0;this.frame(performance.now());}};
  private lost=(event:Event)=>{event.preventDefault();this.failed();};
  private frame=(now:number)=>{if(this.disposed||!this.active)return;const frameTime=this.last?Math.min(1,(now-this.last)/1000):0,dt=Math.min(.05,frameTime);this.perfTime+=frameTime;this.perfFrames++;if(this.perfTime>4){const fps=this.perfFrames/this.perfTime;this.canvas.dataset.fps=fps.toFixed(1);if(fps<(this.canvas.clientWidth<700?27:43)&&!this.degraded){this.degraded=true;this.renderer.setPixelRatio(1);this.canvas.dataset.quality='reduced';}this.perfTime=0;this.perfFrames=0;}if(!this.stopped)this.sun.material.uniforms.time.value+=dt;this.last=now;this.controls.update();this.worlds.forEach((mesh,i)=>{if(!this.stopped&&this.held!==i){this.times[i]+=dt*(.12/(1+Math.floor(i/4)*.4));mesh.rotation.y+=dt*.3;}const a=this.times[i],r=3.2+Math.floor(i/4)*2.1;mesh.position.set(Math.cos(a)*r,0,Math.sin(a)*r);});this.effects.update(dt,this.camera);this.renderer.render(this.scene,this.camera);if(now-this.labelTime>60){this.labels(this.worlds.map(mesh=>{const p=mesh.position.clone().project(this.camera);return {x:(p.x+1)*50,y:(1-p.y)*50,visible:p.z>-1&&p.z<1&&Math.abs(p.x)<.98&&Math.abs(p.y)<.94};}));this.labelTime=now;}this.raf=requestAnimationFrame(this.frame);};
  dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.observer?.disconnect();this.controls?.dispose();this.effects?.dispose();this.canvas.removeEventListener('webglcontextlost',this.lost);document.removeEventListener('visibilitychange',this.visibility);this.scene.traverse(object=>{const mesh=object as T.Mesh;mesh.geometry?.dispose();if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>m.dispose());});this.renderer?.dispose();}
}
