// Streaming linear resampling retains phase across render quanta. Output is silent.
class VoiceCapture extends AudioWorkletProcessor {
 constructor(){super();this.pending=[];this.phase=0;this.chunk=[];this.energy=0;}
 process(inputs){
  const channels=inputs[0];if(!channels?.length)return true;
  for(let i=0;i<channels[0].length;i++){
   let sample=0;for(const channel of channels)sample+=channel[i]/channels.length;
   this.pending.push(sample);
  }
  const step=sampleRate/16000;
  while(this.phase+1<this.pending.length){
   const i=Math.floor(this.phase),f=this.phase-i;
   const sample=this.pending[i]*(1-f)+this.pending[i+1]*f;
   this.chunk.push(sample);this.energy+=sample*sample;this.phase+=step;
   if(this.chunk.length===1600){const samples=Float32Array.from(this.chunk);this.port.postMessage({samples,level:Math.sqrt(this.energy/1600)},[samples.buffer]);this.chunk=[];this.energy=0;}
  }
  const consumed=Math.min(Math.floor(this.phase),this.pending.length);this.pending.splice(0,consumed);this.phase-=consumed;return true;
 }
}
registerProcessor('plex-voice-capture',VoiceCapture);
