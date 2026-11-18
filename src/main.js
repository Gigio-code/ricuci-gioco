import { createPlayerStore, showPage, renderHome, renderRules } from './ui/navigation.js?v=0.14';
import { createProgressStore, recordResult } from './progress/progress.js';
import { LEVELS, nextLevelFor } from './config.js';
import { AGENTS } from './catalog/agents.js';
import { CONFLICTS } from './catalog/conflicts.js';
import { TUTORIAL_ROLES } from './ui/tutorial-roles.js?v=0.10';
import { EFFICACY } from './catalog/efficacy.js?v=0.11';
import { portrait, ART_COLORS } from './ui/art.js';
import { Match, start, togglePause } from './engine/match.js?v=0.11';
import { openFracture } from './engine/generator.js';
import { deploy, redirect } from './engine/actions.js?v=0.11';
import { ArenaRenderer } from './rendering/arena.js?v=0.10';
import { Interface } from './ui/interface.js?v=0.14';
import { createSoundPlayer } from './audio/sounds.js?v=0.13';
import { createSoundEvents } from './audio/events.js';
const $=id=>document.getElementById(id),ui=new Interface();
const soundPlayer=createSoundPlayer(),soundEvents=createSoundEvents((event,delay)=>soundPlayer.play(event,delay));
let storage=null;try{storage=window.localStorage;}catch{}
const playerStore=createPlayerStore(storage);let playerName=playerStore.load();$('player-name').value=playerName;
const store=createProgressStore(storage);const loaded=store.load();let progress=loaded.progress,persistent=loaded.persistent;
ui.setProgress(progress,persistent);$('level-select').value=String(progress.unlocked);renderRules();showPage('home');
let match=new Match({level:progress.unlocked}),renderer=new ArenaRenderer($('arena'),match.state.map),resultRecorded=false;
const TUTORIAL_KEY='ricuci.tutorial.v1';
let tutorial=null,tutorialSeen=false;try{tutorialSeen=storage?.getItem(TUTORIAL_KEY)==='done';}catch{}
function reset(level=Number($('level-select').value)){
  soundPlayer.stop();soundEvents.reset();
  level=Math.max(1,Math.min(Number(level)||1,progress.unlocked));
  ui.reset();resultRecorded=false;match=new Match({level});renderer=new ArenaRenderer($('arena'),match.state.map);$('level-select').value=level;ui.update(match.state);renderHome(match.state,progress);renderer.render(match.state,ui);$('start-button').focus({preventScroll:true});
}
function launch(selectedLevel=Number($('level-select').value)){
  const level=Math.max(1,Math.min(Number(selectedLevel)||1,progress.unlocked));
  if (!LEVELS[level]) return;
  soundPlayer.stop();soundPlayer.unlock();
  showPage('game');
  $('level-select').value=String(level);
  ui.reset();resultRecorded=false;match=new Match({level});renderer=new ArenaRenderer($('arena'),match.state.map);start(match.state);soundEvents.begin(match.state);ui.update(match.state);renderer.render(match.state,ui);
}
function rememberTutorial(){tutorialSeen=true;try{storage?.setItem(TUTORIAL_KEY,'done');}catch{}}
function clearTutorial(){tutorial=null;document.body.classList.remove('in-tutorial');delete document.body.dataset.tutorialCard;delete document.body.dataset.tutorialTarget;$('tutorial-bar').hidden=true;$('tactical-bar').hidden=false;$('timer').setAttribute('aria-label','Tempo rimanente');}
function tutorialView(){
  if(!tutorial)return;
  const steps={first:['1 / 4','Qui c’è Sfottò: Ascolto costa 1 energia e può dare 65 punti. Tocca la carta.'],target1:['2 / 4','Tocca la frattura rossa.'],moving1:['2 / 4','Ascolto sta arrivando: guarda il suo intervento.'],second:['3 / 4','Mancano 35 punti: Protezione può darli con 3 energie. Tocca la carta.'],target2:['4 / 4','Tocca di nuovo la stessa frattura.'],moving2:['4 / 4','Protezione sta arrivando: guarda la ricucitura.'],done:['FATTO!','Frattura ricucita: la strada è di nuovo aperta.']};
  const [label,message]=steps[tutorial.step];if($('tutorial-step-label').textContent!==label)$('tutorial-step-label').textContent=label;if($('tutorial-instruction').textContent!==message)$('tutorial-instruction').textContent=message;
  document.body.dataset.tutorialCard=({first:'ascolto',target1:'ascolto',second:'protezione',target2:'protezione'})[tutorial.step]||'';
  document.body.dataset.tutorialTarget=String(tutorial.step==='target1'||tutorial.step==='target2');
  $('tutorial-continue').hidden=tutorial.step!=='done';$('tutorial-skip').hidden=tutorial.step==='done';$('timer').textContent='PROVA';$('timer').setAttribute('aria-label','Tutorial, senza limite di tempo');
}
function startTutorial(){
  soundPlayer.stop();soundPlayer.unlock();
  const chosenLevel=Number($('level-select').value)||1;
  showPage('game');ui.reset();resultRecorded=false;match=new Match({level:1,config:{duration:3600}});start(match.state);match.state.nextSpawn=Infinity;
  let fracture=null;for(const edge of match.state.map.edges){if(edge.fractureable&&(fracture=openFracture(match.state,edge.id,'sfotto')))break;}
  if(!fracture){clearTutorial();launch(chosenLevel);return;}
  fracture.expiresAt=Infinity;tutorial={step:'first',fractureId:fracture.id,chosenLevel};soundEvents.begin(match.state,{tutorial:true});
  renderer=new ArenaRenderer($('arena'),match.state.map);document.body.classList.add('in-tutorial');$('tutorial-bar').hidden=false;$('tactical-bar').hidden=true;ui.update(match.state);renderer.render(match.state,ui);tutorialView();showTutorialRoles();
}
function finishTutorial(){if(!tutorial)return;const level=tutorial.chosenLevel;rememberTutorial();clearTutorial();launch(level);}
function tutorialCard(id){
  if(!tutorial)return true;
  const expected=['first','target1'].includes(tutorial.step)?'ascolto':['second','target2'].includes(tutorial.step)?'protezione':null;
  if(id!==expected)return false;
  tutorial.step=expected==='ascolto'?'target1':'target2';return true;
}
function tutorialTarget(id){return !tutorial||((tutorial.step==='target1'||tutorial.step==='target2')&&id===tutorial.fractureId);}
function tutorialTick(){
  if(!tutorial)return;
  const f=match.state.fractures.find(item=>item.id===tutorial.fractureId);
  if(tutorial.step==='moving1'&&f?.progress>0){tutorial.step='second';ui.clearSelection();}
  if(tutorial.step==='moving2'&&f?.status==='repaired'){tutorial.step='done';ui.clearSelection();}
  tutorialView();
}
let tutorialRolesPage=0;
function renderTutorialRoles(){
  const start=tutorialRolesPage*4;
  $('tutorial-roles-page').textContent=`${tutorialRolesPage+1} / 2`;
  $('tutorial-roles-note').textContent=tutorialRolesPage===0?'I primi quattro sono disponibili subito.':'Questi personaggi si sbloccano nelle formazioni successive.';
  $('tutorial-roles-list').innerHTML=TUTORIAL_ROLES.slice(start,start+4).map(role=>`<article class="tutorial-role" style="--agent-color:${ART_COLORS[role.id]}">${portrait(role.id)}<div><b>${AGENTS[role.id].name}</b><p>Costa <strong>${AGENTS[role.id].cost} energia</strong>. ${role.text}</p><p>Utile per: <strong>${Object.values(CONFLICTS).map(f=>({name:f.name,points:EFFICACY[f.id][role.id]})).sort((a,b)=>b.points-a.points).slice(0,2).map(f=>`${f.name} +${f.points}`).join(' · ')}</strong></p></div></article>`).join('');
  $('tutorial-roles-back').hidden=tutorialRolesPage===0;
  $('tutorial-roles-skip').hidden=tutorialRolesPage===1;
  $('tutorial-roles-next').textContent=tutorialRolesPage===0?'Avanti →':'Proviamo! →';
}
function showTutorialRoles(){tutorialRolesPage=0;renderTutorialRoles();$('tutorial-roles-dialog').showModal();}
function closeTutorialRoles(){$('tutorial-roles-dialog').close();soundPlayer.unlock();soundEvents.showTutorialFracture();$('hand').querySelector('[data-card="ascolto"]')?.focus({preventScroll:true});}
$('tutorial-roles-back').addEventListener('click',()=>{tutorialRolesPage=0;renderTutorialRoles();$('tutorial-roles-next').focus();});
$('tutorial-roles-next').addEventListener('click',()=>{if(tutorialRolesPage===0){tutorialRolesPage=1;renderTutorialRoles();$('tutorial-roles-next').focus();}else closeTutorialRoles();});
$('tutorial-roles-skip').addEventListener('click',closeTutorialRoles);
$('tutorial-roles-dialog').addEventListener('cancel',e=>{e.preventDefault();closeTutorialRoles();});
$('tutorial-skip').addEventListener('click',finishTutorial);$('tutorial-continue').addEventListener('click',finishTutorial);
function beginFromHome(forceTutorial=false){
  const input=$('player-name');if(!input.value.trim()){showPage('home');input.setCustomValidity('Inserisci il tuo nome o un nome di fantasia.');input.reportValidity();input.focus();return;}
  input.setCustomValidity('');playerName=input.value.trim();const saved=playerStore.save(playerName);$('name-status').textContent=saved?'Nome salvato in questo browser.':'Nome valido per questa sessione; salvataggio non disponibile.';
  if(forceTutorial||!tutorialSeen)startTutorial();else launch();
}
$('tutorial-replay').addEventListener('click',()=>beginFromHome(true));$('rules-tutorial').addEventListener('click',()=>beginFromHome(true));
function send(options){
  if(!ui.selectedCard){ui.message('Scegli prima una carta nella tua mano.');return;}
  const result=deploy(match.state,ui.selectedCard,options);
  if(result.ok){if(tutorial)tutorial.step=tutorial.step==='target1'?'moving1':'moving2';const gate=match.state.map.gates.find(g=>g.id===result.agent.node);const name=ui.selectedCard;soundPlayer.unlock();soundEvents.deployed(name,result);ui.clearSelection();ui.selectedAgent=result.agent.id;ui.gateFeedback={id:gate.id,until:performance.now()+1800};ui.message(`${AGENTS[name].name} inviato dall’ingresso ${gate.direction}.`);}else ui.message(result.reason);
  ui.update(match.state);
}
function targetFracture(id){
  const fracture=match.state.fractures.find(f=>f.id===id);
  if(!fracture||!tutorialTarget(id))return;
  ui.focusedFracture=id;
  if(fracture.status!=='active'){ui.message(`${CONFLICTS[fracture.type].name}: ${Math.floor(fracture.progress/fracture.required*100)}% · ${fracture.status==='repaired'?'ricucita':'tempo scaduto'}.`);ui.update(match.state);return;}
  if(ui.selectedCard)send({fractureId:id});
  else if(ui.selectedAgent){const r=redirect(match.state,ui.selectedAgent,id);if(!r.ok)ui.message(r.reason);else ui.message(`Nuova destinazione: frattura #${id}.`);}
  else {const f=match.state.fractures.find(f=>f.id===id);ui.message(`${CONFLICTS[f.type].name}: ${CONFLICTS[f.type].description} Scegli una carta e poi questa frattura.`);}
  ui.update(match.state);
}
$('start-button').addEventListener('click',()=>beginFromHome(false));$('resume-button').addEventListener('click',()=>{if(match.state.phase==='paused'){soundPlayer.unlock();togglePause(match.state);}ui.update(match.state);$('hand').querySelector('button')?.focus({preventScroll:true});});
$('hand').addEventListener('click',e=>{const button=e.target.closest('[data-card]');if(button&&tutorialCard(button.dataset.card)){ui.selectCard(button.dataset.card,match.state);tutorialView();}});
$('fracture-list').addEventListener('click',e=>{const button=e.target.closest('[data-fracture]');if(button)targetFracture(Number(button.dataset.fracture));});
$('agent-list').addEventListener('click',e=>{const button=e.target.closest('[data-agent]');if(button)ui.selectAgent(Number(button.dataset.agent),match.state);});
$('deploy-button').addEventListener('click',()=>send({gateId:$('gate-select').value}));
function mapAction(e){
  if(match.state.phase!=='playing')return;
  const gate=e.target.closest('[data-gate]'),fracture=e.target.closest('[data-fracture]'),agent=e.target.closest('[data-agent]');
  if(gate&&!tutorial)send({gateId:gate.dataset.gate});else if(fracture)targetFracture(Number(fracture.dataset.fracture));else if(agent&&!tutorial)ui.selectAgent(Number(agent.dataset.agent),match.state);
}
$('arena').addEventListener('click',mapAction);$('arena').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();mapAction(e);}});
$('medal-button').addEventListener('click',()=>{if(match.state.phase==='playing')togglePause(match.state);ui.update(match.state);ui.showMedals();});$('close-medals').addEventListener('click',()=>$('medal-dialog').close());
$('player-form').addEventListener('submit',e=>{e.preventDefault();const input=$('player-name');input.setCustomValidity('');const name=input.value.trim();if(!name){input.setCustomValidity('Inserisci il tuo nome o un nome di fantasia.');input.reportValidity();return;}playerName=name;input.value=name;$('name-status').textContent=playerStore.save(name)?'Nome salvato in questo browser.':'Nome valido per questa sessione; salvataggio non disponibile.';});
$('player-name').addEventListener('input',e=>e.target.setCustomValidity(''));
$('help-button').addEventListener('click',()=>showPage('rules'));
$('header-rules').addEventListener('click',()=>showPage('rules'));
function pauseGame(){if(match.state.phase==='playing'||match.state.phase==='paused'){togglePause(match.state);if(match.state.phase==='paused')soundPlayer.stop();else soundPlayer.unlock();ui.update(match.state);if(match.state.phase==='paused')$('resume-button').focus({preventScroll:true});else $('hand').querySelector('button')?.focus({preventScroll:true});}}
$('pause-button').addEventListener('click',pauseGame);
$('game-home').addEventListener('click',e=>{e.preventDefault();if(match.state.phase==='playing')pauseGame();});
$('quit-button').addEventListener('click',()=>{clearTutorial();reset();showPage('home');});
for(const id of ['rules-back','rules-done'])$(id).addEventListener('click',()=>showPage('home'));
document.querySelector('.rules-header .brand').addEventListener('click',e=>{e.preventDefault();showPage('home');});
for(const id of ['close-result','review-button'])$(id).addEventListener('click',()=>$('result-dialog').close());
$('restart-button').addEventListener('click',()=>{reset();showPage('home');});$('next-level-button').addEventListener('click',()=>{const next=nextLevelFor(match.state.level.id);if(match.state.phase==='ended'&&match.state.result?.passed&&next&&next.id<=progress.unlocked)launch(next.id);});
$('level-select').addEventListener('change',()=>{if($('game-view').hidden)reset();});
document.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.key.toLowerCase()==='p'&&!$('game-view').hidden){e.preventDefault();pauseGame();return;}
  if(e.key==='Escape'){ui.clearSelection();ui.focusedFracture=null;if(tutorial?.step==='target1')tutorial.step='first';if(tutorial?.step==='target2')tutorial.step='second';ui.update(match.state);tutorialView();}
  if(/^[1-4]$/.test(e.key)&&match.state.phase==='playing'){e.preventDefault();const card=match.state.hand[Number(e.key)-1];if(tutorialCard(card)){ui.selectCard(card,match.state);tutorialView();}}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){soundPlayer.stop();if(match.state.phase==='playing'){togglePause(match.state);ui.update(match.state);}}});
// Fallback per i browser senza unità di dimensione del contenitore.
if(!window.CSS?.supports?.('width','1cqw')){
  const stage=document.querySelector('.game-stage'),shell=document.querySelector('.arena-shell');
  const fit=()=>{const size=Math.floor(Math.min(stage.clientWidth,stage.clientHeight));if(size>0){shell.style.width=`${size}px`;shell.style.height=`${size}px`;}};
  if(window.ResizeObserver)new ResizeObserver(fit).observe(stage);
  window.addEventListener('resize',fit);requestAnimationFrame(fit);
}
let previous=performance.now(),lastUI=0;
function frame(now){const dt=Math.max(0,(now-previous)/1000);previous=now;if(!tutorial||tutorial.step==='moving1'||tutorial.step==='moving2')match.advance(dt);tutorialTick();if(!document.hidden&&(match.state.phase==='playing'||match.state.phase==='ended'))soundEvents.observe(match.state);if(match.state.phase==='ended'&&!resultRecorded){resultRecorded=true;soundEvents.end(match.state.result);progress=recordResult(progress,match.state.result);persistent=store.save(progress);ui.setProgress(progress,persistent);renderHome(match.state,progress);}if(!$('game-view').hidden)renderer.render(match.state,ui);if(now-lastUI>100||match.state.phase==='ended'&&!ui.resultShown){ui.update(match.state);tutorialView();lastUI=now;}requestAnimationFrame(frame);}
ui.update(match.state);renderHome(match.state,progress);renderer.render(match.state,ui);requestAnimationFrame(frame);
