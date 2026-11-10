export const AGENTS = {
  ascolto: { id: 'ascolto', name: 'Ascolto', short: 'A', cost: 1, color: '#346c64', icon: 'ear', description: 'Comprendere le esperienze delle persone coinvolte.' },
  riconoscimento: { id: 'riconoscimento', name: 'Riconoscimento', short: 'R', cost: 2, color: '#80613c', icon: 'eye', description: 'Rendere visibili il danno e i bisogni.' },
  protezione: { id: 'protezione', name: 'Protezione', short: 'P', cost: 3, color: '#4c6890', icon: 'shield', description: 'Contribuire alla sicurezza delle persone coinvolte.' },
  responsabilita: { id: 'responsabilita', name: 'Responsabilità', short: 'Rs', cost: 3, color: '#a05e4d', icon: 'hand', description: 'Favorire l’assunzione delle conseguenze.' },
  dialogo: { id: 'dialogo', name: 'Dialogo', short: 'D', cost: 2, color: '#7b6993', icon: 'chat', description: 'Riaprire la comunicazione.' },
  mediazione: { id: 'mediazione', name: 'Mediazione', short: 'M', cost: 3, color: '#476d85', icon: 'balance', description: 'Facilitare un confronto imparziale.' },
  riparazione: { id: 'riparazione', name: 'Riparazione', short: 'Rp', cost: 4, color: '#9b792e', icon: 'stitch', description: 'Ricomporre concretamente la frattura.' },
  comunita: { id: 'comunita', name: 'Comunità', short: 'C', cost: 4, color: '#64734d', icon: 'people', description: 'Coinvolgere la rete delle relazioni e del sostegno.' },
};
export const DEFAULT_DECK = ['ascolto', 'riconoscimento', 'protezione', 'responsabilita', 'dialogo', 'comunita'];
