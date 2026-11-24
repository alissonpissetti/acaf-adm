import { fetchApi, fetchApiUpload } from './client.js';

export function getSocialCalendar(params = {}) {
  const search = new URLSearchParams();
  if (params.filter && params.filter !== 'all') search.set('filter', params.filter);
  if (params.hidePublished) search.set('hidePublished', '1');
  const q = search.toString();
  return fetchApi(`/api/admin/social-posts${q ? `?${q}` : ''}`);
}

export function patchSocialPost(id, body) {
  return fetchApi(`/api/admin/social-posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function patchSocialPostFluxo(id, body) {
  return fetchApi(`/api/admin/social-posts/${id}/fluxo-publicacao`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function patchSocialPostManualCanal(id, rede, body) {
  return fetchApi(`/api/admin/social-posts/${id}/canais/${rede}/manual`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function patchSocialPostAprovacao(id, aprovacao) {
  return fetchApi(`/api/admin/social-posts/${id}/aprovacao`, {
    method: 'PATCH',
    body: JSON.stringify({ aprovacao }),
  });
}

export function uploadSocialPostArte(id, file) {
  const fd = new FormData();
  fd.append('file', file);
  return fetchApiUpload(`/api/admin/social-posts/${id}/artes`, fd);
}

export function removeSocialPostArte(id, arteId) {
  return fetchApi(`/api/admin/social-posts/${id}/artes/${arteId}`, { method: 'DELETE' });
}

function bufferQuery(opts = {}) {
  const params = new URLSearchParams();
  if (opts.rede) params.set('rede', opts.rede);
  if (opts.redes?.length) params.set('redes', opts.redes.join(','));
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function socialBufferDraft(id, opts) {
  return fetchApi(`/api/admin/social-posts/${id}/buffer/draft${bufferQuery(opts)}`, { method: 'POST' });
}

export function socialBufferSchedule(id, opts) {
  return fetchApi(`/api/admin/social-posts/${id}/buffer/schedule${bufferQuery(opts)}`, { method: 'POST' });
}

export function socialBufferPublishNow(id, opts) {
  return fetchApi(`/api/admin/social-posts/${id}/buffer/publish-now${bufferQuery(opts)}`, { method: 'POST' });
}

export function socialBufferSync(id, opts) {
  return fetchApi(`/api/admin/social-posts/${id}/buffer/sync${bufferQuery(opts)}`, { method: 'POST' });
}

export function socialBufferRemove(id, opts) {
  return fetchApi(`/api/admin/social-posts/${id}/buffer/remove${bufferQuery(opts)}`, { method: 'POST' });
}

export function socialBufferSyncAll() {
  return fetchApi('/api/admin/social-posts/buffer/sync-all', { method: 'POST' });
}

export function importSocialPostsSeed(force = false) {
  return fetchApi(`/api/admin/social-posts/seed/import${force ? '?force=1' : ''}`, { method: 'POST' });
}