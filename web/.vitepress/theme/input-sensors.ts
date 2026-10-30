import type {Model,KaldiRecognizer} from 'vosk-browser';
import type {HandPoint} from './reader-controls';
export interface SensorHandle { stop:()=>void; reset?:()=>void }
function abortError(){return new DOMException('已停止','AbortError');}
export async function startCamera(video:HTMLVideoElement,device:string,signal:AbortSignal,result:(hands:HandPoint[][],time:number)=>void,failed:(error:unknown)=>void):Promise<SensorHandle>{
 let stream:MediaStream|undefined,worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,watchdog:ReturnType<typeof setTimeout>|undefined;
 let stopped=false,inFlight=false;
 const stop=()=>{if(stopped)return;stopped=true;clearTimeout(timer);clearTimeout(watchdog);stream?.getTracks().forEach(t=>t.stop());worker?.terminate();video.srcObject=null;signal.removeEventListener('abort',stop);};
 signal.addEventListener('abort',stop,{once:true});
 try{
  if(signal.aborted)throw abortError();
  stream=await navigator.mediaDevices.getUserMedia({video:{deviceId:device?{exact:device}:undefined,width:{ideal:640},height:{ideal:480},frameRate:{ideal:20}},audio:false});
  if(stopped){stream.getTracks().forEach(t=>t.stop());throw abortError();}
  stream.getVideoTracks()[0].onended=()=>{stop();failed(Error('摄像头已断开，请重新选择设备'));};
  video.srcObject=stream;await video.play();
  if(stopped)throw abortError();
  worker=new Worker('/input-runtime/hand-worker.js');
  await new Promise<void>((resolve,reject)=>{
   const abort=()=>{clearTimeout(timeout);reject(abortError());};
   const timeout=setTimeout(()=>reject(Error('手势模型加载超时，请重试')),60000);
   signal.addEventListener('abort',abort,{once:true});
   const finish=()=>{clearTimeout(timeout);signal.removeEventListener('abort',abort);};
   worker!.onerror=e=>{finish();reject(Error(e.message));};
   worker!.onmessage=e=>{if(e.data.type==='ready'){finish();resolve();}else if(e.data.type==='error'){finish();reject(Error(e.data.error));}};
   worker!.postMessage({type:'init'});
  });
  if(stopped)throw abortError();
  worker.onmessage=e=>{inFlight=false;clearTimeout(watchdog);if(stopped)return;if(e.data.type==='error'){stop();failed(Error(e.data.error));}else result(e.data.hands,e.data.time);};
  worker.onerror=e=>{stop();failed(Error(e.message));};
  async function frame(){
   if(stopped)return;
   if(!inFlight&&video.readyState>=2){
    inFlight=true;
    try{const bitmap=await createImageBitmap(video);if(stopped){bitmap.close();return;}worker!.postMessage({type:'frame',bitmap,time:performance.now()},[bitmap]);
     watchdog=setTimeout(()=>{stop();failed(Error('手势识别无响应，请重试'));},10000);
    }catch(error){stop();failed(error);return;}
   }timer=setTimeout(frame,66);
  }
  void frame();return{stop};
 }catch(error){stop();throw error;}
}
export async function startVoice(device:string,signal:AbortSignal,onText:(text:string,final:boolean,id:number)=>void,onLevel:(level:number)=>void,failed:(error:unknown)=>void):Promise<SensorHandle>{
 let model:Model|undefined,recognizer:KaldiRecognizer|undefined,stream:MediaStream|undefined,context:AudioContext|undefined,node:AudioWorkletNode|undefined;
 let stopped=false,sequence=0,generation=0;
 const stop=()=>{if(stopped)return;stopped=true;generation++;node?.disconnect();stream?.getTracks().forEach(t=>t.stop());recognizer?.remove();if(model){if(model.ready)model.terminate();/* vosk-browser 0.0.8 cannot gracefully terminate before load completes. */(model as unknown as {worker:Worker}).worker.terminate();}void context?.close().catch(()=>{});signal.removeEventListener('abort',stop);};
 signal.addEventListener('abort',stop,{once:true});
 try{
  if(signal.aborted)throw abortError();
  // Resume audio during the initiating user gesture, before model download.
  context=new AudioContext();await context.resume();
  stream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:device?{exact:device}:undefined,channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
  if(stopped){stream.getTracks().forEach(t=>t.stop());throw abortError();}
  stream.getAudioTracks()[0].onended=()=>{stop();failed(Error('麦克风已断开，请重新选择设备'));};
  const {Model}=await import('vosk-browser');if(stopped)throw abortError();
  model=new Model(location.origin+'/input-models/vosk-model-small-cn-0.22.tar.gz',-1);
  await new Promise<void>((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('中文语音模型加载超时，请重试')),90000);
   const abort=()=>{clearTimeout(timeout);reject(abortError());};signal.addEventListener('abort',abort,{once:true});
   const finish=()=>{clearTimeout(timeout);signal.removeEventListener('abort',abort);};
   model!.on('load',e=>{finish();if('result'in e&&e.result)resolve();else reject(Error('中文模型无法加载'));});
   model!.on('error',e=>{finish();reject(Error(('error'in e&&e.error)||'语音模型加载或本机缓存失败，请重试'));});
  });
  if(stopped)throw abortError();
  const reset=()=>{
   recognizer?.remove();const own=++generation;recognizer=new model!.KaldiRecognizer(16000);
   recognizer.on('result',e=>{if(!stopped&&own===generation&&e.event==='result')onText(e.result.text,true,++sequence);});
   recognizer.on('partialresult',e=>{if(!stopped&&own===generation&&e.event==='partialresult')onText(e.result.partial,false,sequence);});
   recognizer.on('error',e=>{if(!stopped&&own===generation){stop();failed(Error('error'in e?e.error:'语音识别失败'));}});
  };reset();
  await context.audioWorklet.addModule('/input-runtime/voice-capture.js');if(stopped)throw abortError();
  node=new AudioWorkletNode(context,'plex-voice-capture');
  node.port.onmessage=e=>{if(stopped)return;onLevel(e.data.level);recognizer?.acceptWaveformFloat(e.data.samples,16000);};
  const source=context.createMediaStreamSource(stream);source.connect(node);node.connect(context.destination);
  return{stop,reset};
 }catch(error){stop();throw error;}
}
