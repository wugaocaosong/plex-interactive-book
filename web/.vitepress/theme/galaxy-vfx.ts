import * as T from 'three';
import {BatchedRenderer,ParticleSystem,ConstantValue,IntervalValue,ConstantColor,Vector4,Vector3,ColorOverLife,Gradient,SphereEmitter,RenderMode} from 'three.quarks';
import {stellarOrbits,type StellarOrbit} from './library';
import {EffectGate} from './space-model';
import {canvasTexture} from './galaxy-art';
import {SpaceSurfaces,planetSkins} from './space-surfaces';
import {shockwave} from './space-atmosphere';

/** Bounded transient emitters. No textures or effects are downloaded at runtime. */
export class GalaxyEffects {
  readonly renderer=new BatchedRenderer();
  private gate=new EffectGate();
  private effects:{system:ParticleSystem;ring:ReturnType<typeof shockwave>;age:number;strong:boolean}[]=[];
  // Longitudinal fade + a soft cross section gives Trail a continuous tapered
  // ribbon. This canvas is original rendering code, not a third-party image.
  private trailTexture=canvasTexture(c=>{for(let x=0;x<256;x++){const alpha=Math.sin(x/256*Math.PI)**.6;const g=c.createLinearGradient(0,0,0,32);g.addColorStop(0,'#ffffff00');g.addColorStop(.35,`rgba(130,195,255,${alpha*.35})`);g.addColorStop(.5,`rgba(255,255,255,${alpha})`);g.addColorStop(.65,`rgba(130,195,255,${alpha*.35})`);g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(x,0,1,32);}},256,32);
  private trailMaterial=new T.MeshBasicMaterial({map:this.trailTexture,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
  private comet:ParticleSystem;private attraction:ParticleSystem;private ambient=false;private attracting=false;private time=0;
  constructor(private scene:T.Scene,private mobile:boolean){scene.add(this.renderer);
    const flowing=(inward:boolean)=>new ParticleSystem({duration:20,looping:true,worldSpace:true,shape:new SphereEmitter({radius:inward?1.9:.015}),startLife:new IntervalValue(inward?1.2:2.8,inward?1.7:3.2),startSpeed:new ConstantValue(inward?-1.1:0),startSize:new IntervalValue(inward?.035:.1,inward?.075:.15),startColor:new ConstantColor(new Vector4(.48,.76,1,.75)),emissionOverTime:new ConstantValue(inward?(mobile?12:20):.8),material:this.trailMaterial,renderMode:RenderMode.Trail,rendererEmitterSettings:{startLength:new ConstantValue(inward?18:80),followLocalOrigin:!inward},behaviors:[new ColorOverLife(new Gradient([[new Vector3(.8,1,1),0],[new Vector3(.45,.25,.8),1]],[[.7,0],[0,1]]))]});
    this.comet=flowing(false);this.attraction=flowing(true);for(const system of [this.comet,this.attraction]){scene.add(system.emitter);this.renderer.addSystem(system);system.stop();}
  }
  hover(position?:T.Vector3){if(position){this.attraction.emitter.position.copy(position);if(!this.attracting){this.attraction.restart();this.attraction.play();this.attracting=true;}}else if(this.attracting){this.attraction.stop();this.attracting=false;}}
  burst(position:T.Vector3,strong=false){
    if(!this.gate.accept(performance.now(),this.effects.length))return;
    const system=new ParticleSystem({duration:.1,looping:false,worldSpace:true,shape:new SphereEmitter({radius:strong?.65:.08}),startLife:new IntervalValue(.45,1.4),startSpeed:new IntervalValue(strong?2.2:.8,strong?7:3.2),startSize:new IntervalValue(.012,strong?.045:.03),startColor:new ConstantColor(new Vector4(.55,.88,1,1)),emissionOverTime:new ConstantValue(0),emissionBursts:[{time:0,count:new ConstantValue(this.mobile?(strong?64:36):(strong?180:110)),cycle:1,interval:0,probability:1}],material:this.trailMaterial,renderMode:RenderMode.Trail,rendererEmitterSettings:{startLength:new ConstantValue(this.mobile?10:18),followLocalOrigin:false},behaviors:[new ColorOverLife(new Gradient([[new Vector3(1,1,1),0],[new Vector3(.65,.35,1),1]],[[1,0],[0,1]]))]});
    system.emitter.position.copy(position);this.scene.add(system.emitter);this.renderer.addSystem(system);
    const ring=shockwave();ring.position.copy(position);ring.material.uniforms.strength.value=strong?1:.8;ring.raycast=()=>{};this.scene.add(ring);
    this.effects.push({system,ring,age:0,strong});
  }
  update(dt:number,camera:T.Camera,ambient=false){
    if(ambient!==this.ambient){this.ambient=ambient;if(ambient){this.comet.restart();this.comet.play();}else this.comet.stop();}
    if(ambient){this.time+=dt;this.comet.emitter.position.set(Math.cos(this.time*.35)*12,Math.sin(this.time*.35)*6,-2+Math.sin(this.time*.35)*2);}
    this.scene.updateMatrixWorld();this.renderer.update(dt);for(const effect of [...this.effects]){effect.age+=dt;effect.ring.quaternion.copy(camera.quaternion);effect.ring.scale.setScalar(.12+effect.age*(effect.strong?5:3.8));effect.ring.material.uniforms.age.value=effect.age;if(effect.age>1.9){this.renderer.deleteSystem(effect.system);effect.system.dispose();effect.system.emitter.removeFromParent();effect.ring.removeFromParent();effect.ring.geometry.dispose();effect.ring.material.dispose();this.effects.splice(this.effects.indexOf(effect),1);}}
  }
  get count(){return this.effects.reduce((n,e)=>n+e.system.particleNum,0)+this.comet.particleNum+this.attraction.particleNum;}
  clear(){for(const e of this.effects){this.renderer.deleteSystem(e.system);e.system.dispose();e.system.emitter.removeFromParent();e.ring.removeFromParent();e.ring.geometry.dispose();e.ring.material.dispose();}this.effects=[];this.comet.stop();this.attraction.stop();this.ambient=false;this.attracting=false;}
  dispose(){this.clear();for(const system of [this.comet,this.attraction]){this.renderer.deleteSystem(system);system.dispose();system.emitter.removeFromParent();}for(const batch of this.renderer.batches){batch.geometry.dispose();if(Array.isArray(batch.material))batch.material.forEach(m=>m.dispose());else batch.material.dispose();}this.renderer.removeFromParent();this.trailMaterial.dispose();this.trailTexture.dispose();}
}

export function makeStellarSystem(color:string,radius:number,id:string,surfaces:SpaceSurfaces,variant=0,specs:StellarOrbit[]=stellarOrbits){
  const group=new T.Group(),orbits=new T.Group(),satellites:T.Mesh[]=[];
  const sun=new T.Mesh(new T.SphereGeometry(radius*.38,40,28),surfaces.starMaterial(color));sun.name=id;group.add(sun);group.add(orbits);
  const glow=surfaces.corona(radius*.44,color);group.add(glow);
  for(let i=0;i<specs.length;i++){
    const r=radius*specs[i].radius,pts=Array.from({length:97},(_,j)=>new T.Vector3(Math.cos(j/96*Math.PI*2)*r,Math.sin(j/96*Math.PI*2)*r,0));
    orbits.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color,transparent:true,opacity:.38})));
    const skin=planetSkins[(variant*3+i)%planetSkins.length];const planet=surfaces.planet(radius*specs[i].size,skin,id);planet.rotation.y=variant+i*1.3;satellites.push(planet);orbits.add(planet);
    const a=variant*2+i*2.1;planet.position.set(Math.cos(a)*r,Math.sin(a)*r,0);
  }
  orbits.rotation.set(.7,.2,.25);
  return {group,sun,orbits,satellites,radius,glow,specs};
}
