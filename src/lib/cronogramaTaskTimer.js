const STORAGE_KEY = 'acaf_cronograma_active_timer';

export function readActiveTimer(taskId) {
  if (!taskId) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.taskId !== taskId) return null;
    if (typeof parsed.startedAt !== 'number' || typeof parsed.baseSeconds !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeActiveTimer({ taskId, startedAt, baseSeconds }) {
  if (!taskId) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        taskId,
        startedAt,
        baseSeconds: Math.max(0, Math.floor(baseSeconds)),
      }),
    );
  } catch {
    /* ignore quota */
  }
}

export function clearActiveTimer(taskId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!taskId || parsed?.taskId === taskId) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function computeRunningTotal(baseSeconds, startedAt) {
  const base = Math.max(0, Math.floor(baseSeconds ?? 0));
  if (!startedAt) return base;
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  return base + Math.max(0, elapsed);
}