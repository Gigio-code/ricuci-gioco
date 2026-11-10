import { CONSEQUENCES as C } from '../config.js';
import { midpoint, edgeBetween } from '../map/network.js';
import { allNodesReachable, blockedEdges, reachableFromGates } from '../map/paths.js';
import { openFracture, canOpenFracture } from './generator.js';
import { logEvent } from './state.js';

export const EFFECT_NAMES={sfotto:'Contagio',insulto:'Escalation',esclusione:'Isolamento',pettegolezzo:'Diffusione',diffidenza:'Rallentamento',rivalsa:'Ritorsione',manipolazione:'Deviazione',promessa:'Fiducia compromessa'};
export function isConsequenceActive(state,f){
 if(!state.level.consequences||f.status!=='active')return false;
 if(['sfotto','pettegolezzo','rivalsa'].includes(f.type))return f.parentId===null&&!f.secondaryGenerated&&(f.type==='rivalsa'||!(f.effectAttempts>0));
 if(f.type==='insulto')return f.progress===0&&f.required<C.insulto.maximum;
 if(f.type==='esclusione')return !!f.effectEdge;
 return true;
}
export const effectDescription=(state,f)=>!state.level.consequences?'':(['sfotto','pettegolezzo','rivalsa'].includes(f.type)&&!isConsequenceActive(state,f)?`${EFFECT_NAMES[f.type]}: nessuna ulteriore propagazione da questa frattura.`:({
 sfotto:'Contagio: può aprire una frattura vicina.',
 insulto:`Escalation: se non affrontato, il lavoro richiesto aumenta (ora ${f.required} punti).`,
 esclusione:f.effectEdge?'Isolamento: una strada aggiuntiva è chiusa finché la frattura resta attiva.':'Isolamento: ricerca di una strada chiudibile in sicurezza.',
 pettegolezzo:'Diffusione: può aprire una frattura in un’altra zona.',
 diffidenza:`Rallentamento: agenti vicini al ${Math.round(C.diffidenza.speedFactor*100)}% della velocità.`,
 rivalsa:'Ritorsione: può generare un conflitto aggiuntivo.',
 manipolazione:'Deviazione: i percorsi vicini possono essere più lunghi.',
 promessa:`Fiducia compromessa: interventi vicini al ${Math.round(C.promessa.efficacyFactor*100)}% di efficacia.`,
})[f.type]||'');
const active=(state,type)=>state.level.consequences?state.fractures.filter(f=>f.status==='active'&&f.type===type):[];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function speedFactor(state,agent){return active(state,'diffidenza').some(f=>distance(agent,midpoint(state.map,f.edgeId))<=C.diffidenza.radius)?C.diffidenza.speedFactor:1;}
export function interventionFactor(state,fracture){const p=midpoint(state.map,fracture.edgeId);return active(state,'promessa').some(f=>distance(p,midpoint(state.map,f.edgeId))<=C.promessa.radius)?C.promessa.efficacyFactor:1;}
// Si evita solo un tratto se esiste davvero un percorso alternativo; mai una chiusura globale.
export function deviationEdge(state,agent,route){
 if(!route?.path||route.path.length<2)return null;
 const origin=state.map.nodes.find(n=>n.id===route.path[0]);
 if(!origin||!active(state,'manipolazione').some(f=>distance(origin,midpoint(state.map,f.edgeId))<=C.manipolazione.radius))return null;
 return edgeBetween(state.map,route.path[0],route.path[1])?.id ?? null;
}
function isolate(state,f){
 const used=blockedEdges(state),source=state.map.edges.find(e=>e.id===f.edgeId);
 const candidates=state.map.edges.filter(e=>e.fractureable&&!used.has(e.id)&&!state.agents.some(a=>a.to&&edgeBetween(state.map,a.node,a.to)?.id===e.id));
 candidates.sort((a,b)=>{const ac=+(a.a===source.a||a.a===source.b||a.b===source.a||a.b===source.b);const bc=+(b.a===source.a||b.a===source.b||b.b===source.a||b.b===source.b);return bc-ac;});
 const edge=candidates.find(e=>allNodesReachable(state,[e.id])&&reachableFromGates(state,state.fractures.filter(x=>x.status==='active'),[e.id]));
 if(edge){f.effectEdge=edge.id;state.mapRevision++;logEvent(state,`Esclusione #${f.id}: isolamento, una strada alternativa è chiusa temporaneamente.`);}
}
function propagate(state,f,mode){
 const source=midpoint(state.map,f.edgeId), limit=state.level.maxActive;
 if(state.fractures.filter(x=>x.status==='active').length>=limit){state.consequenceStats.prevented++;logEvent(state,`${EFFECT_NAMES[f.type]} #${f.id}: propagazione impedita dal limite.`);return;}
 const all=state.map.edges.filter(e=>e.fractureable&&canOpenFracture(state,e.id)).map(e=>({e,d:distance(source,midpoint(state.map,e.id))}));
 const options=all.filter(x=>mode==='near'?x.d<=C.sfotto.radius:mode==='far'?x.d>=C.pettegolezzo.minDistance:true);
 if(!options.length){state.consequenceStats.prevented++;logEvent(state,`${EFFECT_NAMES[f.type]} #${f.id}: propagazione impedita, nessuna strada sicura.`);return;}
 const edge=options[Math.floor(state.random()*options.length)].e;
 const type=mode==='retaliation'?state.level.conflicts[Math.floor(state.random()*state.level.conflicts.length)]:f.type;
 const child=openFracture(state,edge.id,type,{parentId:f.id});
 if(child){state.consequenceStats.secondary++;f.secondaryGenerated=true;logEvent(state,`${EFFECT_NAMES[f.type]} #${f.id}: frattura secondaria #${child.id}.`);}else state.consequenceStats.prevented++;
}
export function updateConsequences(state){
 if(!state.level.consequences)return;
 for(const f of [...state.fractures]){
  if(f.status!=='active')continue;
  if(f.type==='esclusione'&&!f.isolationChecked){f.isolationChecked=true;isolate(state,f);}
  if(f.type==='insulto'&&f.progress===0&&f.required<C.insulto.maximum){
   const increments=Math.floor((state.time-f.createdAt+1e-8)/C.insulto.interval), amount=Math.min(C.insulto.maximum,state.config.fracture.required+increments*C.insulto.increment);
   if(amount>f.required){f.required=amount;logEvent(state,`Insulto #${f.id}: escalation, ora servono ${amount} punti.`);}
  }
  if(f.parentId!==null||f.secondaryGenerated||!['sfotto','pettegolezzo','rivalsa'].includes(f.type))continue;
  const cfg=C[f.type], interval=cfg.interval||cfg.delay, attempts=Math.floor((state.time-f.createdAt+1e-8)/interval);
  if(attempts<=0||attempts<=(f.effectAttempts||0))continue;
  f.effectAttempts=attempts;
  // Contagio e diffusione hanno un solo tentativo; la rivalsa può riprovare, ma crea al massimo un figlio.
  if(f.type!=='rivalsa'&&attempts>1)continue;
  if(state.random()<cfg.chance)propagate(state,f,f.type==='sfotto'?'near':f.type==='pettegolezzo'?'far':'retaliation');
 }
}
