import {
  fetchWhatsAppAvatarsBatch,
  fetchWhatsAppContactAvatarBlob,
} from '../api/evolution.js';

const AVATAR_MAX_CONCURRENT = 4;
const objectUrlCache = new Map();
const missKeys = new Set();
const listeners = new Set();

let queueActive = 0;
const queueWaiting = [];

function notifyAvatarCache() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

export function whatsAppAvatarCacheKey(instanceId, contactPhone) {
  return `${String(instanceId ?? '').trim()}:${String(contactPhone ?? '').trim()}`;
}

export function getCachedWhatsAppAvatarSrc(key) {
  return objectUrlCache.get(key) ?? '';
}

export function isWhatsAppAvatarMiss(key) {
  return missKeys.has(key);
}

export function subscribeWhatsAppAvatarCache(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function storeBlob(key, blob) {
  const prev = objectUrlCache.get(key);
  if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(key, url);
  notifyAvatarCache();
  return url;
}

function storeDataUrl(key, dataUrl) {
  const prev = objectUrlCache.get(key);
  if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
  objectUrlCache.set(key, dataUrl);
  notifyAvatarCache();
  return dataUrl;
}

function pumpAvatarQueue() {
  while (queueActive < AVATAR_MAX_CONCURRENT && queueWaiting.length) {
    const job = queueWaiting.shift();
    if (!job) break;
    queueActive += 1;
    void fetchWhatsAppContactAvatarBlob(job.instanceId, job.contactPhone)
      .then((blob) => {
        storeBlob(job.key, blob);
        job.resolve(objectUrlCache.get(job.key));
      })
      .catch(() => {
        missKeys.add(job.key);
        job.resolve('');
      })
      .finally(() => {
        queueActive -= 1;
        pumpAvatarQueue();
      });
  }
}

export function loadWhatsAppAvatarQueued(instanceId, contactPhone) {
  const key = whatsAppAvatarCacheKey(instanceId, contactPhone);
  const cached = getCachedWhatsAppAvatarSrc(key);
  if (cached) return Promise.resolve(cached);
  if (missKeys.has(key)) return Promise.resolve('');

  return new Promise((resolve) => {
    queueWaiting.push({ key, instanceId, contactPhone, resolve });
    pumpAvatarQueue();
  });
}

let prefetchTimer = null;

export function prefetchWhatsAppAvatars(threads) {
  if (prefetchTimer) window.clearTimeout(prefetchTimer);
  prefetchTimer = window.setTimeout(() => {
    prefetchTimer = null;
    void runAvatarPrefetch(threads);
  }, 120);
}

async function runAvatarPrefetch(threads) {
  const batchPayload = [];
  const seen = new Set();
  for (const thread of threads ?? []) {
    if (!thread?.avatarUrl || String(thread.avatarUrl).startsWith('http')) continue;
    if (!thread.instanceId || !thread.contactPhone) continue;
    const key = whatsAppAvatarCacheKey(thread.instanceId, thread.contactPhone);
    if (seen.has(key)) continue;
    if (objectUrlCache.has(key) || missKeys.has(key)) continue;
    seen.add(key);
    batchPayload.push({
      instanceId: thread.instanceId,
      contactPhone: thread.contactPhone,
    });
    if (batchPayload.length >= 48) break;
  }
  if (!batchPayload.length) return;

  try {
    const payload = await fetchWhatsAppAvatarsBatch(batchPayload);
    for (const row of payload?.items ?? []) {
      const threadKey = String(row?.threadKey ?? '').trim();
      if (!threadKey) continue;
      if (row.missing) {
        missKeys.add(threadKey);
        continue;
      }
      if (row.base64 && row.mime) {
        storeDataUrl(threadKey, `data:${row.mime};base64,${row.base64}`);
      }
    }
    notifyAvatarCache();
  } catch {
    /* lista segue com fallbacks e fila unitária */
  }
}
