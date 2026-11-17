// Una piccola tavolozza originale generata sul dispositivo con Web Audio.
// Nessun download, servizio esterno o riproduzione automatica prima di un gesto.
export function createSoundPlayer({contextFactory}={}) {
  let context=null,output=null,noiseBuffer=null,failed=false;
  const active=new Set();
  function unlock(){
    if(failed)return;
    try{
      if(!context){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!contextFactory&&!C)return;context=contextFactory?contextFactory():new C();output=context.createGain();output.gain.value=.65;output.connect(context.destination);}
      if((context.state==='suspended'||context.state==='interrupted')&&!context.startRendering){const promise=context.resume();promise?.catch?.(()=>{});}
    }catch{failed=true;}
  }
  function track(source,gain,extra=[]){
    active.add(source);
    source.onended=()=>{active.delete(source);try{source.disconnect();gain.disconnect();for(const node of extra)node.disconnect();}catch{}};
    if(active.size>24){const oldest=active.values().next().value;try{oldest.stop();}catch{}active.delete(oldest);}
  }
  function envelope(gain,start,duration,peak){
    const p=gain.gain;p.setValueAtTime(.0001,start);p.exponentialRampToValueAtTime(Math.max(.0002,peak),start+.008);p.exponentialRampToValueAtTime(.0001,start+duration);
  }
  function tone(start,duration,freq,endFreq,peak=.2,type='sine'){
    const osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,start);if(endFreq)osc.frequency.exponentialRampToValueAtTime(endFreq,start+duration);envelope(gain,start,duration,peak);osc.connect(gain);gain.connect(output);track(osc,gain);osc.start(start);osc.stop(start+duration+.02);
  }
  function noise(start,duration,frequency,peak=.18,kind='bandpass',endFrequency=null){
    if(!noiseBuffer){const rate=context.sampleRate;noiseBuffer=context.createBuffer(1,Math.ceil(rate*1.5),rate);const data=noiseBuffer.getChannelData(0);let x=0x19af72;for(let i=0;i<data.length;i++){x^=x<<13;x^=x>>>17;x^=x<<5;data[i]=(x>>>0)/2147483648-1;}}
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=noiseBuffer;filter.type=kind;filter.frequency.setValueAtTime(frequency,start);if(endFrequency)filter.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);filter.Q.value=.7;envelope(gain,start,duration,peak);source.connect(filter);filter.connect(gain);gain.connect(output);track(source,gain,[filter]);source.start(start);source.stop(start+duration+.02);
  }
  function play(event,delay=0){
    if(!context||failed)return;
    try{
      const t=context.currentTime+Math.max(0,delay)+.005;
      switch(event){
        case 'start': tone(t,.30,392,440,.17,'triangle');tone(t+.12,.35,523,587,.14,'sine');tone(t+.25,.50,659,784,.12,'sine');break;
        case 'end-success': tone(t,.28,523,587,.15,'triangle');tone(t+.14,.30,659,740,.14,'sine');tone(t+.28,.60,784,880,.13,'sine');break;
        case 'end': tone(t,.32,392,440,.14,'triangle');tone(t+.18,.48,523,587,.12,'sine');break;
        case 'fracture':
          noise(t,.40,1800,.26,'bandpass',3800);noise(t+.025,.18,4200,.17,'highpass',2100);
          for(const d of [0,.055,.12,.20,.29])noise(t+d,.045,2600+d*3000,.15,'highpass');break;
        case 'repair': noise(t,.15,3200,.10,'bandpass',5200);noise(t+.14,.13,3700,.09,'bandpass',5200);tone(t+.12,.40,740,880,.12,'sine');break;
        case 'card:ascolto': noise(t,.22,2100,.11,'bandpass',3200);tone(t+.07,.30,587,659,.12,'sine');break;
        case 'card:dialogo': tone(t,.22,523,560,.16,'triangle');tone(t+.14,.25,659,700,.14,'triangle');break;
        case 'card:protezione': tone(t,.24,220,150,.20,'triangle');tone(t+.04,.28,440,392,.11,'sine');break;
        case 'card:riparazione': noise(t,.11,3600,.14,'highpass');noise(t+.13,.13,2800,.12,'bandpass',4300);tone(t+.17,.25,880,988,.10,'sine');break;
        case 'card:riconoscimento': tone(t,.40,740,830,.15,'sine');tone(t+.08,.30,1110,1245,.06,'sine');break;
        case 'card:mediazione': tone(t,.36,440,494,.12,'sine');tone(t+.04,.36,554,622,.12,'sine');break;
        case 'card:responsabilita': tone(t,.14,294,220,.18,'triangle');tone(t+.14,.22,392,330,.15,'triangle');break;
        case 'card:comunita': tone(t,.28,392,440,.13,'triangle');tone(t+.09,.30,494,554,.11,'triangle');tone(t+.18,.35,587,659,.10,'sine');break;
      }
    }catch{/* L'audio non deve mai impedire di giocare. */}
  }
  function stop(){for(const source of active){try{source.stop();}catch{}}active.clear();}
  return {unlock,play,stop};
}
