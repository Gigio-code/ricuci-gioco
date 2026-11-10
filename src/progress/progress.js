import { CONFIG, LEVELS, orderedLevels, nextLevelFor } from '../config.js';
// Contratto serializzabile e indipendente dal browser: un futuro adapter potrà usare un account.
export const PROGRESS_VERSION = 1;
export const STORAGE_KEY = 'ricuci.v03.progress.v1';
export function newProgress() { return { version: PROGRESS_VERSION, unlocked: 1, best: {}, medals: {} }; }
export function normalizeProgress(raw) {
  if (!raw || raw.version !== PROGRESS_VERSION) return newProgress();
  const progress = newProgress();
  const levels=orderedLevels();
  for (const [index, level] of levels.entries()) {
    const n=level.id;
    const value=Number(raw.best?.[n]);
    if (Number.isFinite(value) && value>=0 && value<=100) progress.best[n]=value;
    if (raw.medals?.[n] === true && progress.best[n] >= CONFIG.recognitionPercent && (index===0 || progress.medals[levels[index-1].id])) progress.medals[n]=true;
  }
  progress.unlocked=levels[0].id;
  for (const level of levels) { if (!progress.medals[level.id]) break; progress.unlocked=nextLevelFor(level.id)?.id ?? level.id; }
  return progress;
}
export function recordResult(current, result) {
  const progress=normalizeProgress(current), level=Number(result?.level);
  if (!Number.isInteger(level) || !LEVELS[level] || level > progress.unlocked || !Number.isFinite(result?.workPercent) || result.workPercent < 0 || result.workPercent > 100) return progress;
  progress.best[level]=Math.max(progress.best[level] ?? 0,result.workPercent);
  if(result.passed && result.workPercent>=CONFIG.recognitionPercent) progress.medals[level]=true;
  return normalizeProgress(progress);
}
// Adapter minimo: getItem/setItem per ora; lo stato puro può essere sincronizzato in futuro.
export function createProgressStore(storage) {
  return {
    load() { try { const raw=storage?.getItem(STORAGE_KEY); return {progress:raw?normalizeProgress(JSON.parse(raw)):newProgress(),persistent:!!storage}; } catch { return {progress:newProgress(),persistent:false}; } },
    save(progress) { try { if(!storage)return false;storage.setItem(STORAGE_KEY,JSON.stringify(normalizeProgress(progress)));return true; } catch { return false; } },
  };
}
