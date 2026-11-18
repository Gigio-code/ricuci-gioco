// Ordine colonne: Ascolto, Riconoscimento, Dialogo, Protezione, Responsabilità, Mediazione, Riparazione, Comunità.
export const AGENT_ORDER = ['ascolto', 'riconoscimento', 'dialogo', 'protezione', 'responsabilita', 'mediazione', 'riparazione', 'comunita'];
const rows = {
  sfotto: [65, 40, 80, 45, 30, 45, 25, 35],
  insulto: [45, 50, 55, 80, 65, 60, 35, 25],
  esclusione: [35, 55, 45, 60, 35, 50, 50, 85],
  pettegolezzo: [45, 85, 50, 25, 70, 55, 40, 35],
  diffidenza: [80, 45, 75, 25, 35, 65, 30, 70],
  rivalsa: [25, 45, 30, 85, 80, 70, 45, 25],
  manipolazione: [30, 85, 35, 60, 75, 50, 35, 40],
  promessa: [45, 60, 50, 30, 85, 55, 85, 40],
};
export const EFFICACY = Object.fromEntries(Object.entries(rows).map(([id, values]) => [id, Object.fromEntries(AGENT_ORDER.map((agent, i) => [agent, values[i]]))]));
