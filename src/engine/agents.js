import { speedFactor, deviationEdge } from './consequences.js';
import { blockedEdges, routeToFracture } from '../map/paths.js';
import { edgeBetween, nodeAt } from '../map/network.js';
import { contribute } from './repair.js';
export function assignTarget(state, agent, preferredId = null) {
  // Se è già su una strada, conclude soltanto quel tratto prima di cambiare itinerario.
  const origin = agent.to || agent.node;
  const options = state.fractures.filter(f => f.status === 'active' && !agent.visited.includes(f.id)).map(f => ({ fracture: f, route: routeToFracture(state, origin, f) })).filter(item => item.route);
  options.sort((a, b) => a.route.distance - b.route.distance || a.fracture.id - b.fracture.id);
  const chosen = options.find(o => o.fracture.id === preferredId) || (preferredId === null ? options[0] : null);
  if (!chosen) { agent.targetId = null; agent.route = []; agent.working = 0; return false; }
  const avoided=deviationEdge(state,agent,chosen.route);
  const alternative=avoided&&routeToFracture(state,origin,chosen.fracture,new Set([...blockedEdges(state),avoided]));
  agent.deviated=!!alternative;
  agent.targetId = chosen.fracture.id; agent.route = (alternative||chosen.route).path.slice(1); agent.working = 0; agent.revision = state.mapRevision;
  return true;
}
export function updateAgents(state, dt) {
  const blocked = blockedEdges(state);
  // Ordine stabile per ID: due arrivi nello stesso passo non sprecano capacità.
  for (const agent of [...state.agents].sort((a, b) => a.id - b.id)) {
    if (agent.capacity <= 0) continue;
    let target = state.fractures.find(f => f.id === agent.targetId);
    if (!target || target.status !== 'active' || agent.revision !== state.mapRevision) {
      const preferred = target?.status === 'active' && !agent.visited.includes(target.id) ? target.id : null;
      if (!assignTarget(state, agent, preferred)) assignTarget(state, agent);
      target = state.fractures.find(f => f.id === agent.targetId);
    }
    let travel = state.config.agent.speed * speedFactor(state,agent) * dt;
    while (agent.to || agent.route.length) {
      if (!agent.to) {
        const next = agent.route[0], edge = edgeBetween(state.map, agent.node, next);
        if (!edge || blocked.has(edge.id)) { assignTarget(state, agent); break; }
        agent.to = agent.route.shift(); agent.edgeProgress = 0;
      }
      const from = nodeAt(state.map, agent.node), to = nodeAt(state.map, agent.to);
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const move = Math.min(travel, length - agent.edgeProgress);
      agent.edgeProgress += move; travel -= move;
      const t = agent.edgeProgress / length;
      agent.x = from.x + (to.x - from.x) * t; agent.y = from.y + (to.y - from.y) * t;
      if (agent.edgeProgress >= length - 1e-7) { agent.node = agent.to; agent.to = null; agent.edgeProgress = 0; }
      else break;
      if (travel <= 0) break;
    }
    target = state.fractures.find(f => f.id === agent.targetId);
    if (target?.status === 'active' && !agent.to && !agent.route.length) {
      agent.working += dt;
      if (agent.working + 1e-8 >= state.config.agent.interventionSeconds) {
        contribute(state, agent, target); assignTarget(state, agent);
      }
    }
  }
  state.agents = state.agents.filter(a => a.capacity > 0);
}
