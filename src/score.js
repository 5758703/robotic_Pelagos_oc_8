// Shared sound palette: original procedural audio, no external samples.
export const SOUND={pads:[73.416,146.832,174.614,220,261.626],padGain:.013,clickGain:.032,popGain:.055};
export const jetGain=s=>.055*s.valve**1.4*Math.sqrt(s.flowGain);
export function createAudioEngine(){
 const ctx=new AudioContext(),master=ctx.createGain();master.gain.value=.65;master.connect(ctx.destination);
 const pad=ctx.createGain();pad.gain.value=SOUND.padGain;pad.connect(master);
 const sources=[];
 SOUND.pads.forEach((hz,i)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type='sine';oscillator.frequency.value=hz;oscillator.detune.value=i%2?3:-3;gain.gain.value=.7;oscillator.connect(gain).connect(pad);oscillator.start();sources.push(oscillator);});
 const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=noise.getChannelData(0);let seed=731;
 for(let i=0;i<data.length;i++){seed=(1664525*seed+1013904223)>>>0;data[i]=seed/2147483648-1;}
 const source=ctx.createBufferSource();source.buffer=noise;source.loop=true;
 const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=420;
 const jet=ctx.createGain();jet.gain.value=0;source.connect(filter).connect(jet).connect(master);source.start();sources.push(source);
 let enabled=false;
 return {
  async enable(value){enabled=value;if(value)await ctx.resume();master.gain.setTargetAtTime(value?.65:0,ctx.currentTime,.05);},
  update(s,playing){jet.gain.setTargetAtTime(enabled&&playing?jetGain(s):0,ctx.currentTime,.025);filter.frequency.setTargetAtTime(240+80*s.flowGain,ctx.currentTime,.05);},
  cue(kind){if(!enabled)return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();const pop=kind==='separation',duration=pop?.18:.045;o.type='sine';o.frequency.setValueAtTime(pop?320:1450,t);o.frequency.exponentialRampToValueAtTime(pop?90:700,t+duration);g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(pop?SOUND.popGain:SOUND.clickGain,t+.003);g.gain.exponentialRampToValueAtTime(.00001,t+duration);o.connect(g).connect(master);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};},
  async dispose(){sources.forEach(s=>s.stop());await ctx.close();}
 };
}

// Offline stereo score. Exactly the recorded visual states/cues are used.
export function synthesizeScore(timeline,sampleRate=48000){
 const duration=timeline.duration,n=Math.round(duration*sampleRate),left=new Float32Array(n),right=new Float32Array(n);
 let seed=731,low=0,frame=0;
 for(let i=0;i<n;i++){
  const t=i/sampleRate;while(frame<timeline.frames.length-2&&timeline.frames[frame+1].time<=t)frame++;
  const a=timeline.frames[frame],b=timeline.frames[Math.min(frame+1,timeline.frames.length-1)],f=Math.min(1,(t-a.time)/(b.time-a.time||1));
  const valve=a.valve+(b.valve-a.valve)*f,flowGain=a.flowGain+(b.flowGain-a.flowGain)*f;
  seed=(1664525*seed+1013904223)>>>0;const white=seed/2147483648-1;low+=.045*(white-low);
  const whoosh=low*jetGain({valve,flowGain})*2.6;
  let l=0,r=0;
  SOUND.pads.forEach((hz,k)=>{const swell=.7+.3*Math.sin(2*Math.PI*(.035+k*.007)*t+k);l+=Math.sin(2*Math.PI*hz*t+.14*Math.sin(t*.29+k))*swell*SOUND.padGain;r+=Math.sin(2*Math.PI*hz*1.0007*t+.14*Math.sin(t*.31+k+.7))*swell*SOUND.padGain;});
  const fade=Math.min(1,t/1.8,(duration-t)/2);left[i]=(l+whoosh)*Math.max(0,fade);right[i]=(r+whoosh*.95)*Math.max(0,fade);
 }
 for(const cue of timeline.cues){
  const pop=cue.kind==='separation',len=Math.round((pop?.18:.045)*sampleRate),start=Math.round(cue.time*sampleRate);let phase=0;
  for(let j=0;j<len&&start+j<n;j++){const t=j/sampleRate,u=j/len,freq=pop?320*Math.exp(-1.27*u):1450*Math.exp(-.72*u);phase+=2*Math.PI*freq/sampleRate;const env=Math.min(1,t/.003)*Math.exp(-u*9),v=Math.sin(phase)*env*(pop?SOUND.popGain:SOUND.clickGain);left[start+j]+=v;right[start+j]+=v*.92;}
 }
 // Gentle stereo room tail; fixed delays make every export reproducible.
 const dl=Math.round(.237*sampleRate),dr=Math.round(.311*sampleRate);
 for(let i=0;i<n;i++){if(i>=dl)left[i]+=.16*left[i-dl];if(i>=dr)right[i]+=.16*right[i-dr];}
 for(let i=Math.max(0,n-sampleRate);i<n;i++){const fade=(n-i)/sampleRate;left[i]*=fade;right[i]*=fade;}
 return {left,right,sampleRate};
}
