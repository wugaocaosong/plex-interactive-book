import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const audio=readFileSync('tests/fixtures/input/next-page.wav').toString('base64');
const hand=readFileSync('tests/fixtures/input/right_hands.jpg').toString('base64');
async function setup(page:any){
 page.on('console',(m:any)=>{if(m.type()==='error')console.log('Browser error:',m.text().slice(0,500));});
 const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
 const external:string[]=[];await page.route('**/*',(route:any)=>{const url=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(url.hostname)){external.push(url.href);return route.abort();}return route.continue();});
 await page.goto('/read/chapter_divide_and_conquer/index');await page.getByRole('button',{name:'更多阅读工具'}).click();await page.getByRole('button',{name:'翻页控制',exact:true}).click();return {external,errors};
}
test('real offline Chinese model recognizes synthesized command and releases stream',async({page})=>{
 test.setTimeout(180000);
 await page.addInitScript(audio=>{
  const state:any={tracks:[]};(window as any).__sensorFixture=state;
  navigator.mediaDevices.getUserMedia=async()=>{
   const ctx=new AudioContext();await ctx.resume();const bytes=Uint8Array.from(atob(audio),c=>c.charCodeAt(0));const buffer=await ctx.decodeAudioData(bytes.buffer);
   const padded=ctx.createBuffer(1,ctx.sampleRate*5,ctx.sampleRate);padded.copyToChannel(buffer.getChannelData(0),0,ctx.sampleRate);
   const source=ctx.createBufferSource();source.buffer=padded;source.loop=true;const destination=ctx.createMediaStreamDestination();source.connect(destination);source.start();
   state.tracks=destination.stream.getTracks();state.cleanup=()=>{source.stop();void ctx.close();};return destination.stream;
  };
 },audio);
 const {external,errors}=await setup(page);await page.getByRole('button',{name:'开启离线语音',exact:true}).click();
 await expect(page.locator('.sensor-status')).toContainText('离线聆听中',{timeout:120000});
 await expect(page.locator('.sensor-status')).toContainText(/下\s*一\s*页/,{timeout:45000});
 await page.keyboard.press('Escape');await page.locator('#reading-content').focus();
 await expect(page.locator('.input-turn-notice')).toHaveText('下一页',{timeout:30000});
 await page.getByRole('button',{name:'停止聆听',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__sensorFixture.tracks.every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
 await page.evaluate(()=>(window as any).__sensorFixture.cleanup());expect(external).toEqual([]);expect(errors).toEqual([]);
});
test('real hand model processes local camera fixture frames in worker',async({page})=>{
 test.setTimeout(120000);
 await page.addInitScript(hand=>{
  const state:any={tracks:[]};(window as any).__sensorFixture=state;
  navigator.mediaDevices.getUserMedia=async()=>{
   const image=new Image();image.src='data:image/jpeg;base64,'+hand;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   const ctx=canvas.getContext('2d')!;let step=0;const draw=()=>{
    ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
    if(state.mode==='swipe'){
     if(canvas.width!==1280){canvas.width=1280;canvas.height=720;step=0;}
     const phase=step++%65,shift=phase<12?0:phase<22?(phase-12)*40:400;
     ctx.drawImage(image,360,0,360,382,380+shift,120,360,382);
    }else ctx.drawImage(image,Math.sin(step++/20)*15,0);
   };draw();
   const timer=setInterval(draw,66);const stream=canvas.captureStream(15);state.tracks=stream.getTracks();state.cleanup=()=>clearInterval(timer);return stream;
  };
 },hand);
 const {external,errors}=await setup(page);await page.getByRole('button',{name:'开启摄像头',exact:true}).click();
 await expect(page.locator('.sensor-status')).toContainText(/已识别张掌|已识别手，请张开手掌|检测到多只手/,{timeout:90000});
 await expect(page.locator('.sensor-status [role=alert]')).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(page.locator('#reader-sensor-dock .camera-preview')).toBeVisible();
 await page.evaluate(()=>(window as any).__sensorFixture.mode='swipe');
 await expect(page.locator('.input-turn-notice')).toHaveText('下一页',{timeout:30000});
 await page.evaluate(()=>{Object.defineProperty(document,'hasFocus',{configurable:true,value:()=>false});window.dispatchEvent(new Event('blur'));});expect(await page.evaluate(()=>(window as any).__sensorFixture.tracks.every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
 await page.evaluate(()=>(window as any).__sensorFixture.cleanup());expect(external).toEqual([]);expect(errors).toEqual([]);
});
test('cancelling voice during model load releases its worker and microphone',async({page})=>{
 await page.addInitScript(()=>{
  const state:any={workers:new Set(),tracks:[]};(window as any).__sensorFixture=state;
  const NativeWorker=window.Worker;
  window.Worker=class extends NativeWorker{constructor(url:any,options?:any){super(url,options);state.workers.add(this);}terminate(){state.workers.delete(this);super.terminate();}};
  navigator.mediaDevices.getUserMedia=async()=>{const ctx=new AudioContext();const stream=ctx.createMediaStreamDestination().stream;state.tracks=stream.getTracks();state.cleanup=()=>ctx.close();return stream;};
 });
 const {errors}=await setup(page);let held:any;let release:()=>void=()=>{};
 await page.route('**/input-models/vosk-model-small-cn-0.22.tar.gz',route=>{held=route;return new Promise<void>(resolve=>release=resolve);});
 await page.getByRole('button',{name:'开启离线语音',exact:true}).click();await expect.poll(()=>!!held).toBe(true);
 await page.getByRole('button',{name:'关闭语音',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__sensorFixture.workers.size)).toBe(0);
 expect(await page.evaluate(()=>(window as any).__sensorFixture.tracks.every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
 await held.abort().catch(()=>{});release();await page.evaluate(()=>(window as any).__sensorFixture.cleanup());expect(errors).toEqual([]);
});
