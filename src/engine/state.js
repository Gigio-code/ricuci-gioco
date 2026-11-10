import { CONFIG, LEVELS, defaultDeckFor } from '../config.js';
import { AGENTS } from '../catalog/agents.js';
import { createNetwork } from '../map/network.js';
export function randomGenerator(seed) {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function createState({ level = 1, deck = null, seed = Date.now(), config = {}, map = createNetwork() } = {}) {
  const settings = { ...CONFIG, ...config, energy: { ...CONFIG.energy, ...config.energy }, agent: { ...CONFIG.agent, ...config.agent }, fracture: { ...CONFIG.fracture, ...config.fracture }, deck: { ...CONFIG.deck, ...config.deck } };
  if (!LEVELS[level]) throw new Error('Livello non disponibile');
  const formation = LEVELS[level];
  settings.duration = config.duration ?? formation.duration;
  settings.energy = { ...settings.energy, max: config.energy?.max ?? formation.energyMax, secondsPerPoint: config.energy?.secondsPerPoint ?? formation.secondsPerPoint };
  settings.energy.initial = Math.min(settings.energy.initial, settings.energy.max);
  settings.deck = { ...settings.deck, size: formation.deckSize };
  deck = deck ?? defaultDeckFor(level);
  if (deck.length !== formation.deckSize || new Set(deck).size !== deck.length || deck.some(id => !AGENTS[id] || !formation.agents.includes(id))) throw new Error(`Scegli ${formation.deckSize} agenti diversi tra quelli disponibili per questa formazione`);
  if (formation.agents.length === formation.deckSize && formation.agents.some(id => !deck.includes(id))) throw new Error('Il mazzo di questa formazione è fisso');
  return { phase: 'ready', time: 0, config: settings, level: { ...LEVELS[level] }, seed, random: randomGenerator(seed), map,
    hand: deck.slice(0, settings.deck.handSize), queue: deck.slice(settings.deck.handSize), deck: [...deck], energy: settings.energy.initial,
    fractures: [], agents: [], events: [], consequenceStats: { secondary: 0, prevented: 0 }, spawnStats: { scheduled: 0, generated: 0, skippedCapacity: 0, skippedNoRoute: 0 }, nextSpawn: 0, nextFractureId: 1, nextAgentId: 1, mapRevision: 0, result: null };
}
export function logEvent(state, text) {
  state.events.unshift({ time: state.time, text });
  state.events.length = Math.min(state.events.length, 6);
}
