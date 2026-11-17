// Eventi sonori separati dal motore: nessuna modifica alle regole o ai punteggi.
export function createSoundEvents(play, now=()=>performance.now()) {
  let seen=new Map(), lastTear=-Infinity, ended=false;
  function reset(){seen=new Map();lastTear=-Infinity;ended=false;}
  function observe(state,delay=0){
    let fresh=false,completed=false;
    for(const f of state.fractures){
      const old=seen.get(f.id);
      if(old===undefined && f.status==='active')fresh=true;
      if(old!==undefined && old!=='repaired' && f.status==='repaired')completed=true;
      seen.set(f.id,f.status);
    }
    const time=now();
    if(fresh&&time-lastTear>=1200){lastTear=time;play('fracture',delay);}
    if(completed)play('repair');
  }
  return {
    reset,
    begin(state,{tutorial=false}={}){reset();if(tutorial){for(const f of state.fractures)seen.set(f.id,f.status);return;}play('start');observe(state,.55);},
    showTutorialFracture(){const time=now();if(time-lastTear>=1200){lastTear=time;play('fracture');}},
    observe,
    deployed(cardId,result){if(result?.ok)play(`card:${cardId}`);},
    end(result){if(!ended){ended=true;play(result?.passed?'end-success':'end');}},
  };
}
