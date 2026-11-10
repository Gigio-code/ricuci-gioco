import { interventionFactor } from './consequences.js';
import { EFFICACY } from '../catalog/efficacy.js';
import { AGENTS } from '../catalog/agents.js';
import { CONFLICTS } from '../catalog/conflicts.js';
import { logEvent } from './state.js';
export function contribute(state, agent, fracture) {
  if (fracture.status !== 'active' || agent.visited.includes(fracture.id) || agent.capacity <= 0) return 0;
  const amount = Math.min(agent.capacity, Math.floor(EFFICACY[fracture.type][agent.type] * interventionFactor(state,fracture)), fracture.required - fracture.progress);
  if (amount <= 0) return 0;
  fracture.progress += amount; agent.capacity -= amount; agent.visited.push(fracture.id);
  fracture.contributions.push({ agentId: agent.id, type: agent.type, amount, time: state.time });
  agent.lastContribution = { amount, until: state.time + 2 };
  logEvent(state, `${AGENTS[agent.type].name} +${amount} su ${CONFLICTS[fracture.type].name}. Capacità: ${agent.capacity}.`);
  if (fracture.progress >= fracture.required) {
    fracture.status = 'repaired'; fracture.completedAt = state.time; state.mapRevision++;
    logEvent(state, `${CONFLICTS[fracture.type].name} ricucita. La strada è di nuovo aperta.`);
  }
  return amount;
}
