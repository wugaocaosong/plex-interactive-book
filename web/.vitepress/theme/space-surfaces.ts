import * as T from 'three';
import simplex from './vendor/webgl-noise/noise3D.glsl?raw';

// Source maps are committed unchanged; see public/space/surfaces/manifest.json.
export const planetSkins = ['earth_daymap','mars','jupiter','saturn','moon','venus_surface','neptune','mercury'] as const;
export type PlanetSkin = typeof planetSkins[number];
const vertex = `varying vec2 vUv;varying vec3 vP;varying vec3 vN;varying vec3 vV;
void main(){vUv=uv;vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const output = '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n';

/** Per-scene cache: each map is uploaded once, and disposed with its renderer.
 * Late TextureLoader callbacks also dispose their results after navigation. */
export class SpaceSurfaces {
  private textures = new Map<string,T.Texture>();
  private pending:Promise<void>[]=[];
  private disposed=false;
  private animated:T.ShaderMaterial[]=[];
  private clouds:T.Mesh[]=[];
  constructor(private anisotropy=4){}
  map(name:string,color=true){
    const key=name+(color?'srgb':'linear');const cached=this.textures.get(key);if(cached)return cached;
    let resolve!:()=>void,reject!:(reason:Error)=>void;
    const pending=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
    // Catch immediately so an early 404 cannot become an unhandled rejection.
    pending.catch(()=>{});this.pending.push(pending);
    const texture=new T.TextureLoader().load(`/space/surfaces/2k_${name}.${name==='saturn_ring_alpha'?'png':'jpg'}`,
      value=>{if(this.disposed)value.dispose();resolve();},undefined,()=>reject(new Error(`Planet map failed: ${name}`)));
    texture.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;
    texture.anisotropy=this.anisotropy;texture.wrapS=T.RepeatWrapping;
    this.textures.set(key,texture);return texture;
  }
  ready(){return Promise.all(this.pending);}
  get textureCount(){return this.textures.size;}
  planet(radius:number,skin:PlanetSkin,id:string){
    const map=this.map(skin);
    const material=new T.MeshStandardMaterial({map,roughness:skin==='earth_daymap'?.72:.93,metalness:0});
    // A subtle height response makes rock/crater maps legible at grazing light.
    if(['moon','mercury','mars','venus_surface'].includes(skin)){material.bumpMap=map;material.bumpScale=radius*.028;}
    const mesh=new T.Mesh(new T.SphereGeometry(radius,40,28),material);mesh.name=id;mesh.userData.surface=skin;
    if(skin==='earth_daymap'){
      const clouds=new T.Mesh(new T.SphereGeometry(radius*1.012,40,28),new T.MeshStandardMaterial({color:'#f4f8ff',alphaMap:this.map('earth_clouds',false),transparent:true,opacity:.72,depthWrite:false,roughness:1}));
      clouds.name=id;mesh.add(clouds);this.clouds.push(clouds);
    }
    if(['earth_daymap','neptune','jupiter','saturn'].includes(skin)){
      const atmosphere=this.atmosphere(radius*1.04,skin==='earth_daymap'||skin==='neptune'?'#59aaf8':'#e3c19b');mesh.add(atmosphere);
    }
    if(skin==='saturn'){
      const geometry=new T.RingGeometry(radius*1.3,radius*2.15,96);
      const p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
      for(let i=0;i<p.count;i++)uv.setXY(i,(Math.hypot(p.getX(i),p.getY(i))/radius-1.3)/.85,.5);
      const ring=new T.Mesh(geometry,new T.MeshStandardMaterial({map:this.map('saturn_ring_alpha'),transparent:true,side:T.DoubleSide,depthWrite:false,roughness:1,opacity:.85}));
      ring.rotation.x=-Math.PI*.39;ring.rotation.y=.15;ring.name=id;mesh.add(ring);
    }
    return mesh;
  }
  atmosphere(radius:number,color:string){
    const material=new T.ShaderMaterial({uniforms:{tint:{value:new T.Color(color)}},vertexShader:vertex,fragmentShader:`uniform vec3 tint;varying vec3 vN;varying vec3 vV;
void main(){float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),3.5);gl_FragColor=vec4(tint,rim*.52);${output}}`,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
    const mesh=new T.Mesh(new T.SphereGeometry(radius,32,24),material);mesh.raycast=()=>{};return mesh;
  }
  starMaterial(color:string){
    const material=new T.ShaderMaterial({uniforms:{surface:{value:this.map('sun')},tint:{value:new T.Color(color)},time:{value:0}},vertexShader:vertex,fragmentShader:`${simplex}
uniform sampler2D surface;uniform vec3 tint;uniform float time;varying vec2 vUv;varying vec3 vP;varying vec3 vN;varying vec3 vV;
void main(){vec3 p=normalize(vP);float drift=snoise(p*4.+vec3(time*.035));vec2 uv=vUv+vec2(drift*.005,snoise(p*8.-time*.018)*.003);
vec3 tex=texture2D(surface,uv).rgb;float face=max(0.,dot(normalize(vN),normalize(vV)));float grain=.9+.1*snoise(p*30.+time*.08);
vec3 c=tex*mix(vec3(1.8,1.3,1.),tint*2.1,.22)*grain*(.55+.45*pow(face,.4));gl_FragColor=vec4(c,1.);${output}}`});
    this.animated.push(material);return material;
  }
  corona(radius:number,color:string){
    const material=new T.ShaderMaterial({uniforms:{time:{value:0},tint:{value:new T.Color(color)}},vertexShader:vertex,fragmentShader:`${simplex}
uniform float time;uniform vec3 tint;varying vec3 vP;varying vec3 vN;varying vec3 vV;
void main(){vec3 p=normalize(vP);float face=abs(dot(normalize(vN),normalize(vV)));float edge=pow(1.-face,3.);float noise=snoise(p*8.-vec3(0.,time*.18,0.));float fire=smoothstep(-.45,.85,noise);gl_FragColor=vec4(mix(tint,vec3(1.,.83,.5),fire),edge*(.1+.38*fire));${output}}`,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
    this.animated.push(material);const mesh=new T.Mesh(new T.SphereGeometry(radius,40,28),material);mesh.raycast=()=>{};return mesh;
  }
  update(time:number,dt:number){for(const m of this.animated)m.uniforms.time.value=time;for(const cloud of this.clouds)cloud.rotation.y+=dt*.025;}
  dispose(){this.disposed=true;for(const t of this.textures.values())t.dispose();this.textures.clear();this.animated=[];this.clouds=[];}
}
