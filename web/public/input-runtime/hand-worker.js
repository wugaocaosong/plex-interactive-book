// MediaPipe 0.10.32's WASM loader uses importScripts: keep it in a classic Worker.
self.exports={};
importScripts('/vendor/mediapipe/vision-bundle.js');
const {FilesetResolver,HandLandmarker}=self.exports;
let detector;
self.onmessage=async({data})=>{
 const {type,bitmap,time}=data;
 try{
  if(type==='init'){
   detector=await HandLandmarker.createFromOptions(await FilesetResolver.forVisionTasks('/vendor/mediapipe'),{
    baseOptions:{modelAssetPath:'/input-models/hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:2,
    minHandDetectionConfidence:.65,minHandPresenceConfidence:.65,minTrackingConfidence:.65,
   });self.postMessage({type:'ready'});
  }else if(type==='frame'&&detector){
   const result=detector.detectForVideo(bitmap,time);self.postMessage({type:'result',hands:result.landmarks,time});
  }
 }catch(error){self.postMessage({type:'error',error:String(error)});}
 finally{bitmap?.close();}
};
