export const CONFLICTS = {
  sfotto: { id: 'sfotto', name: 'Sfottò', description: 'Una presa in giro incrina un legame quotidiano.', behavior: 'single' },
  insulto: { id: 'insulto', name: 'Insulto', description: 'Parole che feriscono interrompono la comunicazione.', behavior: 'adjacent' },
  esclusione: { id: 'esclusione', name: 'Esclusione', description: 'Qualcuno viene lasciato fuori dalla vita del gruppo.', behavior: 'isolate' },
  pettegolezzo: { id: 'pettegolezzo', name: 'Pettegolezzo', description: 'Una voce non verificata attraversa le relazioni.', behavior: 'spread' },
  diffidenza: { id: 'diffidenza', name: 'Diffidenza', description: 'Il sospetto rende fragili i collegamenti tra persone.', behavior: 'weaken' },
  rivalsa: { id: 'rivalsa', name: 'Rivalsa', description: 'Il desiderio di restituire il torto apre nuove distanze.', behavior: 'secondary' },
  manipolazione: { id: 'manipolazione', name: 'Manipolazione', description: 'Una relazione di potere compromette i legami tra gruppi.', behavior: 'bridge' },
  promessa: { id: 'promessa', name: 'Promessa tradita', description: 'Un impegno disatteso indebolisce la fiducia.', behavior: 'weaken-nearby' },
};
// I comportamenti complessi sono metadati; la propagazione del Pettegolezzo è gestita dal generatore.
