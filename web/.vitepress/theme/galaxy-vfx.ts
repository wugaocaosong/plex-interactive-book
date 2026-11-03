import * as T from 'three';
import {BatchedRenderer,ParticleSystem,ConstantValue,IntervalValue,ConstantColor,Vector4,Vector3,ColorOverLife,Gradient,SphereEmitter,RenderMode} from 'three.quarks';
import {stellarOrbits,type StellarOrbit} from './library';
import {EffectGate} from './space-model';
import {canvasTexture} from './galaxy-art';

/** Bounded transient emitters. No textures or effects are downloaded at runtime. */
export class GalaxyEffects {
  readonly renderer=new BatchedRenderer();
  private gate=new EffectGate();
  private effects:{system:ParticleSystem;ring:T.Mesh<T.RingGeometry,T.MeshBasicMaterial>;age:number}[]=[];
  private texture=canvasTexture(c=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(.2,'#fff');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,64,64);},64,64);
  private material=new T.MeshBasicMaterial({map:this.texture,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
  private comet:ParticleSystem;private attraction:ParticleSystem;private ambient=false;private attracting=false;private time=0;
  constructor(private scene:T.Scene,private mobile:boolean){scene.add(this.renderer);
    const flowing=(inward:boolean)=>new ParticleSystem({duration:20,looping:true,worldSpace:true,shape:new SphereEmitter({radius:inward?1.8:.05}),startLife:new IntervalValue(inward?1:.5,inward?1.5:2.8),startSpeed:new ConstantValue(inward?-1.15:.02),startSize:new IntervalValue(.025,inward?.09:.13),startColor:new ConstantColor(new Vector4(.45,.84,1,.8)),emissionOverTime:new ConstantValue(mobile?24:65),material:this.material,renderMode:RenderMode.BillBoard,behaviors:[new ColorOverLife(new Gradient([[new Vector3(1,1,1),0],[new Vector3(.5,.4,1),1]],[[.85,0],[0,1]]))]});
    this.comet=flowing(false);this.attraction=flowing(true);for(const system of [this.comet,this.attraction]){scene.add(system.emitter);this.renderer.addSystem(system);system.stop();}
  }
  hover(position?:T.Vector3){if(position){this.attraction.emitter.position.copy(position);if(!this.attracting){this.attraction.restart();this.attraction.play();this.attracting=true;}}else if(this.attracting){this.attraction.stop();this.attracting=false;}}
  burst(position:T.Vector3,strong=false){
    if(!this.gate.accept(performance.now(),this.effects.length))return;
    const system=new ParticleSystem({duration:.1,looping:false,worldSpace:true,shape:new SphereEmitter({radius:strong?.65:.08}),startLife:new IntervalValue(.5,1.6),startSpeed:new IntervalValue(strong?1.3:.4,strong?5:2),startSize:new IntervalValue(.035,strong?.19:.1),startColor:new ConstantColor(new Vector4(.4,.86,1,1)),emissionOverTime:new ConstantValue(0),emissionBursts:[{time:0,count:new ConstantValue(this.mobile?(strong?180:70):(strong?600:180)),cycle:1,interval:0,probability:1}],material:this.material,renderMode:RenderMode.StretchedBillBoard,speedFactor:.18,behaviors:[new ColorOverLife(new Gradient([[new Vector3(1,1,1),0],[new Vector3(.65,.35,1),1]],[[1,0],[0,1]]))]});
    system.emitter.position.copy(position);this.scene.add(system.emitter);this.renderer.addSystem(system);
    const ring=new T.Mesh(new T.RingGeometry(.9,1,96),new T.MeshBasicMaterial({color:strong?'#9efcff':'#9e85ff',transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));ring.position.copy(position);this.scene.add(ring);
    this.effects.push({system,ring,age:0});
  }
  update(dt:number,camera:T.Camera,ambient=false){
    if(ambient!==this.ambient){this.ambient=ambient;if(ambient){this.comet.restart();this.comet.play();}else this.comet.stop();}
    if(ambient){this.time+=dt;this.comet.emitter.position.set(Math.cos(this.time*.22)*12,Math.sin(this.time*.22)*6,-2+Math.sin(this.time*.22)*2);}
    this.scene.updateMatrixWorld();this.renderer.update(dt);for(const effect of [...this.effects]){effect.age+=dt;effect.ring.quaternion.copy(camera.quaternion);effect.ring.scale.setScalar(.2+effect.age*3);effect.ring.material.opacity=Math.max(0,.7-effect.age*.65);if(effect.age>1.9){this.renderer.deleteSystem(effect.system);effect.system.dispose();effect.system.emitter.removeFromParent();effect.ring.removeFromParent();effect.ring.geometry.dispose();effect.ring.material.dispose();this.effects.splice(this.effects.indexOf(effect),1);}}
  }
  get count(){return this.effects.reduce((n,e)=>n+e.system.particleNum,0)+this.comet.particleNum+this.attraction.particleNum;}
  clear(){for(const e of this.effects){this.renderer.deleteSystem(e.system);e.system.dispose();e.system.emitter.removeFromParent();e.ring.removeFromParent();e.ring.geometry.dispose();e.ring.material.dispose();}this.effects=[];this.comet.stop();this.attraction.stop();this.ambient=false;this.attracting=false;}
  dispose(){this.clear();for(const system of [this.comet,this.attraction]){this.renderer.deleteSystem(system);system.dispose();system.emitter.removeFromParent();}for(const batch of this.renderer.batches){batch.geometry.dispose();if(Array.isArray(batch.material))batch.material.forEach(m=>m.dispose());else batch.material.dispose();}this.renderer.removeFromParent();this.material.dispose();this.texture.dispose();}
}

export function stellarMaterial(color:string){return new T.ShaderMaterial({uniforms:{tint:{value:new T.Color(color)},time:{value:0}},vertexShader:'varying vec3 n;varying vec3 v;varying vec3 p;void main(){p=position;n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',fragmentShader:'uniform vec3 tint;uniform float time;varying vec3 n;varying vec3 v;varying vec3 p;void main(){float facing=max(0.,dot(normalize(n),normalize(v)));float grain=sin(p.x*35.+time*.7)*sin(p.y*29.-time*.5)*sin(p.z*24.+time*.3);float swirls=sin(p.y*8.+sin(p.x*9.+time*.15))* .08;vec3 c=mix(tint*.4,vec3(1.,.96,.82),pow(facing,1.8)*.8)+grain*.07+swirls;gl_FragColor=vec4(c,1.);}' });}
export function makeStellarSystem(color:string,radius:number,id:string,specs:StellarOrbit[]=stellarOrbits){
  const group=new T.Group(),orbits=new T.Group(),satellites:T.Mesh[]=[];
  const sun=new T.Mesh(new T.SphereGeometry(radius*.38,28,20),stellarMaterial(color));sun.name=id;group.add(sun);group.add(orbits);
  const glow=new T.Mesh(new T.SphereGeometry(radius*.48,24,16),new T.MeshBasicMaterial({color,transparent:true,opacity:.13,depthWrite:false,blending:T.AdditiveBlending}));group.add(glow);
  for(let i=0;i<specs.length;i++){
    const r=radius*specs[i].radius,pts=Array.from({length:97},(_,j)=>new T.Vector3(Math.cos(j/96*Math.PI*2)*r,Math.sin(j/96*Math.PI*2)*r,0));
    orbits.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color,transparent:true,opacity:.38})));
    const planet=new T.Mesh(new T.SphereGeometry(radius*specs[i].size,16,12),new T.MeshStandardMaterial({color:specs[i].color,roughness:.6}));planet.name=id;satellites.push(planet);orbits.add(planet);
  }
  orbits.rotation.set(.7,.2,.25);
  return {group,sun,orbits,satellites,radius,glow,specs};
}
