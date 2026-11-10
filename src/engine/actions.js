import { AGENTS } from '../catalog/agents.js';
import { nodeAt } from '../map/network.js';
import { routeToFracture } from '../map/paths.js';
import { assignTarget } from './agents.js';
import { logEvent } from './state.js';
export function deploy(state, cardId, { gateId = null, fractureId = null, ownerId = 'local' } = {}) {
  if (state.phase !== 'playing') return { ok: false, reason: 'Avvia o riprendi la partita.' };
  const index = state.hand.indexOf(cardId), card = AGENTS[cardId];
  if (index < 0 || !card) return { ok: false, reason: 'Questa carta non è nella mano.' };
  if (state.energy + 1e-8 < card.cost) return { ok: false, reason: `Servono ${card.cost} punti energia.` };
  let target = null;
  if (fractureId !== null) {
    target = state.fractures.find(f => f.id === fractureId && f.status === 'active');
    if (!target) return { ok: false, reason: 'La frattura non è più attiva.' };
  }
  let gate = state.map.gates.find(g => g.id === gateId);
  if (gateId && !gate) return { ok: false, reason: 'Scegli uno dei quattro ingressi.' };
  if (!gate && target) {
    const options = state.map.gates.map(g => ({ gate: g, route: routeToFracture(state, g.id, target) })).filter(o => o.route).sort((a, b) => a.route.distance - b.route.distance);
    gate = options[0]?.gate;
    if (!gate) return { ok: false, reason: 'Questa frattura non è raggiungibile da nessun ingresso.' };
  }
  if (!gate) return { ok: false, reason: 'Scegli un ingresso o una frattura.' };
  if (target && !routeToFracture(state, gate.id, target)) return { ok: false, reason: 'Da questo ingresso non c’è un percorso. Prova un altro accesso.' };
  const node = nodeAt(state.map, gate.id);
  const agent = { id: state.nextAgentId++, ownerId, type: cardId, capacity: state.config.agent.capacity, visited: [], node: gate.id, to: null, edgeProgress: 0, x: node.x, y: node.y, route: [], targetId: null, working: 0, revision: -1 };
  state.agents.push(agent); state.energy = Math.max(0, state.energy - card.cost);
  state.queue.push(state.hand[index]); state.hand[index] = state.queue.shift();
  assignTarget(state, agent, target?.id ?? null);
  logEvent(state, `${card.name} entra da ${gate.direction || `ore ${gate.hour}`}. Capacità 100.`);
  return { ok: true, agent };
}
export function redirect(state, agentId, fractureId) {
  if (state.phase !== 'playing') return { ok: false, reason: 'Riprendi la partita per cambiare destinazione.' };
  const agent = state.agents.find(a => a.id === agentId);
  const target = state.fractures.find(f => f.id === fractureId && f.status === 'active');
  if (!agent || !target) return { ok: false, reason: 'Seleziona un agente e una frattura attiva.' };
  if (agent.visited.includes(fractureId)) return { ok: false, reason: 'Questo agente ha già contribuito qui. Scegli un’altra frattura.' };
  if (!routeToFracture(state, agent.to || agent.node, target)) return { ok: false, reason: 'Non c’è un percorso da questa posizione.' };
  assignTarget(state, agent, fractureId);
  return { ok: true };
}
