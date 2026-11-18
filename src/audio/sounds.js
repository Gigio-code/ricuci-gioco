// Suoni originali: piccoli gesti materici e corde pizzicate, creati sul dispositivo.
// L'audio parte solo dopo un gesto del giocatore e non ostacola mai la partita.
export function createSoundPlayer({contextFactory}={}) {
  let context=null,output=null,failed=false,seed=0x29ab41;
  const active=new Set(),buffers=new Map();
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
  const cards = ['ascolto','riconoscimento','dialogo','protezione','responsabilita','mediazione','riparazione','comunita'];
  const recordings = new Map();
  let generation = 0;

  function loadCard(card) {
    if (recordings.has(card)) return recordings.get(card);
    const url = new URL('../../assets/audio/' + card + '.wav?v=0.13', import.meta.url);
    const recording = fetch(url)
      .then(response => {
        if (!response.ok) throw new Error('Audio ' + response.status);
        return response.arrayBuffer();
      })
      .then(bytes => context.decodeAudioData(bytes))
      .catch(() => {
        recordings.delete(card);
        return null;
      });
    recordings.set(card, recording);
    return recording;
  }

  async function playCard(card, delay) {
    if (!cards.includes(card)) return;
    const current = generation;
    const buffer = await loadCard(card);
    if (!buffer || current !== generation) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(output);
    active.add(source);
    source.onended = () => { active.delete(source); source.disconnect(); };
    source.start(context.currentTime + delay);
  }

  function unlock(){
    if(failed)return;
    try{
      if(!context){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!contextFactory&&!C)return;context=contextFactory?contextFactory():new C();output=context.createGain();output.gain.value=.65;output.connect(context.destination);cards.forEach(loadCard);}
      if((context.state==='suspended'||context.state==='interrupted')&&!context.startRendering)context.resume()?.catch?.(()=>{});
    }catch{failed=true;}
  }
  // Modello di corda smorzata: un colpo di rumore circola e perde energia,
  // producendo un timbro pizzicato con attacco e decadimento naturali.
  function stringBuffer(freq){
    const key=Math.round(freq);if(buffers.has(key))return buffers.get(key);
    const rate=context.sampleRate,length=Math.ceil(rate*.65),period=Math.max(2,Math.round(rate/freq));
    const b=context.createBuffer(1,length,rate),data=b.getChannelData(0),ring=new Float32Array(period);
    for(let i=0;i<period;i++)ring[i]=random()*.8;
    let last=0;
    for(let i=0;i<length;i++){const j=i%period,v=ring[j];last=.5*(v+last)*.994;ring[j]=last;data[i]=v*.72*Math.exp(-i/(rate*.22));}
    buffers.set(key,b);return b;
  }
  function textureBuffer(){
    if(buffers.has('texture'))return buffers.get('texture');
    const rate=context.sampleRate,b=context.createBuffer(1,rate,rate),data=b.getChannelData(0);let previous=0;
    for(let i=0;i<data.length;i++){const n=random();previous=.72*previous+.28*n;data[i]=previous;}
    buffers.set('texture',b);return b;
  }
  function sample(buffer,t,duration,volume,rate=1,filterFrequency=0){
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.playbackRate.value=rate;
    gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(volume,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    let filter=null;if(filterFrequency){filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=filterFrequency;source.connect(filter);filter.connect(gain);}else source.connect(gain);
    gain.connect(output);active.add(source);source.onended=()=>{active.delete(source);source.disconnect();gain.disconnect();filter?.disconnect();};
    if(active.size>24){const oldest=active.values().next().value;try{oldest.stop();}catch{}active.delete(oldest);}
    source.start(t);source.stop(t+duration+.01);
  }
  function pluck(t,freq,volume=.20){sample(stringBuffer(freq),t,.48,volume*2);}
  function rub(t,duration=.12,volume=.12,rate=1){sample(textureBuffer(),t,duration,volume,rate,3200);}
  function play(event,delay=0){
    if(!context||failed)return;
    try{const t=context.currentTime+Math.max(0,delay)+.005;
      if (event.startsWith('card:')) return playCard(event.slice(5), Math.max(0, delay));
      switch(event){
        case 'start': rub(t,.12,.09);pluck(t+.06,294,.18);pluck(t+.18,392,.16);pluck(t+.30,494,.15);break;
        case 'end-success': pluck(t,392,.17);pluck(t+.14,494,.16);pluck(t+.28,587,.17);rub(t+.3,.16,.05);break;
        case 'end': pluck(t,330,.16);pluck(t+.17,392,.15);break;
        case 'fracture': rub(t,.30,.30,.85);for(const d of [0,.055,.12,.19])rub(t+d,.045,.14,1.2+d);break;
        case 'repair': rub(t,.13,.12,1.3);rub(t+.13,.15,.10,1.1);pluck(t+.18,523,.12);break;
      }
    }catch{/* Il gioco resta utilizzabile anche se il dispositivo non supporta l'audio. */}
  }
  function stop(){generation++;for(const source of active){try{source.stop();}catch{}}active.clear();}
  return {unlock,play,stop};
}
