import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {library} from './library';
import {galaxyDust,paintedGalaxy,planetMaterial,makeBook,random} from './galaxy-art';

export type GalaxyPhase='galaxy'|'approaching'|'book'|'opening';
export interface SceneLabel{id:string;x:number;y:number;visible:boolean}
interface Callbacks{select:(id:string)=>void;open:()=>void;labels:(labels:SceneLabel[])=>void;ready:()=>void;failed:()=>void;rotation:(values:number[])=>void}
/** One renderer owns the galaxy and book; navigation destroys all GPU resources. */
export class GalaxyEngine{
 private renderer:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.PerspectiveCamera(43,1,.1,180);
 private galaxy=new T.Group();private planets:T.Mesh[]=[];private backdrop=new T.Group();private book=makeBook();private controls:OrbitControls;
 private target:T.WebGLRenderTarget;private resizeObserver:ResizeObserver;private phase:GalaxyPhase='galaxy';private active=true;private destroyed=false;private raf=0;private last=0;private labelTime=0;
 private startTime=0;private savedPosition=new T.Vector3();private savedTarget=new T.Vector3();private cameraStart=new T.Vector3();private aimStart=new T.Vector3();private bookDistance=10;
 private pointers=new Map<number,{x:number;y:number}>();private down={x:0,y:0,hit:'',face:-1};private moved=false;private pinch=0;private velocity=new T.Vector2();private raycaster=new T.Raycaster();
 private mobile:boolean;private textureReady=false;private reduced:boolean;
 constructor(private canvas:HTMLCanvasElement,private callbacks:Callbacks,reduced=false){
  this.mobile=canvas.clientWidth<700;this.reduced=reduced;
  try{
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.mobile?1.25:1.5));this.renderer.setClearColor('#070d20',0);this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.camera.position.set(0,0,26);this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=18;this.controls.maxDistance=40;this.controls.minPolarAngle=Math.PI*.22;this.controls.maxPolarAngle=Math.PI*.78;this.controls.rotateSpeed=.35;this.controls.zoomSpeed=.6;
  const {plane,target}=paintedGalaxy(this.renderer,this.mobile);this.target=target;this.galaxy.add(plane,galaxyDust(this.mobile?6500:18000));this.galaxy.rotation.set(1.02,0,.42,'ZXY');this.galaxy.scale.setScalar(.82);this.backdrop.add(this.galaxy);this.scene.add(this.backdrop);
  const rand=random(712),points:number[]=[];for(let i=0;i<(this.mobile?450:1000);i++)points.push((rand()-.5)*100,(rand()-.5)*70,-25-rand()*35);
  const stars=new T.BufferGeometry();stars.setAttribute('position',new T.Float32BufferAttribute(points,3));this.backdrop.add(new T.Points(stars,new T.PointsMaterial({color:'#b1c1e5',size:.055,transparent:true,opacity:.65})));
  library.books.forEach((entry,i)=>{const mesh=new T.Mesh(new T.SphereGeometry(entry.radius,48,32),planetMaterial(entry.color,12+i*7));mesh.position.fromArray(entry.position);mesh.name=entry.id;this.planets.push(mesh);this.scene.add(mesh);});
  this.book.root.visible=false;this.book.root.scale.setScalar(.9);this.book.root.position.y=.35;this.scene.add(this.book.root);this.scene.add(new T.HemisphereLight('#e6f4ff','#23313e',2.4));const light=new T.DirectionalLight('#fff3df',3);light.position.set(-4,7,10);this.scene.add(light);const rim=new T.DirectionalLight('#55d3e9',2);rim.position.set(5,2,-4);this.scene.add(rim);
  new T.TextureLoader().load(library.books[0].cover!,texture=>{if(this.destroyed){texture.dispose();return;}texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.book.frontMaterial.map=texture;this.book.frontMaterial.needsUpdate=true;this.book.textures.push(texture);this.textureReady=true;callbacks.ready();},undefined,()=>{if(!this.destroyed)callbacks.failed();});
  canvas.addEventListener('pointerdown',this.pointerDown);canvas.addEventListener('pointermove',this.pointerMove);canvas.addEventListener('pointerup',this.pointerUp);canvas.addEventListener('pointercancel',this.pointerCancel);canvas.addEventListener('wheel',this.wheel,{passive:false});canvas.addEventListener('webglcontextlost',this.contextLost);window.addEventListener('blur',this.pointerCancel);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();this.start();
  }catch(error){this.dispose();throw error;}
 }
 private resize(){if(this.destroyed)return;const {width,height}=this.canvas.getBoundingClientRect();this.renderer.setSize(width,height,false);this.camera.aspect=width/Math.max(1,height);this.camera.updateProjectionMatrix();const narrow=width<700;this.bookDistance=Math.max(10,4.2/(2*Math.tan(T.MathUtils.degToRad(43/2))*this.camera.aspect));this.planets.forEach((p,i)=>{p.position.fromArray(library.books[i].position);if(narrow){p.position.x=i===0?.7:p.position.x*.42;p.position.y-=i===0?1.3:0;}});if(this.phase==='book')this.camera.position.set(0,0,this.bookDistance);this.projectLabels();}
 setPhase(phase:GalaxyPhase){
  if(this.phase===phase)return;this.phase=phase;this.startTime=performance.now();this.velocity.set(0,0);this.pointerCancel();
  if(phase==='approaching'){this.savedPosition.copy(this.camera.position);this.savedTarget.copy(this.controls.target);this.cameraStart.copy(this.camera.position);this.aimStart.copy(this.controls.target);}
  if(phase==='galaxy'){this.book.root.visible=false;this.planets.forEach(p=>p.visible=true);this.book.hinge.rotation.y=0;this.backdrop.position.z=0;(this.galaxy.children[0] as T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>).material.opacity=.85;if(this.savedPosition.length()){this.camera.position.copy(this.savedPosition);this.controls.target.copy(this.savedTarget);}this.controls.enabled=true;this.controls.update();}
  else{this.controls.enabled=false;if(phase==='book'){this.book.root.visible=true;this.planets.forEach(p=>p.visible=false);this.backdrop.position.z=-18;(this.galaxy.children[0] as T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>).material.opacity=.38;this.camera.position.set(0,0,this.bookDistance);this.camera.lookAt(0,0,0);this.resetBook();}}
 }
 resetBook(){this.book.root.rotation.set(-.12,.55,-.06);this.velocity.set(0,0);this.callbacks.rotation([this.book.root.rotation.x,this.book.root.rotation.y,this.book.root.rotation.z]);}
 rotateBook(x:number,y:number){if(this.phase!=='book')return;this.book.root.rotateOnWorldAxis(new T.Vector3(0,1,0),x);this.book.root.rotateOnWorldAxis(new T.Vector3(1,0,0),y);this.callbacks.rotation([this.book.root.rotation.x,this.book.root.rotation.y,this.book.root.rotation.z]);}
 setReduced(value:boolean){this.reduced=value;}
 setActive(value:boolean){this.active=value;this.pointerCancel();if(value)this.start();else{cancelAnimationFrame(this.raf);this.last=0;}}
 private hit(x:number,y:number){this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);const r=this.canvas.getBoundingClientRect();this.raycaster.setFromCamera(new T.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),this.camera);return this.raycaster.intersectObjects(this.phase==='book'?this.book.root.children:this.planets,true)[0];}
 private pointerDown=(event:PointerEvent)=>{if(!['galaxy','book'].includes(this.phase)||event.button!==0)return;const hit=this.hit(event.clientX,event.clientY);if(!this.pointers.size){this.down={x:event.clientX,y:event.clientY,hit:hit?.object.name||'',face:hit?.face?.materialIndex??-1};this.moved=false;}this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(this.pointers.size>1){this.moved=true;this.pinch=this.pinchDistance();}this.velocity.set(0,0);this.canvas.setPointerCapture(event.pointerId);};
 private pinchDistance(){const p=[...this.pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
 private pointerMove=(event:PointerEvent)=>{
  const old=this.pointers.get(event.pointerId);if(!old)return;
  const dx=event.clientX-old.x,dy=event.clientY-old.y;this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(Math.hypot(event.clientX-this.down.x,event.clientY-this.down.y)>6)this.moved=true;
  if(this.phase==='book'){
   if(this.pointers.size>1){const distance=this.pinchDistance();if(this.pinch>0&&distance>0)this.camera.position.z=T.MathUtils.clamp(this.camera.position.z*this.pinch/distance,this.bookDistance*.8,this.bookDistance*1.45);this.pinch=distance;}
   else if(this.moved){this.rotateBook(dx*.008,dy*.008);this.velocity.set(dx*.008,dy*.008);}
  }
 };
 private pointerUp=(event:PointerEvent)=>{if(!this.pointers.has(event.pointerId))return;this.pointers.delete(event.pointerId);if(this.canvas.hasPointerCapture(event.pointerId))this.canvas.releasePointerCapture(event.pointerId);if(this.pointers.size||this.moved)return;const hit=this.hit(event.clientX,event.clientY);if(this.phase==='galaxy'&&hit?.object.name===this.down.hit)this.callbacks.select(hit.object.name);if(this.phase==='book'&&this.textureReady&&this.down.hit==='front-cover'&&this.down.face===4&&hit?.object.name==='front-cover'&&hit.face?.materialIndex===4)this.callbacks.open();};
 private pointerCancel=()=>{for(const id of this.pointers.keys())if(this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);this.pointers.clear();this.velocity.set(0,0);this.moved=true;};
 private wheel=(event:WheelEvent)=>{if(this.phase!=='book')return;event.preventDefault();this.camera.position.z=T.MathUtils.clamp(this.camera.position.z+event.deltaY*.008,this.bookDistance*.8,this.bookDistance*1.45);};
 private contextLost=(event:Event)=>{event.preventDefault();cancelAnimationFrame(this.raf);this.callbacks.failed();};
 private projectLabels(){if(this.phase!=='galaxy'){this.callbacks.labels([]);return;}this.callbacks.labels(this.planets.map(p=>{const point=p.position.clone();point.y+=library.books.find(b=>b.id===p.name)!.radius;point.project(this.camera);return {id:p.name,x:(point.x+1)*50,y:(1-point.y)*50,visible:point.z>-1&&point.z<1&&Math.abs(point.x)<.96&&Math.abs(point.y)<.92};}));}
 private start(){if(this.destroyed||!this.active)return;cancelAnimationFrame(this.raf);this.last=performance.now();this.raf=requestAnimationFrame(this.frame);}
 private frame=(now:number)=>{
  if(this.destroyed||!this.active)return;const dt=Math.min(.05,(now-this.last)/1000);this.last=now;
  if(this.phase==='galaxy'){this.controls.update();if(!this.reduced)this.galaxy.rotation.z+=dt*.006;this.planets[0].rotation.y+=this.reduced?0:dt*.025;}
  if(this.phase==='approaching'){const t=T.MathUtils.clamp((now-this.startTime)/1500,0,1),e=t*t*(3-2*t),point=this.planets[0].position;this.camera.position.lerpVectors(this.cameraStart,point.clone().add(new T.Vector3(0,.2,6)),e);this.camera.lookAt(this.aimStart.clone().lerp(point,e));}
  if(this.phase==='book'&&!this.pointers.size&&!this.reduced&&this.velocity.length()>.0001){this.rotateBook(this.velocity.x,this.velocity.y);this.velocity.multiplyScalar(Math.exp(-dt*9));}
  if(this.phase==='opening'){const t=T.MathUtils.clamp((now-this.startTime)/700,0,1);this.book.hinge.rotation.y=-(t*t*(3-2*t))*Math.PI*.86;}
  this.renderer.render(this.scene,this.camera);if(now-this.labelTime>80){this.projectLabels();this.labelTime=now;}this.raf=requestAnimationFrame(this.frame);
 };
 dispose(){this.destroyed=true;cancelAnimationFrame(this.raf);this.pointerCancel();this.resizeObserver?.disconnect();this.controls?.dispose();this.canvas.removeEventListener('pointerdown',this.pointerDown);this.canvas.removeEventListener('pointermove',this.pointerMove);this.canvas.removeEventListener('pointerup',this.pointerUp);this.canvas.removeEventListener('pointercancel',this.pointerCancel);this.canvas.removeEventListener('wheel',this.wheel);this.canvas.removeEventListener('webglcontextlost',this.contextLost);window.removeEventListener('blur',this.pointerCancel);const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();this.scene.traverse(obj=>{const mesh=obj as T.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.book.textures.forEach(t=>t.dispose());this.target?.dispose();this.renderer?.dispose();}
}
