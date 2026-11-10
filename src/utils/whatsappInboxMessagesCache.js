const CACHE_PREFIX = 'acaf-wa-inbox-messages:';
const CACHE_TTL_MS = 45 * 60_000;

export function whatsAppMessagesCacheKey(threadKey) {
  return String(threadKey ?? '').trim() || '__none__';
}

export function readWhatsAppMessagesCache(threadKey) {
  const key = whatsAppMessagesCacheKey(threadKey);
  if (key === '__none__') return null;
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    if (!Array.isArray(parsed.messages)) return null;
    return parsed.messages;
  } catch {
    return null;
  }
}

export function writeWhatsAppMessagesCache(threadKey, messages) {
  const key = whatsAppMessagesCacheKey(threadKey);
  if (key === '__none__' || !Array.isArray(messages)) return;
  try {
    sessionStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({
        messages,
        savedAt: Date.now(),
      }),
    );
  } catch {
    /* quota ou modo privado */
  }
}
