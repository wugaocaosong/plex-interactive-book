import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadLittleE,disposeLittleE} from './little-e-model';
import {orbitalPath,orbitPoint} from './orbital-path';
import {random} from './galaxy-art';
import {GalaxyEffects} from './galaxy-vfx';
import {SpaceSurfaces,planetSkins} from './space-surfaces';
import {SpacePost} from './space-atmosphere';

export interface SolarLabel {x:number;y:number;visible:boolean}
export class SolarEngine {
  private renderer:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.PerspectiveCamera(43,1,.1,150);private controls:OrbitControls;private worlds:T.Mesh[]=[];private times:number[]=[];private effects:GalaxyEffects;
  private perfTime=0;private perfFrames=0;private degraded=false;private mascot?:T.Group;private paths:ReturnType<typeof orbitalPath>[]=[];
  private observer:ResizeObserver;private raf=0;private last=0;private labelTime=0;private stopped=false;private held=-1;private active=true;private disposed=false;
  readonly ready:Promise<void>;private surfaces:SpaceSurfaces;private post:SpacePost;private elapsed=0;
  private down?:{x:number;y:number;index:number};private ray=new T.Raycaster();
  constructor(private canvas:HTMLCanvasElement,private count:number,private labels:(labels:SolarLabel[])=>void,private select:(index:number)=>void,private failed:()=>void,private modelState:(state:'ready'|'failed')=>void=()=>{}){
    try{
      this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
      this.camera.position.set(0,16,21);this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=18;this.controls.maxDistance=40;this.controls.maxPolarAngle=Math.PI*.48;
      this.surfaces=new SpaceSurfaces(Math.min(8,this.renderer.capabilities.getMaxAnisotropy()));
      this.scene.add(new T.HemisphereLight('#d9f3ff','#223345',2));const rim=new T.DirectionalLight('#80e9ed',2);rim.position.set(3,4,-6);this.scene.add(rim);
      const key=new T.DirectionalLight('#e2efff',1.35);key.position.set(-7,10,8);this.scene.add(key);
      const platform=new T.Mesh(new T.TorusGeometry(1.7,.018,8,96),new T.MeshBasicMaterial({color:'#8be1e4',transparent:true,opacity:.65}));platform.rotation.x=Math.PI/2;platform.position.y=-2.4;platform.raycast=()=>{};this.scene.add(platform);
      canvas.dataset.model='loading';
      void loadLittleE().then(model=>{if(this.disposed){disposeLittleE(model);return;}this.mascot=model;model.position.y=.4;this.scene.add(model);canvas.dataset.model='ready';this.modelState('ready');},()=>{if(!this.disposed){canvas.dataset.model='failed';this.modelState('failed');}});
      this.post=new SpacePost(this.renderer,this.scene,this.camera,canvas.clientWidth<700);
      const colors=['#70cfc9','#8b9bdf','#d6b57e','#cc90c1'];
      for(let band=0;band<4;band++){const path=orbitalPath(3.8+band*1.85,band,colors[band]);this.paths.push(path);this.scene.add(path.root);}
      for(let i=0;i<count;i++){const mesh=this.surfaces.planet(.38+(i%3)*.075,planetSkins[i%planetSkins.length],String(i));mesh.rotation.y=i*.8;mesh.rotation.z=(i%3-1)*.14;this.worlds.push(mesh);this.times.push(i%4*Math.PI/2+Math.floor(i/4)*.42);this.scene.add(mesh);}
      this.ready=this.surfaces.ready().then(()=>{if(!this.disposed){canvas.dataset.surfaces='ready';canvas.dataset.textureCount=String(this.surfaces.textureCount);}});
      const rand=random(314),points=Array.from({length:1800},()=>new T.Vector3((rand()-.5)*65,(rand()-.5)*45,(rand()-.5)*65));this.scene.add(new T.Points(new T.BufferGeometry().setFromPoints(points),new T.PointsMaterial({size:.035,color:'#b5c7ed',transparent:true,opacity:.6})));
      this.effects=new GalaxyEffects(this.scene,canvas.clientWidth<700);this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();canvas.addEventListener('webglcontextlost',this.lost);canvas.addEventListener('pointerdown',this.pointerDown);canvas.addEventListener('pointermove',this.pointerMove);canvas.addEventListener('pointerup',this.pointerUp);canvas.addEventListener('pointercancel',this.pointerCancel);canvas.addEventListener('pointerleave',this.pointerLeave);document.addEventListener('visibilitychange',this.visibility);this.frame(performance.now());
    }catch(error){this.dispose();throw error;}
  }
  private resize(){if(this.disposed)return;const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.renderer.setSize(w,h,false);this.post?.resize(w,h);this.camera.aspect=w/Math.max(1,h);this.camera.fov=w<600?62:35;this.camera.updateProjectionMatrix();}
  pause(value:boolean){this.stopped=value;}
  hover(index:number){this.held=index;}
  choose(index:number){if(!this.stopped)this.effects.burst(this.worlds[index].position);this.select(index);}
  private hit(event:PointerEvent){this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);const r=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new T.Vector2((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2),this.camera);const hit=this.ray.intersectObjects(this.worlds,true)[0];return hit?Number(hit.object.name):-1;}
  private pointerDown=(event:PointerEvent)=>{if(event.button===0)this.down={x:event.clientX,y:event.clientY,index:this.hit(event)};};
  private pointerMove=(event:PointerEvent)=>{if(this.down&&Math.hypot(event.clientX-this.down.x,event.clientY-this.down.y)>6)this.down.index=-1;if(!event.buttons){this.held=this.hit(event);this.canvas.style.cursor=this.held>=0?'pointer':'grab';}};
  private pointerUp=(event:PointerEvent)=>{const d=this.down;this.down=undefined;if(d&&d.index>=0&&Math.hypot(event.clientX-d.x,event.clientY-d.y)<=6&&this.hit(event)===d.index)this.choose(d.index);};
  private pointerCancel=()=>{this.down=undefined;};
  private pointerLeave=()=>{this.held=-1;};
  private visibility=()=>{this.active=!document.hidden;cancelAnimationFrame(this.raf);if(this.active){this.last=0;this.frame(performance.now());}};
  private lost=(event:Event)=>{event.preventDefault();this.failed();};
  private frame=(now:number)=>{if(this.disposed||!this.active)return;const frameTime=this.last?Math.min(1,(now-this.last)/1000):0,dt=Math.min(.05,frameTime);this.perfTime+=frameTime;this.perfFrames++;if(this.perfTime>4){const fps=this.perfFrames/this.perfTime;this.canvas.dataset.fps=fps.toFixed(1);if(fps<(this.canvas.clientWidth<700?27:43)&&!this.degraded){this.degraded=true;this.renderer.setPixelRatio(1);this.canvas.dataset.quality='reduced';this.post.simplify();}this.perfTime=0;this.perfFrames=0;}if(!this.stopped){this.elapsed+=dt;}this.paths.forEach(path=>path.update(this.elapsed));if(this.mascot){this.mascot.position.y=.4+Math.sin(this.elapsed*1.25)*.16;this.mascot.rotation.y=Math.sin(this.elapsed*.3)*.18;}this.surfaces.update(this.elapsed,this.stopped?0:dt);this.last=now;this.controls.update();this.worlds.forEach((mesh,i)=>{if(!this.stopped&&this.held!==i){this.times[i]+=dt*(.12/(1+Math.floor(i/4)*.4));mesh.rotation.y+=dt*.3;}const a=this.times[i],band=Math.floor(i/4),r=3.8+band*1.85;mesh.position.copy(orbitPoint(a,r,band));});this.effects.update(this.stopped?0:dt,this.camera);this.post.render(!this.stopped);if(now-this.labelTime>60){this.labels(this.worlds.map(mesh=>{const p=mesh.position.clone().project(this.camera);return {x:(p.x+1)*50,y:(1-p.y)*50,visible:p.z>-1&&p.z<1&&Math.abs(p.x)<.98&&Math.abs(p.y)<.94};}));this.labelTime=now;}this.raf=requestAnimationFrame(this.frame);};
  dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.observer?.disconnect();this.controls?.dispose();this.effects?.dispose();this.canvas.removeEventListener('webglcontextlost',this.lost);this.canvas.removeEventListener('pointerdown',this.pointerDown);this.canvas.removeEventListener('pointermove',this.pointerMove);this.canvas.removeEventListener('pointerup',this.pointerUp);this.canvas.removeEventListener('pointercancel',this.pointerCancel);this.canvas.removeEventListener('pointerleave',this.pointerLeave);document.removeEventListener('visibilitychange',this.visibility);if(this.mascot)disposeLittleE(this.mascot);this.scene.traverse(object=>{const mesh=object as T.Mesh;mesh.geometry?.dispose();if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>m.dispose());});this.surfaces?.dispose();this.post?.dispose();this.renderer?.dispose();}
}
