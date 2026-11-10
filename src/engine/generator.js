import { CONFLICTS } from '../catalog/conflicts.js';
import { reachableFromGates, allNodesReachable, blockedEdges } from '../map/paths.js';
import { edgeBetween } from '../map/network.js';
import { logEvent } from './state.js';
export function canOpenFracture(state, edgeId) {
  const edge = state.map.edges.find(e => e.id === edgeId);
  if (!edge?.fractureable || state.fractures.some(f => f.edgeId === edgeId) || (state.level.consequences && blockedEdges(state).has(edgeId))) return false;
  // Non si apre una crepa sotto i piedi di un agente già in transito.
  if (state.agents.some(a => a.to && edgeBetween(state.map, a.node, a.to)?.id === edgeId)) return false;
  return (!state.level.consequences || allNodesReachable(state,[edgeId])) && reachableFromGates(state, [...state.fractures.filter(f => f.status === 'active'), { edgeId }], [edgeId]);
}
export function openFracture(state, edgeId, type, { parentId = null } = {}) {
  if (!CONFLICTS[type] || state.fractures.filter(f => f.status === 'active').length >= state.level.maxActive || !canOpenFracture(state, edgeId)) return null;
  const fracture = { id: state.nextFractureId++, type, edgeId, progress: 0, required: state.config.fracture.required, status: 'active', createdAt: state.time, expiresAt: state.time + state.level.deadline, expired: false, contributions: [], parentId, propagationChecked: parentId !== null };
  state.fractures.push(fracture); state.mapRevision++;
  logEvent(state, `${CONFLICTS[type].name}: una nuova frattura nella rete.`);
  return fracture;
}
export function generateFracture(state) {
  if (state.fractures.filter(f => f.status === 'active').length >= state.level.maxActive) return null;
  const candidates = state.map.edges.filter(e => e.fractureable && !state.fractures.some(f => f.edgeId === e.id));
  // Mescolamento con il generatore locale: partite riproducibili senza ordine o luogo fissi.
  for (let i = candidates.length - 1; i > 0; i--) { const j = Math.floor(state.random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
  const edge = candidates.find(e => canOpenFracture(state, e.id));
  const pool = state.level.conflicts;
  return edge ? openFracture(state, edge.id, pool[Math.floor(state.random() * pool.length)]) : null;
}

// Un solo tentativo per Pettegolezzo, senza catene: il figlio conta nel limite attivo.
export function updatePropagation(state) {
  for (const f of [...state.fractures]) {
    if (f.type !== 'pettegolezzo' || f.propagationChecked || f.status !== 'active' || state.time < f.createdAt + state.config.fracture.propagationDelay) continue;
    f.propagationChecked = true;
    if (state.random() >= state.config.fracture.propagationChance) continue;
    const source = state.map.edges.find(e => e.id === f.edgeId);
    const candidates = state.map.edges.filter(e => e.id !== source.id && (e.a === source.a || e.a === source.b || e.b === source.a || e.b === source.b));
    for (let i = candidates.length - 1; i > 0; i--) { const j = Math.floor(state.random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
    const edge = candidates.find(e => canOpenFracture(state, e.id));
    const child = edge && openFracture(state, edge.id, f.type, { parentId: f.id });
    if (child) logEvent(state, `Il Pettegolezzo #${f.id} si propaga alla frattura #${child.id}.`);
  }
}
