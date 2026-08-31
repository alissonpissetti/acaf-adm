import { fetchApi } from './client.js';

export function fetchNotifications(options = {}) {
  const params = new URLSearchParams();
  if (options.unreadOnly) params.set('unreadOnly', '1');
  if (options.limit != null) params.set('limit', String(options.limit));
  if (options.offset != null) params.set('offset', String(options.offset));

  const query = params.toString();
  return fetchApi(`/api/admin/notifications${query ? `?${query}` : ''}`);
}

export function fetchUnreadNotificationCount() {
  return fetchApi('/api/admin/notifications/unread-count');
}

export function markNotificationRead(id) {
  return fetchApi(`/api/admin/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return fetchApi('/api/admin/notifications/read-all', { method: 'POST' });
}

export function markManyNotificationsRead(ids) {
  return fetchApi('/api/admin/notifications/read-many', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function fetchNotificationTriggers() {
  return fetchApi('/api/admin/notifications/triggers');
}
