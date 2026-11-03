import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import simplex from './vendor/webgl-noise/noise3D.glsl?raw';

/** Low-frequency translucent wisps. The existing Galaxy Explorer disk supplies
 * the spiral structure; this layer supplies continuous flow between stars. */
export function nebulaVeil(){
  const material=new T.ShaderMaterial({uniforms:{time:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`${simplex}
uniform float time;varying vec2 vUv;
float fbm(vec3 p){return .56*snoise(p)+.28*snoise(p*2.03+8.)+.14*snoise(p*4.1+17.);}
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float t=time*.018;
vec3 q=vec3(p*3.,t);float warp=fbm(q+vec3(0.,0.,t));float cloud=fbm(q+warp*.7);
float arms=pow(.5+.5*cos(a*2.-r*12.+warp*.6),3.);float mask=(1.-smoothstep(.2,1.,r))*smoothstep(.02,.25,r);
float density=smoothstep(-.38,.55,cloud)*mask*(.18+.82*arms);
vec3 tint=mix(vec3(.18,.29,.62),vec3(.48,.2,.59),smoothstep(-.3,.5,warp));gl_FragColor=vec4(tint,density*.18);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  const mesh=new T.Mesh(new T.PlaneGeometry(43,43),material);mesh.position.z=.4;mesh.raycast=()=>{};return mesh;
}

/** Official Three.js bloom, half-resolution on desktop. Never adds a renderer.
 * Mobile/automatic-low quality use the direct path; book covers stay unbloomed. */
export class SpacePost {
  private composer?:EffectComposer;private bloom?:UnrealBloomPass;private output?:OutputPass;private pass?:RenderPass;
  private enabled=true;
  constructor(private renderer:T.WebGLRenderer,private scene:T.Scene,private camera:T.Camera,mobile:boolean){
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
    if(!mobile){this.composer=new EffectComposer(renderer);this.pass=new RenderPass(scene,camera);this.bloom=new UnrealBloomPass(new T.Vector2(256,256),.42,.65,1.05);this.output=new OutputPass();this.composer.addPass(this.pass);this.composer.addPass(this.bloom);this.composer.addPass(this.output);}
  }
  resize(w:number,h:number){this.composer?.setPixelRatio(Math.min(this.renderer.getPixelRatio(),1));this.composer?.setSize(w,h);}
  simplify(){this.enabled=false;this.dispose();}
  render(galaxy=true){if(galaxy&&this.enabled&&this.composer)this.composer.render();else this.renderer.render(this.scene,this.camera);}
  dispose(){this.bloom?.dispose();this.output?.dispose();this.pass?.dispose();this.composer?.dispose();this.bloom=undefined;this.output=undefined;this.pass=undefined;this.composer=undefined;}
}

export function shockwave(){
  return new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({uniforms:{age:{value:0},strength:{value:1}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`${simplex}
uniform float age;uniform float strength;varying vec2 vUv;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float noise=snoise(vec3(p*9.,age*.6));
float edge=exp(-pow((r-.72-noise*.018)*62.,2.));float veil=exp(-pow((r-.69)*15.,2.))*(.4+.6*noise);
float arcs=.5+.5*sin(a*3.+age*2.);float core=exp(-r*r*28.)*max(0.,1.-age*4.);
float fade=max(0.,1.-age/1.9);vec3 c=mix(vec3(.32,.54,1.),vec3(.65,1.,1.),edge);
gl_FragColor=vec4(c,(edge*(.5+.5*arcs)+max(0.,veil)*.4+core)*fade*strength);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`}));
}
