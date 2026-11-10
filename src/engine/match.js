import { createState, logEvent } from './state.js';
import { generateFracture, updatePropagation } from './generator.js';
import { updateConsequences } from './consequences.js';
import { updateAgents } from './agents.js';
import { calculateResults } from './results.js';
function scheduledSpawn(state) {
  const stats = state.spawnStats;
  stats.scheduled++;
  if (state.fractures.filter(f => f.status === 'active').length >= state.level.maxActive) {
    stats.skippedCapacity++;
    logEvent(state, 'Evento programmato non generato: limite di fratture attive raggiunto.');
  } else if (generateFracture(state)) stats.generated++;
  else {
    stats.skippedNoRoute++;
    logEvent(state, 'Evento programmato non generato: nessuna strada disponibile e raggiungibile.');
  }
}
export function start(state) {
  if (state.phase !== 'ready') return;
  state.phase = 'playing';
  if (state.level.firstSpawn === undefined) { scheduledSpawn(state); state.nextSpawn = state.level.interval; }
  else state.nextSpawn = state.level.firstSpawn;
}
export function togglePause(state) {
  if (state.phase === 'playing') state.phase = 'paused';
  else if (state.phase === 'paused') state.phase = 'playing';
}
export function step(state, dt) {
  if (state.phase !== 'playing' || dt <= 0) return;
  dt = Math.min(dt, state.config.duration - state.time);
  state.time = Math.min(state.config.duration, state.time + dt);
  state.energy = Math.min(state.config.energy.max, state.energy + dt / state.config.energy.secondsPerPoint);
  for (const f of state.fractures) if (f.status === 'active' && state.time + 1e-8 >= f.expiresAt) {
    f.status = 'expired'; f.expired = true; state.mapRevision++;
    logEvent(state, `Frattura #${f.id}: tempo scaduto, lavoro conservato al ${Math.floor(f.progress/f.required*100)}%.`);
  }
  if (state.time + 1e-8 < state.config.duration && state.time + 1e-8 >= state.nextSpawn) {
    scheduledSpawn(state); state.nextSpawn += state.level.interval;
  }
  if (state.time + 1e-8 < state.config.duration) { if(state.level.consequences)updateConsequences(state); else updatePropagation(state); }
  updateAgents(state, dt);
  if (state.time + 1e-8 >= state.config.duration) {
    state.time = state.config.duration; state.phase = 'ended'; state.result = calculateResults(state);
  }
}
export class Match {
  constructor(options = {}) { this.state = createState(options); this.accumulator = 0; }
  advance(seconds) {
    if (this.state.phase !== 'playing') { this.accumulator = 0; return; }
    this.accumulator += Math.min(Math.max(0, seconds), this.state.config.maxFrame);
    const dt = this.state.config.fixedStep;
    while (this.accumulator + 1e-8 >= dt && this.state.phase === 'playing') { step(this.state, dt); this.accumulator -= dt; }
  }
}
