import { LEVELS, orderedLevels, nextLevelFor } from '../config.js';
import { AGENTS } from '../catalog/agents.js';
import { CONFLICTS } from '../catalog/conflicts.js';
import { EFFICACY } from '../catalog/efficacy.js';
import { FRACTURE_STYLES } from '../rendering/fracture-styles.js';
import { icon } from './icons.js';
import { portrait, ART_COLORS, ART_ORDER } from './art.js';
const $=id=>document.getElementById(id);
export const PLAYER_KEY='ricuci.v03.player.v1';
export function createPlayerStore(storage){return {load(){try{return (storage?.getItem(PLAYER_KEY)||'').trim().slice(0,40);}catch{return '';}},save(value){const name=String(value||'').trim().slice(0,40);if(!name)return false;try{if(!storage)return false;storage.setItem(PLAYER_KEY,name);return true;}catch{return false;}}};}
export function showPage(name){for(const page of ['home','game','rules'])$(`${page}-view`).hidden=page!==name;document.body.classList.toggle('in-game',name==='game');if(name!=='game')window.scrollTo(0,0);}
export function renderHome(state,progress){
 const level=state.level,highest=LEVELS[progress.unlocked];
 $('progress-summary').textContent=`Formazione raggiunta: ${highest.name} · ${Object.keys(progress.medals).length} riconoscimenti ottenuti.`;
 $('formation-list').innerHTML=orderedLevels().map(l=>{const unlocked=l.id<=progress.unlocked, previous=orderedLevels().filter(p=>p.id<l.id).at(-1),newCards=previous?l.agents.filter(id=>!previous.agents.includes(id)):l.agents;return `<div class="formation-chip ${unlocked?'':'locked'}"><b>${l.name} ${progress.medals[l.id]?'🏅':unlocked?'':'🔒'}</b>${unlocked?`Energia ${l.energyMax} · ${newCards.length?newCards.map(id=>AGENTS[id].name).join(', '):'conseguenze speciali'}`:'Da sbloccare'}</div>`;}).join('');
 const available=new Set(level.agents), unlockedCards=new Set(highest.agents), selected=new Set(state.deck);
 $('home-cards').innerHTML=ART_ORDER.map(id=>AGENTS[id]).map(a=>{const locked=!unlockedCards.has(a.id),status=locked?'Da sbloccare':!available.has(a.id)?'Altra formazione':selected.has(a.id)?'Nel mazzo':'Disponibile';return `<div class="home-card-item ${locked?'locked':''}" style="--agent-color:${ART_COLORS[a.id]}">${portrait(a.id)}<span class="home-agent-cost">ϟ ${a.cost}</span><span class="home-agent-name"><b>${a.name}</b><small>${status}</small></span></div>`;}).join('');
}
const consequences={sfotto:'Contagio: dopo 6 secondi può aprire una frattura vicina.',insulto:'Escalation: se non affrontato, aumenta il lavoro richiesto.',esclusione:'Isolamento: può chiudere temporaneamente un’altra strada.',pettegolezzo:'Diffusione: dopo 12 secondi può aprire una frattura lontana.',diffidenza:'Rallentamento: gli agenti vicini si muovono al 65% della velocità.',rivalsa:'Ritorsione: può provocare un altro conflitto.',manipolazione:'Deviazione: può imporre un percorso alternativo.',promessa:'Fiducia compromessa: gli interventi vicini usano il 75% dell’efficacia.'};
export function renderRules(){
 $('rules-agents').innerHTML=Object.values(AGENTS).map(a=>{const strengths=Object.values(CONFLICTS).map(f=>({name:f.name,n:EFFICACY[f.id][a.id]})).sort((x,y)=>y.n-x.n).slice(0,2).map(x=>`${x.name} ${x.n}`).join(' · ');return `<article class="rules-card" style="--agent-color:${ART_COLORS[a.id]}">${portrait(a.id)}<b>${a.name}</b><small>Costo ${a.cost} energia</small><p>${a.description}<br><strong>Punti di forza:</strong> ${strengths}.</p></article>`;}).join('');
 $('rules-conflicts').innerHTML=Object.values(CONFLICTS).map(f=>`<article class="rules-card"><svg viewBox="0 0 32 32" fill="none" stroke="#b94a3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${FRACTURE_STYLES[f.id].icon}</svg><b>${f.name}</b><p>${f.description}<br><strong>Formazione 4:</strong> ${consequences[f.id]}</p></article>`).join('');
 $('rules-levels').innerHTML=orderedLevels().map(l=>{const prev=orderedLevels().filter(p=>p.id<l.id).at(-1),added=prev?l.agents.filter(id=>!prev.agents.includes(id)):l.agents;return `<div class="rules-level"><b>${l.name}</b><br>Energia massima ${l.energyMax} · +1 ogni ${String(l.secondsPerPoint).replace('.',',')} s.<br>${added.length?'Carte introdotte: '+added.map(id=>AGENTS[id].name).join(', '):'Stesse carte; conseguenze speciali.'}<br>${l.agents.length>l.deckSize?`Scegli ${l.deckSize} fra ${l.agents.length} carte.`:`Mazzo fisso di ${l.deckSize} carte.`}</div>`;}).join('');
}
