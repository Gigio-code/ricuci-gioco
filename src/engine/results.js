import { isConsequenceActive } from './consequences.js';
export function calculateResults(state) {
  const total = state.fractures.length;
  const repaired = state.fractures.filter(f => f.progress >= f.required).length;
  const partial = state.fractures.filter(f => f.progress > 0 && f.progress < f.required).length;
  const unresolved = total - repaired - partial;
  const partialExpired = state.fractures.filter(f => f.expired && f.progress > 0 && f.progress < f.required).length;
  const work = state.fractures.reduce((sum, f) => sum + f.progress, 0);
  const possible = state.fractures.reduce((sum, f) => sum + f.required, 0);
  const workPercent = possible ? work / possible * 100 : 0;
  const passed = total > 0 && workPercent >= state.config.recognitionPercent;
  const outcome = passed ? 'recognition' : workPercent >= state.config.goodPercent ? 'good' : 'retry';
  return { total, repaired, partial, unresolved, partialExpired, work, workPercent, passed, outcome, level: state.level.id, spawnStats: { ...state.spawnStats }, consequenceStats: state.level.consequences ? { ...state.consequenceStats, active:state.fractures.filter(f=>isConsequenceActive(state,f)).length } : null,
    fractures: state.fractures.map(f => ({ id: f.id, type: f.type, progress: f.progress, required: f.required, expired: f.expired, status: f.status })) };
}
