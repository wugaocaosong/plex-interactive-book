<script setup lang="ts">
import {onBeforeUnmount,shallowRef} from 'vue';
import {useLoop} from '@tresjs/core';
import {BufferGeometry,Float32BufferAttribute,Points,PointsMaterial,Group,Mesh,SphereGeometry,MeshStandardMaterial,PerspectiveCamera,AdditiveBlending,CanvasTexture} from 'three';
const props=defineProps<{zoom:boolean;active:boolean}>();
const group=new Group(),camera=shallowRef(new PerspectiveCamera(45,1,.1,100));camera.value.position.set(0,7,18);camera.value.lookAt(0,0,0);
const coords:number[]=[];let seed=2412;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const budget=innerWidth<700?1400:4200;
for(let i=0;i<budget;i++){const r=.5+rand()*16,a=i%4*Math.PI/2+r*.65+(rand()-.5)*.55;coords.push(Math.cos(a)*r,(rand()-.5)*(.3+r*.025),Math.sin(a)*r);}
const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(coords,3));
const dot=document.createElement('canvas');dot.width=32;dot.height=32;const ctx=dot.getContext('2d')!;const gradient=ctx.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'white');gradient.addColorStop(.2,'#d5f0ffdd');gradient.addColorStop(1,'#b5d9ff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);const texture=new CanvasTexture(dot);
const material=new PointsMaterial({map:texture,size:.12,color:'#a2c8dc',transparent:true,opacity:.85,blending:AdditiveBlending,depthWrite:false});group.add(new Points(geometry,material));
const sphere=new SphereGeometry(1.15,32,24),skin=new MeshStandardMaterial({color:'#397e8c',metalness:.25,roughness:.7,transparent:true,opacity:0});const planet=new Mesh(sphere,skin);planet.position.set(0,.7,0);group.add(planet);
const {onBeforeRender}=useLoop();onBeforeRender(({delta})=>{if(!props.active)return;planet.visible=props.zoom;skin.opacity=props.zoom?Math.max(0,skin.opacity-delta*.8):.8;group.rotation.y+=Math.min(delta,.05)*.025;planet.rotation.y+=delta*.08;const z=props.zoom?5:18;camera.value.position.z+=(z-camera.value.position.z)*Math.min(1,delta*4);camera.value.position.y+=((props.zoom?2:7)-camera.value.position.y)*Math.min(1,delta*4);camera.value.lookAt(0,.5,0);});
onBeforeUnmount(()=>{geometry.dispose();material.dispose();texture.dispose();sphere.dispose();skin.dispose();});
</script>
<template><primitive :object="camera"/><TresAmbientLight :intensity="1.2"/><TresDirectionalLight :position="[4,7,6]" :intensity="3"/><primitive :object="group"/></template>
