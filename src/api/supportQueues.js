import { fetchApi } from './client.js';

export function fetchSupportQueues(options = {}) {
  const params = new URLSearchParams();
  if (options.all) params.set('all', '1');
  const query = params.toString();
  return fetchApi(`/api/admin/support/queues${query ? `?${query}` : ''}`);
}

export function fetchSupportQueueCategories() {
  return fetchApi('/api/admin/support/queues/meta/categories');
}

export function fetchSupportQueue(id) {
  return fetchApi(`/api/admin/support/queues/${id}`);
}

export function createSupportQueue(payload) {
  return fetchApi('/api/admin/support/queues', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSupportQueue(id, payload) {
  return fetchApi(`/api/admin/support/queues/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
