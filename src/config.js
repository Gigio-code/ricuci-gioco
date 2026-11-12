// Tutti i tempi sono in secondi. Le formazioni configurano il motore senza modificarlo.
export const CONFIG = {
  duration: 180, fixedStep: 1 / 30, maxFrame: 0.2,
  energy: { initial: 6, max: 8, secondsPerPoint: 3 },
  agent: { capacity: 100, speed: 85, interventionSeconds: 1.1 },
  fracture: { required: 100, propagationChance: 0.25, propagationDelay: 12 },
  deck: { size: 4, handSize: 4 },
  recognitionPercent: 80, goodPercent: 60,
};
const first = ['ascolto','dialogo','protezione','riparazione'];
const second = [...first,'riconoscimento','mediazione'];
const third = [...second,'responsabilita','comunita'];
const allConflicts = ['sfotto','insulto','esclusione','pettegolezzo','diffidenza','rivalsa','manipolazione','promessa'];
export const LEVELS = {
  1: { id:1, name:'FORMAZIONE 1', duration:180, firstSpawn:3, interval:10, maxActive:4, deadline:35, energyMax:8, secondsPerPoint:3, agents:first, deckSize:4, conflicts:allConflicts.slice(0,4), description:'Prima frattura dopo 3 s · poi ogni 10 s · fino a 4 attive' },
  2: { id:2, name:'FORMAZIONE 2', duration:180, firstSpawn:3, interval:7, maxActive:6, deadline:32, energyMax:10, secondsPerPoint:2.5, agents:second, deckSize:6, conflicts:allConflicts, description:'Prima frattura dopo 3 s · poi ogni 7 s · fino a 6 attive' },
  4: { id:4, name:'FORMAZIONE 4', duration:180, interval:4, maxActive:10, deadline:28, energyMax:12, secondsPerPoint:2, agents:third, deckSize:6, conflicts:allConflicts, consequences:true, description:'Una frattura ogni 4 s · fino a 10 attive · conseguenze potenziate' },
  3: { recognitionName:'Riconoscimento di eccellenza', id:3, name:'FORMAZIONE 3', duration:180, interval:5, maxActive:8, deadline:30, energyMax:12, secondsPerPoint:2, agents:third, deckSize:6, conflicts:allConflicts, description:'Una frattura ogni 5 s · fino a 8 attive' },
};
export const defaultDeckFor = level => LEVELS[level].agents.slice(0, LEVELS[level].deckSize);

// Le formazioni sono ordinate per ID numerico; basta aggiungere una voce in LEVELS.
export const orderedLevels = () => Object.values(LEVELS).sort((a,b)=>a.id-b.id);
export const nextLevelFor = id => { const levels=orderedLevels(); const index=levels.findIndex(level=>level.id===id); return index<0 ? null : levels[index+1] ?? null; };

// Parametri sperimentali della sola Formazione 4.
export const CONSEQUENCES = {
  sfotto: { delay:3, chance:0.65, radius:170 },
  insulto: { interval:4, increment:15, maximum:160 },
  esclusione: { maxEdges:1 },
  pettegolezzo: { delay:5, chance:0.65, minDistance:180 },
  diffidenza: { radius:145, speedFactor:0.5 },
  rivalsa: { interval:4, chance:0.5 },
  manipolazione: { radius:180 },
  promessa: { radius:170, efficacyFactor:0.6 },
};
