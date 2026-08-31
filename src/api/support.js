import { fetchApi } from './client.js';

export function fetchSupportCatalog() {
  return fetchApi('/api/admin/support/catalog');
}

export function fetchSupportStats(options = {}) {
  const params = new URLSearchParams();
  if (options.queue) params.set('queue', options.queue);
  const query = params.toString();
  return fetchApi(`/api/admin/support/stats${query ? `?${query}` : ''}`);
}

export function fetchSupportTickets(options = {}) {
  const params = new URLSearchParams();
  if (options.mineOnly === false) params.set('mineOnly', '0');
  if (options.queue) params.set('queue', options.queue);
  if (options.status) params.set('status', options.status);
  if (options.priority) params.set('priority', options.priority);
  if (options.source) params.set('source', options.source);
  if (options.assignedToMe) params.set('assignedToMe', '1');
  if (options.openOnly) params.set('openOnly', '1');
  if (options.q) params.set('q', options.q);
  if (options.sort) params.set('sort', options.sort);
  if (options.limit != null) params.set('limit', String(options.limit));
  if (options.offset != null) params.set('offset', String(options.offset));

  const query = params.toString();
  return fetchApi(`/api/admin/support/tickets${query ? `?${query}` : ''}`);
}

export function fetchSupportTicket(id) {
  return fetchApi(`/api/admin/support/tickets/${id}`);
}

export function createSupportTicket(payload) {
  return fetchApi('/api/admin/support/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function addSupportTicketMessage(id, payload) {
  return fetchApi(`/api/admin/support/tickets/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSupportTicket(id, payload) {
  return fetchApi(`/api/admin/support/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
