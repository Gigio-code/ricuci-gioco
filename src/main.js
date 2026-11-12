import { createPlayerStore, showPage, renderHome, renderRules } from './ui/navigation.js';
import { createDeckStore } from './progress/deck-store.js';
import { createProgressStore, recordResult } from './progress/progress.js';
import { LEVELS, nextLevelFor } from './config.js';
import { AGENTS } from './catalog/agents.js';
import { CONFLICTS } from './catalog/conflicts.js';
import { Match, start, togglePause } from './engine/match.js';
import { deploy, redirect } from './engine/actions.js';
import { ArenaRenderer } from './rendering/arena.js';
import { Interface } from './ui/interface.js';
const $=id=>document.getElementById(id),ui=new Interface();
let storage=null;try{storage=window.localStorage;}catch{}
const playerStore=createPlayerStore(storage);let playerName=playerStore.load();$('player-name').value=playerName;
const deckStore=createDeckStore(storage);ui.deck=deckStore.load();
const store=createProgressStore(storage);const loaded=store.load();let progress=loaded.progress,persistent=loaded.persistent;
ui.setProgress(progress,persistent);$('level-select').value=String(progress.unlocked);renderRules();showPage('home');
let match=new Match({level:progress.unlocked,deck:ui.deckFor(progress.unlocked)}),renderer=new ArenaRenderer($('arena'),match.state.map),resultRecorded=false;
function reset(level=Number($('level-select').value)){
  level=Number(level)||1;
  if (!LEVELS[level]) return;
  ui.reset();resultRecorded=false;match=new Match({level,deck:ui.deckFor(level)});renderer=new ArenaRenderer($('arena'),match.state.map);$('level-select').value=level;ui.update(match.state);renderHome(match.state,progress);renderer.render(match.state,ui);$('start-button').focus({preventScroll:true});
}
function launch(selectedLevel=Number($('level-select').value)){
  const level=Number(selectedLevel)||1;
  if (!LEVELS[level]) return;
  showPage('game');
  $('level-select').value=String(level);
  ui.reset();resultRecorded=false;match=new Match({level,deck:ui.deckFor(level)});renderer=new ArenaRenderer($('arena'),match.state.map);start(match.state);ui.update(match.state);renderer.render(match.state,ui);
}
function send(options){
  if(!ui.selectedCard){ui.message('Scegli prima una carta nella tua mano.');return;}
  const result=deploy(match.state,ui.selectedCard,options);
  if(result.ok){const gate=match.state.map.gates.find(g=>g.id===result.agent.node);const name=ui.selectedCard;ui.clearSelection();ui.selectedAgent=result.agent.id;ui.gateFeedback={id:gate.id,until:performance.now()+1800};ui.message(`${AGENTS[name].name} inviato dall’ingresso ${gate.direction}.`);}else ui.message(result.reason);
  ui.update(match.state);
}
function targetFracture(id){
  const fracture=match.state.fractures.find(f=>f.id===id);
  if(!fracture)return;
  ui.focusedFracture=id;
  if(fracture.status!=='active'){ui.message(`${CONFLICTS[fracture.type].name}: ${Math.floor(fracture.progress/fracture.required*100)}% · ${fracture.status==='repaired'?'ricucita':'tempo scaduto'}.`);ui.update(match.state);return;}
  if(ui.selectedCard)send({fractureId:id});
  else if(ui.selectedAgent){const r=redirect(match.state,ui.selectedAgent,id);if(!r.ok)ui.message(r.reason);else ui.message(`Nuova destinazione: frattura #${id}.`);}
  else {const f=match.state.fractures.find(f=>f.id===id);ui.message(`${CONFLICTS[f.type].name}: ${CONFLICTS[f.type].description} Scegli una carta e poi questa frattura.`);}
  ui.update(match.state);
}
$('start-button').addEventListener('click',()=>{const input=$('player-name');if(!input.value.trim()){input.setCustomValidity('Inserisci il tuo nome o un nome di fantasia.');input.reportValidity();input.focus();return;}input.setCustomValidity('');playerName=input.value.trim();const saved=playerStore.save(playerName);$('name-status').textContent=saved?'Nome salvato in questo browser.':'Nome valido per questa sessione; salvataggio non disponibile.';launch();});$('resume-button').addEventListener('click',()=>{if(match.state.phase==='paused')togglePause(match.state);ui.update(match.state);$('hand').querySelector('button')?.focus({preventScroll:true});});
$('hand').addEventListener('click',e=>{const button=e.target.closest('[data-card]');if(button)ui.selectCard(button.dataset.card,match.state);});
$('fracture-list').addEventListener('click',e=>{const button=e.target.closest('[data-fracture]');if(button)targetFracture(Number(button.dataset.fracture));});
$('agent-list').addEventListener('click',e=>{const button=e.target.closest('[data-agent]');if(button)ui.selectAgent(Number(button.dataset.agent),match.state);});
$('deploy-button').addEventListener('click',()=>send({gateId:$('gate-select').value}));
function mapAction(e){
  if(match.state.phase!=='playing')return;
  const gate=e.target.closest('[data-gate]'),fracture=e.target.closest('[data-fracture]'),agent=e.target.closest('[data-agent]');
  if(gate)send({gateId:gate.dataset.gate});else if(fracture)targetFracture(Number(fracture.dataset.fracture));else if(agent)ui.selectAgent(Number(agent.dataset.agent),match.state);
}
$('arena').addEventListener('click',mapAction);$('arena').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();mapAction(e);}});
$('deck-button').addEventListener('click',()=>{if(match.state.level.agents.length>match.state.level.deckSize)ui.showDeck(match.state.level);});$('close-deck').addEventListener('click',()=>$('deck-dialog').close());
$('deck-options').addEventListener('click',e=>{const button=e.target.closest('[data-deck]');if(button)ui.toggleDeck(button.dataset.deck);});
$('save-deck').addEventListener('click',()=>{if(ui.saveDeck()){const saved=deckStore.save(ui.deck);reset();if(!saved)ui.message('Mazzo applicato alla sessione; salvataggio nel browser non disponibile.');}});
$('medal-button').addEventListener('click',()=>{if(match.state.phase==='playing')togglePause(match.state);ui.update(match.state);ui.showMedals();});$('close-medals').addEventListener('click',()=>$('medal-dialog').close());
$('player-form').addEventListener('submit',e=>{e.preventDefault();const input=$('player-name');input.setCustomValidity('');const name=input.value.trim();if(!name){input.setCustomValidity('Inserisci il tuo nome o un nome di fantasia.');input.reportValidity();return;}playerName=name;input.value=name;$('name-status').textContent=playerStore.save(name)?'Nome salvato in questo browser.':'Nome valido per questa sessione; salvataggio non disponibile.';});
$('player-name').addEventListener('input',e=>e.target.setCustomValidity(''));
$('help-button').addEventListener('click',()=>showPage('rules'));
$('header-rules').addEventListener('click',()=>showPage('rules'));
function pauseGame(){if(match.state.phase==='playing'||match.state.phase==='paused'){togglePause(match.state);ui.update(match.state);if(match.state.phase==='paused')$('resume-button').focus({preventScroll:true});else $('hand').querySelector('button')?.focus({preventScroll:true});}}
$('pause-button').addEventListener('click',pauseGame);
$('game-home').addEventListener('click',e=>{e.preventDefault();if(match.state.phase==='playing')pauseGame();});
$('quit-button').addEventListener('click',()=>{reset();showPage('home');});
for(const id of ['rules-back','rules-done'])$(id).addEventListener('click',()=>showPage('home'));
document.querySelector('.rules-header .brand').addEventListener('click',e=>{e.preventDefault();showPage('home');});
for(const id of ['close-result','review-button'])$(id).addEventListener('click',()=>$('result-dialog').close());
$('restart-button').addEventListener('click',()=>{reset();showPage('home');});$('next-level-button').addEventListener('click',()=>{const next=nextLevelFor(match.state.level.id);if(match.state.phase==='ended'&&match.state.result?.passed&&next&&next.id<=progress.unlocked)launch(next.id);});
$('level-select').addEventListener('change',()=>{if($('game-view').hidden)reset();});
document.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.key.toLowerCase()==='p'&&!$('game-view').hidden){e.preventDefault();pauseGame();return;}
  if(e.key==='Escape'){ui.clearSelection();ui.focusedFracture=null;ui.update(match.state);}
  if(/^[1-4]$/.test(e.key)&&match.state.phase==='playing'){e.preventDefault();ui.selectCard(match.state.hand[Number(e.key)-1],match.state);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&match.state.phase==='playing'){togglePause(match.state);ui.update(match.state);}});
let previous=performance.now(),lastUI=0;
function frame(now){const dt=Math.max(0,(now-previous)/1000);previous=now;match.advance(dt);if(match.state.phase==='ended'&&!resultRecorded){resultRecorded=true;progress=recordResult(progress,match.state.result);persistent=store.save(progress);ui.setProgress(progress,persistent);renderHome(match.state,progress);}if(!$('game-view').hidden)renderer.render(match.state,ui);if(now-lastUI>100||match.state.phase==='ended'&&!ui.resultShown){ui.update(match.state);lastUI=now;}requestAnimationFrame(frame);}
ui.update(match.state);renderHome(match.state,progress);renderer.render(match.state,ui);requestAnimationFrame(frame);
