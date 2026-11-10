import { LEVELS, defaultDeckFor, orderedLevels, nextLevelFor } from '../config.js';
import { AGENTS, DEFAULT_DECK } from '../catalog/agents.js';
import { CONFLICTS } from '../catalog/conflicts.js';
import { AGENT_ORDER, EFFICACY } from '../catalog/efficacy.js';
import { effectDescription, interventionFactor } from '../engine/consequences.js';
import { calculateResults } from '../engine/results.js';
import { icon } from './icons.js';
import { fractureIcon } from '../rendering/fracture-styles.js';
const $ = id => document.getElementById(id);
const energyLabel = value => (Math.floor((value + 1e-8) * 10) / 10).toFixed(1);
const canAfford = (state, id) => state.energy + 1e-8 >= AGENTS[id].cost;
export function timeLabel(seconds) { const t=Math.max(0,Math.ceil(seconds-1e-7));return `${Math.floor(t/60).toString().padStart(2,'0')}:${(t%60).toString().padStart(2,'0')}`; }
export class Interface {
  constructor() {
    this.progress={unlocked:1,medals:{},best:{}};this.persistent=true;this.deck=[...DEFAULT_DECK];this.draft=[...this.deck];this.selectedCard=null;this.selectedAgent=null;this.focusedFracture=null;this.gateFeedback=null;this.awaitingEnergyCard=null;this.handSignature='';this.resultShown=false;this.messageUntil=0;this.fractureRows=new Map();this.agentRows=new Map();
    $('gate-select').innerHTML=[['n0-0','Nord'],['n0-3','Est'],['n0-6','Sud'],['n0-9','Ovest']].map(([id,name])=>`<option value="${id}">${name}</option>`).join('');
    $('agent-guide').innerHTML=Object.values(AGENTS).map(a=>`<div style="color:${a.color}">${icon(a.icon)}<p><b>${a.name} · ${a.cost} energia</b>${a.description}</p></div>`).join('');
    $('efficacy-table').innerHTML=`<thead><tr><th>Frattura</th>${AGENT_ORDER.map(id=>`<th>${AGENTS[id].name}</th>`).join('')}</tr></thead><tbody>${Object.values(CONFLICTS).map(f=>`<tr><td>${f.name}</td>${AGENT_ORDER.map(id=>`<td>${EFFICACY[f.id][id]}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }
  setProgress(progress,persistent=true){
    this.progress=progress;this.persistent=persistent;
    const select=$('level-select'),previous=Number(select.value)||1;
    select.innerHTML=Object.values(LEVELS).map(level=>`<option value="${level.id}" ${level.id>progress.unlocked?'disabled':''}>${level.name}${level.id>progress.unlocked?' · bloccata':''}</option>`).join('');
    select.value=String(Math.min(previous,progress.unlocked));
    $('medal-summary').textContent=`${Object.keys(progress.medals).length} / ${orderedLevels().length} conseguiti`;
    $('storage-status').hidden=persistent;
  }
  deckFor(level){ const f=LEVELS[level];return f.agents.length>f.deckSize && this.deck.length===f.deckSize && this.deck.every(id=>f.agents.includes(id))?[...this.deck]:defaultDeckFor(level); }
  showMedals(){
    const rows=Object.values(LEVELS).map(level=>{
      const earned=!!this.progress.medals[level.id], next=nextLevelFor(level.id);
      const introduced=next?next.agents.filter(id=>!level.agents.includes(id)):[];
      const cards=introduced.length?introduced.map(id=>AGENTS[id].name).join(', '):'Nessuna nuova carta.';
      return `<div class="medal-item ${earned?'':'medal-locked'}"><span class="medal-symbol">${earned?'🏅':'○'}</span><div><h3>${level.name}${earned?' · riconoscimento ottenuto':' · da conseguire'}</h3>${next?`<p>Energia massima ${earned?'sbloccata':'prevista'} ${next.energyMax} · ricarica 1 ogni ${String(next.secondsPerPoint).replace('.',',')} s.</p><p>Nuove carte ${earned?'sbloccate':'previste'}: ${cards}</p>`:'<p>Il percorso sarà ampliato con nuove formazioni.</p>'}${earned?`<p>Miglior lavoro: ${energyLabel(this.progress.best[level.id])}%</p>`:''}</div></div>`;
    });
    $('medal-content').innerHTML=`<div class="medal-list">${rows.join('')}</div>`;$('medal-dialog').showModal();
  }
  clearSelection(){this.selectedCard=null;this.selectedAgent=null;this.awaitingEnergyCard=null;this.messageUntil=0;}
  message(text){$('action-hint').textContent=text;$('action-hint').classList.add('notice');this.messageUntil=performance.now()+6500;}
  selectCard(id,state){
    if(state.phase!=='playing'||!state.hand.includes(id))return;
    this.selectedAgent=null;this.messageUntil=0;
    if(!canAfford(state,id)){
      this.selectedCard=null;this.awaitingEnergyCard=id;
      this.message(`Energia insufficiente per ${AGENTS[id].name}: servono ${AGENTS[id].cost} punti, ora ne hai ${energyLabel(state.energy)}. Attendi la ricarica.`);
    }else{this.awaitingEnergyCard=null;this.selectedCard=id;}
    this.update(state);
  }
  selectAgent(id,state){this.selectedAgent=this.selectedAgent===id?null:id;this.selectedCard=null;this.awaitingEnergyCard=null;this.messageUntil=0;this.update(state);}
  showDeck(level){this.deckLevel=level;this.draft=this.deckFor(level.id);this.drawDeck();$('deck-dialog').showModal();}
  drawDeck(){
    $('deck-options').innerHTML=this.deckLevel.agents.map(id=>AGENTS[id]).map(a=>`<button class="deck-option" data-deck="${a.id}" aria-pressed="${this.draft.includes(a.id)}" style="--agent-color:${a.color}">${icon(a.icon)}<span><b>${a.name}</b><small>${a.description}</small></span><em>${a.cost} ϟ</em></button>`).join('');
    $('deck-status').textContent=`${this.draft.length} / ${this.deckLevel.deckSize} selezionati${this.draft.length===this.deckLevel.deckSize?'':` · scegli esattamente ${this.deckLevel.deckSize} agenti`}`;$('save-deck').disabled=this.draft.length!==this.deckLevel.deckSize;
  }
  toggleDeck(id){const i=this.draft.indexOf(id);if(i>=0)this.draft.splice(i,1);else this.draft.push(id);this.drawDeck();$('deck-options').querySelector(`[data-deck="${id}"]`)?.focus({preventScroll:true});}
  saveDeck(){if(this.draft.length!==this.deckLevel.deckSize||new Set(this.draft).size!==this.draft.length||this.draft.some(id=>!this.deckLevel.agents.includes(id)))return false;this.deck=[...this.draft];$('deck-dialog').close();return true;}
  reset(){this.clearSelection();this.focusedFracture=null;this.gateFeedback=null;this.awaitingEnergyCard=null;this.resultShown=false;this.handSignature='';this.fractureRows.clear();this.agentRows.clear();$('fracture-list').replaceChildren();$('agent-list').replaceChildren();if($('result-dialog').open)$('result-dialog').close();}
  update(state){
    const playing=state.phase==='playing',ended=state.phase==='ended';
    $('effect-legend').classList.toggle('hidden',!state.level.consequences);
    if(this.selectedAgent&&!state.agents.some(a=>a.id===this.selectedAgent))this.selectedAgent=null;
    $('start-overlay').classList.toggle('hidden',state.phase!=='ready');$('pause-overlay').classList.toggle('hidden',state.phase!=='paused');
    $('timer').textContent=timeLabel(state.config.duration-state.time);$('timer').classList.toggle('urgent',state.config.duration-state.time<=30);
    $('level-label').textContent=state.level.name;
    $('training-agents').textContent=`Mazzo scelto (${state.deck.length}): ${state.deck.map(id=>AGENTS[id].name).join(', ')}.${state.level.agents.length>state.deck.length?' Seleziona Personalizza per scegliere tra tutti gli agenti disponibili.':''}`;
    const configurable=state.level.agents.length>state.level.deckSize;
    $('deck-button').disabled=!configurable;
    $('deck-count').textContent=configurable?`${state.level.deckSize} carte su ${state.level.agents.length}`:`${state.level.deckSize} agenti disponibili`;
    $('deck-action').textContent=configurable?'Personalizza ↗':'Mazzo fisso';
    $('phase-label').textContent=playing?'La rete è in movimento':state.phase==='paused'?'Partita in pausa':ended?'La memoria resta':'Pronta a cominciare';
    $('energy-value').textContent=energyLabel(state.energy);$('energy-fill').style.width=`${state.energy/state.config.energy.max*100}%`;$('energy-track').setAttribute('aria-valuenow',energyLabel(state.energy));$('energy-track').setAttribute('aria-valuemax',state.config.energy.max);$('energy-max').textContent=state.config.energy.max;$('energy-detail').textContent=`+1 punto ogni ${String(state.config.energy.secondsPerPoint).replace('.',',')} secondi · capacità agente: 100`;
    if(playing && this.awaitingEnergyCard && state.hand.includes(this.awaitingEnergyCard) && canAfford(state,this.awaitingEnergyCard)){
      this.message(`${AGENTS[this.awaitingEnergyCard].name} è di nuovo disponibile. Seleziona la carta per inviarla.`);this.awaitingEnergyCard=null;
    }
    const result=state.result||calculateResults(state);
    $('repaired-count').textContent=result.repaired;$('partial-count').textContent=result.partial;$('unresolved-count').textContent=result.unresolved;
    $('work-value').textContent=`${energyLabel(result.workPercent)}%`;$('work-fill').style.width=`${result.workPercent}%`;
    $('goal-label').textContent=`Obiettivo: almeno ${state.config.recognitionPercent}% di lavoro sulle fratture generate.`;
    const signature=JSON.stringify([state.hand,playing]);
    if(signature!==this.handSignature){
      this.handSignature=signature;$('hand').innerHTML=state.hand.map((id,i)=>{const a=AGENTS[id];return `<button class="agent-card${this.selectedCard===id?' selected':''}${!canAfford(state,id)?' low-energy':''}" data-card="${id}" aria-pressed="${this.selectedCard===id}" aria-label="${i+1}: ${a.name}, costo ${a.cost} energia. ${a.description}" style="--agent-color:${a.color}" ${playing?'':'disabled'}><span class="card-icon">${icon(a.icon)}<span class="cost" aria-hidden="true">ϟ ${a.cost}</span></span><b>${a.name}</b><small><span>100 capacità</span><span>${i+1}</span></small><span class="card-availability"></span></button>`;}).join('');
    }
    for(const button of $('hand').querySelectorAll('[data-card]')) {
      const id=button.dataset.card, selected=this.selectedCard===id, available=canAfford(state,id);
      button.classList.toggle('selected',selected);button.classList.toggle('low-energy',!available);
      button.setAttribute('aria-pressed',String(selected));
      button.setAttribute('aria-label',`${state.hand.indexOf(id)+1}: ${AGENTS[id].name}, costo ${AGENTS[id].cost} energia. ${available?'Disponibile':'Energia insufficiente'}. ${AGENTS[id].description}`);
      button.querySelector('.card-availability').textContent=available?'Pronta':'Energia insufficiente';
    }
    $('next-card').textContent=state.queue.length?`In arrivo: ${AGENTS[state.queue[0]].name}`:'Le 4 carte restano sempre disponibili';
    this.updateFractures(state);this.updateAgents(state);
    const selectedFracture=state.fractures.find(f=>f.id===this.focusedFracture);
    const detail=$('fracture-detail');detail.hidden=!selectedFracture;
    if(selectedFracture)detail.textContent=`#${selectedFracture.id} ${CONFLICTS[selectedFracture.type].name} · ${Math.floor(selectedFracture.progress/selectedFracture.required*100)}%${selectedFracture.status==='repaired'?' · ricucita':selectedFracture.status==='expired'?' · scaduta':''}`;
    $('deploy-button').disabled=!playing||!this.selectedCard;
    if(performance.now()>this.messageUntil){
      $('action-hint').classList.remove('notice');
      $('action-hint').textContent=state.phase==='ready'?'Comincia la partita. Ogni agente entra con 100 punti di capacità.':state.phase==='paused'?'La comunità è in pausa. Premi Riprendi per continuare.':ended?'La partita è conclusa. Le ricuciture restano visibili nella mappa.':this.selectedCard?`${AGENTS[this.selectedCard].name}: scegli un ingresso (Nord, Est, Sud o Ovest) o una frattura. Costo ${AGENTS[this.selectedCard].cost} energia.`:this.selectedAgent?`Agente #${this.selectedAgent}: scegli una nuova frattura. Il percorso luminoso mostra la meta attuale.`:'Scegli una carta, poi un ingresso o una frattura. Seleziona un agente per cambiarne la meta.';
    }
    const logSignature=JSON.stringify(state.events);if(this.logSignature!==logSignature){this.logSignature=logSignature;$('event-log').innerHTML=state.events.length?state.events.map(e=>`<li><time>${timeLabel(e.time)}</time>${e.text}</li>`).join(''):'<li>Ogni intervento lascia una traccia.</li>';}
    if(ended&&!this.resultShown){this.resultShown=true;this.showResult(state);}
  }
  updateFractures(state){
    const active=state.fractures.filter(f=>f.status==='active');$('active-count').textContent=`${active.length} / ${state.level.maxActive}`;
    for(const [id,row] of this.fractureRows)if(!active.some(f=>f.id===id)){row.remove();this.fractureRows.delete(id);}
    $('fracture-list').querySelector('.empty-state')?.remove();
    for(const f of active){
      let row=this.fractureRows.get(f.id);if(!row){row=document.createElement('button');row.className='fracture-row';row.dataset.fracture=f.id;row.innerHTML=`<span class="fracture-title"><span class="fracture-kind">${fractureIcon(f.type)}<b></b></span><span></span></span><span class="fracture-progress"><i></i></span><span class="fracture-meta"><span></span><span>Indica come meta ↗</span></span><span class="effect-hint"></span><span class="efficacy-hint"></span>`;$('fracture-list').append(row);this.fractureRows.set(f.id,row);}
      row.title=CONFLICTS[f.type].description;row.classList.toggle('focused',this.focusedFracture===f.id);row.disabled=state.phase!=='playing';
      row.querySelector('b').textContent=`#${f.id} ${CONFLICTS[f.type].name}`;row.querySelector('.fracture-title>span:last-child').textContent=`${Math.max(0,Math.ceil(f.expiresAt-state.time))} s`;
      const percent=Math.floor(f.progress/f.required*100);row.querySelector('.fracture-progress>i').style.width=`${percent}%`;row.querySelector('.fracture-meta>span').textContent=`${percent}% ricucito · ${f.progress}/${f.required} punti`;
      row.querySelector('.effect-hint').textContent=effectDescription(state,f);
      const agent=state.agents.find(a=>a.id===this.selectedAgent),type=this.selectedCard||agent?.type;
      row.querySelector('.efficacy-hint').textContent=agent?.visited.includes(f.id)?`${AGENTS[type].name}: ha già contribuito qui.`:type?`${AGENTS[type].name}: fino a +${Math.min(agent?.capacity??100,Math.floor(EFFICACY[f.type][type]*interventionFactor(state,f)),f.required-f.progress)}`:'';
      row.setAttribute('aria-label',`${CONFLICTS[f.type].name}, frattura ${f.id}, ${percent}%, ${Math.ceil(f.expiresAt-state.time)} secondi. ${CONFLICTS[f.type].description} ${effectDescription(state,f)} Seleziona come meta.`);
    }
    if(!active.length){const p=document.createElement('p');p.className='empty-state';p.textContent=state.phase==='ready'?state.level.firstSpawn ? `La rete è ancora intatta. Il primo conflitto arriva dopo ${state.level.firstSpawn} s.` : 'La rete è ancora intatta. Il primo conflitto arriva all’avvio.':state.phase==='ended'?'Il tempo si è fermato. Le tracce restano nella mappa.':`Nessuna frattura attiva. Prossimo evento tra ${Math.max(0,Math.ceil(state.nextSpawn-state.time))} s.`;$('fracture-list').append(p);}
  }
  updateAgents(state){
    $('agents-count').textContent=state.agents.length;
    for(const [id,row] of this.agentRows)if(!state.agents.some(a=>a.id===id)){row.remove();this.agentRows.delete(id);}
    $('agent-list').querySelector('.empty-state')?.remove();
    for(const a of state.agents){
      const def=AGENTS[a.type];let row=this.agentRows.get(a.id);
      if(!row){row=document.createElement('button');row.className='active-agent';row.dataset.agent=a.id;row.style.setProperty('--agent-color',def.color);row.innerHTML=`${icon(def.icon)}<span><b>#${a.id} ${def.name}</b><small></small></span><strong></strong>`;$('agent-list').append(row);this.agentRows.set(a.id,row);}
      row.disabled=state.phase!=='playing';row.classList.toggle('selected',this.selectedAgent===a.id);row.setAttribute('aria-pressed',this.selectedAgent===a.id);
      const target=state.fractures.find(f=>f.id===a.targetId);row.querySelector('small').textContent=target?`${a.working>0?'Interviene':'Verso'} #${target.id} ${CONFLICTS[target.type].name}`:'In attesa di nuove fratture';row.querySelector('strong').innerHTML=`${a.capacity}<small>/100</small>`;
      row.setAttribute('aria-label',`Seleziona agente ${a.id}, ${def.name}, capacità residua ${a.capacity} su 100`);
    }
    if(!state.agents.length){const p=document.createElement('p');p.className='empty-state';p.textContent=state.phase==='ready'?'Le tue carte diventeranno agenti. La capacità residua resta con loro.':'Nessun agente nella rete. Scegli una carta per inviarne uno.';$('agent-list').append(p);}
  }
  showResult(state){
    const r=state.result;if(!r)return;
    const current=LEVELS[r.level], next=nextLevelFor(r.level);
    const title=r.outcome==='recognition'?(current.recognitionName||'Riconoscimento ottenuto'):r.outcome==='good'?'Buon risultato':'Formazione da riprovare';
    const unlock=r.passed?(next?`Hai sbloccato ${next.name}.`:'Hai completato il percorso disponibile. Il percorso sarà ampliato con nuove formazioni.'):r.outcome==='good'?'Hai raggiunto almeno il 60%; per sbloccare la formazione successiva serve l’80%.':'Per ottenere il riconoscimento serve almeno l’80% del lavoro.';
    const newCards=next?.agents.filter(id=>!current.agents.includes(id)).map(id=>AGENTS[id].name) ?? [];
    const resources=r.passed&&next?`<div class="next-resources"><b>${next.name} · nuove risorse</b><p>Energia massima ${next.energyMax} · ricarica 1 ogni ${String(next.secondsPerPoint).replace('.',',')} secondi.</p><p>Nuove carte: ${newCards.length?newCards.join(', '):'nessuna'}. Carte disponibili: ${next.agents.map(id=>AGENTS[id].name).join(', ')}.</p></div>`:'';
    $('result-content').innerHTML=`<div class="result-kicker">${r.passed?'<span class="medal-result">🏅</span>':''}<b>${title}</b> · ${unlock}</div><div class="result-numbers"><div><strong style="color:var(--gold)">${r.repaired}</strong><span>Ricucite al 100%</span></div><div><strong style="color:var(--red)">${r.partial}</strong><span>Parzialmente ricucite</span></div><div><strong>${r.unresolved}</strong><span>Irrisolte · nessun intervento</span></div></div><div class="result-work"><strong>${energyLabel(r.workPercent)}%</strong><span>del lavoro riparativo realizzato</span></div>${resources}${r.consequenceStats?`<div class="next-resources"><b>Conseguenze nella comunità</b><p>Fratture secondarie generate: ${r.consequenceStats.secondary} · propagazioni impedite: ${r.consequenceStats.prevented} · conseguenze ancora attive: ${r.consequenceStats.active}.</p></div>`:''}<p>${r.partialExpired?`${r.partialExpired} fratture parziali non sono state completate in tempo. `:''}Il risultato comprende tutte le ${r.total} fratture generate, anche quelle scadute. Eventi programmati: ${r.spawnStats.scheduled}; generati: ${r.spawnStats.generated}; non generati per limite di fratture attive: ${r.spawnStats.skippedCapacity}; non generati per assenza di strade disponibili: ${r.spawnStats.skippedNoRoute}. Gli eventi non generati non vengono rinviati. Il riconoscimento è interno al gioco, non una qualifica professionale.</p><div class="result-list">${r.fractures.map(f=>`<div><span>#${f.id} ${CONFLICTS[f.type].name}</span><span>${Math.floor(f.progress/f.required*100)}% (${f.progress}/${f.required}) <small>· ${f.status==='repaired'?'ricucita':f.expired?'tempo scaduto':'fine partita'}</small></span></div>`).join('')}</div>`;
    $('next-level-button').classList.toggle('hidden',!r.passed||!next);$('next-level-button').textContent=next?`INIZIA ${next.name}`:'';if(!$('result-dialog').open)$('result-dialog').showModal();
  }
}
