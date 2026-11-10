import { fetchApi } from './client.js';

export function fetchChangelog({
  limit = 40,
  offset = 0,
  area = '',
  category = '',
  audience = 'internal',
  q = '',
} = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  params.set('audience', audience);
  if (area) params.set('area', area);
  if (category) params.set('category', category);
  if (q.trim()) params.set('q', q.trim());
  return fetchApi(`/api/admin/changelog?${params.toString()}`);
}

export function syncChangelogFromGit() {
  return fetchApi('/api/admin/changelog/sync', { method: 'POST' });
}
