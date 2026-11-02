import * as T from 'three';
import {galaxyFragment} from './vendor/galaxy-explorer/paint';

export function random(seed=2412){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}

/** Clustered arm distribution adapted from Galaxy Explorer buildDust (MIT).
 * Scaled to 18 world units, deterministic random source, PLEX cyan/violet palette. */
export function galaxyDust(count:number){
 const rand=random(),tau=Math.PI*2,R=18,coords:number[]=[],colors:number[]=[],sizes:number[]=[];
 const grand=()=>rand()+rand()+rand()-1.5;
 const arm=(r:number)=>{const i=rand()<.7?Math.floor(rand()*2)*2:Math.floor(rand()*2)*2+1;return {major:i%2===0,angle:i*tau/4+r*.85*tau+(rand()-.5)*.5};};
 const clusters=Array.from({length:Math.max(20,Math.round(count/200))},()=>{const r=rand()**.72,a=arm(r),d=r*R+(rand()-.5)*2.3;return {x:Math.cos(a.angle)*d,y:Math.sin(a.angle)*d,r,major:a.major,size:.3+rand()*rand()*1.8};});
 const inner=new T.Color('#ffceac'),outer=new T.Color('#65bcd8'),color=new T.Color();
 for(let i=0;i<count;i++){
  let r:number,major:boolean;
  if(rand()<.8){const c=clusters[Math.floor(rand()*clusters.length)];r=c.r;major=c.major;coords.push(c.x+grand()*c.size,c.y+grand()*c.size,grand()*1.2*((1-r)+.2)*.45);}
  else{r=rand()**.72;const a=arm(r),d=r*R+(rand()-.5)*2.3;major=a.major;coords.push(Math.cos(a.angle)*d,Math.sin(a.angle)*d,(rand()-.5)*1.2*((1-r)+.2));}
  color.copy(inner).lerp(outer,T.MathUtils.clamp((r-.12)*3,0,1));if(rand()<.2)color.set('#a276d6');color.multiplyScalar(major?.8:.4);colors.push(color.r,color.g,color.b);sizes.push(.35+rand()*1.4);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(coords,3));geometry.setAttribute('aColor',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('aScale',new T.Float32BufferAttribute(sizes,1));
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexShader:`attribute vec3 aColor;attribute float aScale;varying vec3 tint;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(aScale*45./max(1.,-p.z),1.,7.);tint=aColor;}`,fragmentShader:`varying vec3 tint;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float glow=exp(-d*d*5.);gl_FragColor=vec4(tint,glow);}`});
 return new T.Points(geometry,material);
}

export function paintedGalaxy(renderer:T.WebGLRenderer,mobile:boolean){
 const size=mobile?512:1024,target=new T.WebGLRenderTarget(size,size,{depthBuffer:false});
 const material=new T.ShaderMaterial({uniforms:{uR:{value:360},uArms:{value:4},uTight:{value:.85},uBright:{value:1.1},uInter:{value:.14},uLane:{value:.95},uHii:{value:.6}},vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:galaxyFragment});
 const geometry=new T.PlaneGeometry(900,900),scene=new T.Scene(),camera=new T.OrthographicCamera(-450,450,450,-450,.1,10);camera.position.z=1;scene.add(new T.Mesh(geometry,material));
 renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);geometry.dispose();material.dispose();
 const plane=new T.Mesh(new T.PlaneGeometry(45,45),new T.MeshBasicMaterial({map:target.texture,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,opacity:.85}));
 return {plane,target};
}

export function planetMaterial(color:string,seed:number){
 return new T.ShaderMaterial({uniforms:{tint:{value:new T.Color(color)},seed:{value:seed}},vertexShader:`varying vec3 p;varying vec3 n;varying vec3 v;void main(){p=position;n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform vec3 tint;uniform float seed;varying vec3 p;varying vec3 n;varying vec3 v;
 float hash(vec3 q){return fract(sin(dot(q,vec3(127.1,311.7,74.7)))*43758.5453);}
 float noise(vec3 q){vec3 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float fbm(vec3 q){float a=.5,r=0.;for(int i=0;i<5;i++){r+=a*noise(q);q=q*2.03+1.7;a*=.5;}return r;}
 void main(){vec3 q=normalize(p);float terrain=fbm(q*5.+seed);float light=max(0.,dot(normalize(n),normalize(vec3(-.6,.7,.8))));light=floor(light*5.)/5.;vec3 sea=tint*.55;vec3 land=mix(tint*.7,vec3(.71,.76,.66),smoothstep(.46,.64,terrain));vec3 c=mix(sea,land,smoothstep(.48,.51,terrain));float cloud=smoothstep(.62,.72,fbm(q*8.+seed+22.));c=mix(c,vec3(.87,.93,.92),cloud*.85);float rim=pow(1.-max(0.,dot(normalize(n),normalize(v))),3.);c=c*(.12+light*.98)+rim*tint*.75;gl_FragColor=vec4(c,1.);}`});
}

export function canvasTexture(draw:(ctx:CanvasRenderingContext2D)=>void,w=512,h=512){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d')!);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;}

export function makeBook(){
 const root=new T.Group(),hinge=new T.Group();const textures:T.Texture[]=[];
 const paper=canvasTexture(c=>{c.fillStyle='#f3e7cf';c.fillRect(0,0,512,512);for(let y=0;y<512;y+=3){c.fillStyle=y%9===0?'#b6a78c':'#dacdb5';c.fillRect(0,y,512,1);}});textures.push(paper);
 const edge=new T.MeshStandardMaterial({map:paper,roughness:.9}),black=new T.MeshStandardMaterial({color:'#11151a',roughness:.83});
 const pages=new T.Mesh(new T.BoxGeometry(3.05,4.64,.38),edge);root.add(pages);
 const backTexture=canvasTexture(c=>{c.fillStyle='#101518';c.fillRect(0,0,512,768);c.fillStyle='#e9daba';c.textAlign='center';c.font='26px serif';c.fillText('PLEX',256,150);c.font='38px serif';c.fillText('星轨编程',256,290);c.font='19px sans-serif';c.fillText('从一个问题出发',256,430);c.fillText('用代码验证想法',256,475);c.strokeStyle='#529eab';c.beginPath();c.ellipse(256,560,150,40,-.4,0,Math.PI*2);c.stroke();},512,768);textures.push(backTexture);
 const back=new T.Mesh(new T.BoxGeometry(3.2,4.8,.07),[black,black,black,black,black,new T.MeshStandardMaterial({map:backTexture,roughness:.8})]);back.position.z=-.24;root.add(back);
 const spineTex=canvasTexture(c=>{c.fillStyle='#122229';c.fillRect(0,0,128,768);c.fillStyle='#e9daba';c.textAlign='center';c.font='24px serif';c.fillText('PLEX',64,90);c.font='36px serif';[...'星轨编程'].forEach((t,i)=>c.fillText(t,64,240+i*70));},128,768);textures.push(spineTex);
 const spine=new T.Mesh(new T.BoxGeometry(.09,4.8,.55),[black,new T.MeshStandardMaterial({map:spineTex}),black,black,black,black]);spine.position.x=-1.57;root.add(spine);
 const frontMaterial=new T.MeshStandardMaterial({color:'#ffffff',roughness:.72});
 const front=new T.Mesh(new T.BoxGeometry(3.2,4.8,.075),[black,black,black,black,frontMaterial,black]);front.name='front-cover';front.position.x=1.6;hinge.position.set(-1.6,0,.24);hinge.add(front);root.add(hinge);
 const titleTex=canvasTexture(c=>{c.fillStyle='#f3e7cf';c.fillRect(0,0,512,768);c.fillStyle='#26323a';c.textAlign='center';c.font='26px serif';c.fillText('PLEX',256,190);c.font='48px serif';c.fillText('星轨编程',256,320);c.font='19px sans-serif';c.fillText('Python 与算法的探索之旅',256,390);},512,768);textures.push(titleTex);
 const title=new T.Mesh(new T.PlaneGeometry(3.03,4.62),new T.MeshStandardMaterial({map:titleTex,roughness:.9}));title.position.z=.196;root.add(title);
 root.rotation.set(.1,-.36,-.04);
 return {root,hinge,frontMaterial,textures};
}
