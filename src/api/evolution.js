import { fetchApi } from './client.js';

export function fetchEvolutionOverview() {
  return fetchApi('/api/admin/evolution/instances/overview');
}

export function fetchEvolutionConnectionStatus() {
  return fetchApi('/api/admin/evolution/instances/status');
}

export function fetchEvolutionInstances(all = true) {
  const query = all ? '?all=1' : '';
  return fetchApi(`/api/admin/evolution/instances${query}`);
}

export function createEvolutionInstance(body) {
  return fetchApi('/api/admin/evolution/instances', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateEvolutionInstance(id, body) {
  return fetchApi(`/api/admin/evolution/instances/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteEvolutionInstance(id) {
  return fetchApi(`/api/admin/evolution/instances/${id}`, {
    method: 'DELETE',
  });
}

export function testEvolutionPlatformConnection() {
  return fetchApi('/api/admin/evolution/instances/test-platform', {
    method: 'POST',
  });
}

export function testEvolutionConnection(id) {
  return fetchApi(`/api/admin/evolution/instances/${id}/test-connection`, {
    method: 'POST',
  });
}

export function refreshEvolutionConnection(id) {
  return fetchApi(`/api/admin/evolution/instances/${id}/refresh-connection`, {
    method: 'POST',
  });
}

export function connectEvolutionInstance(id) {
  return fetchApi(`/api/admin/evolution/instances/${id}/connect`, {
    method: 'POST',
  });
}

export function fetchWhatsAppInboxThreads(instanceId) {
  const query = instanceId ? `?instanceId=${encodeURIComponent(instanceId)}` : '';
  return fetchApi(`/api/admin/evolution/inbox/threads${query}`);
}

export function fetchWhatsAppThreadMessages(instanceId, contactPhone, limit = 200) {
  return fetchApi(
    `/api/admin/evolution/inbox/threads/${encodeURIComponent(instanceId)}/${encodeURIComponent(contactPhone)}/messages?limit=${limit}`,
  );
}
