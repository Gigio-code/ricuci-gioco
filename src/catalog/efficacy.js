// Ordine colonne: Ascolto, Riconoscimento, Dialogo, Protezione, Responsabilità, Mediazione, Riparazione, Comunità.
export const AGENT_ORDER = ['ascolto', 'riconoscimento', 'dialogo', 'protezione', 'responsabilita', 'mediazione', 'riparazione', 'comunita'];
const rows = {
  sfotto: [45, 45, 50, 50, 40, 35, 35, 40],
  insulto: [40, 50, 45, 55, 60, 55, 55, 35],
  esclusione: [45, 55, 40, 55, 45, 45, 55, 70],
  pettegolezzo: [40, 65, 55, 35, 60, 50, 40, 50],
  diffidenza: [50, 45, 60, 35, 40, 55, 40, 65],
  rivalsa: [35, 45, 35, 70, 65, 60, 55, 40],
  manipolazione: [35, 70, 40, 55, 65, 45, 45, 50],
  promessa: [40, 55, 50, 30, 70, 55, 70, 45],
};
export const EFFICACY = Object.fromEntries(Object.entries(rows).map(([id, values]) => [id, Object.fromEntries(AGENT_ORDER.map((agent, i) => [agent, values[i]]))]));
