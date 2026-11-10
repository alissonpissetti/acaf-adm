const CACHE_PREFIX = 'acaf-wa-inbox-threads:';
const CACHE_TTL_MS = 90_000;

export const WHATSAPP_THREADS_PAGE_SIZE = 40;

export function whatsAppThreadsCacheKey(instanceId, view) {
  const inst = String(instanceId ?? '').trim() || '__all__';
  const listView = String(view ?? 'active').trim() || 'active';
  return `${inst}:${listView}`;
}

export function readWhatsAppThreadsCache(key) {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeWhatsAppThreadsCache(key, payload) {
  try {
    sessionStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      }),
    );
  } catch {
    /* quota ou modo privado */
  }
}

export function mergeWhatsAppThreadPages(prev, next) {
  const byKey = new Map((prev ?? []).map((thread) => [thread.threadKey, thread]));
  for (const thread of next ?? []) {
    if (!thread?.threadKey) continue;
    byKey.set(thread.threadKey, thread);
  }
  return [...byKey.values()].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

export function normalizeWhatsAppThreadsResponse(data) {
  if (Array.isArray(data)) {
    return {
      threads: data,
      hasMore: false,
      limit: data.length,
      offset: 0,
    };
  }
  return {
    threads: data?.threads ?? [],
    hasMore: Boolean(data?.hasMore),
    limit: Number(data?.limit) || WHATSAPP_THREADS_PAGE_SIZE,
    offset: Number(data?.offset) || 0,
  };
}
