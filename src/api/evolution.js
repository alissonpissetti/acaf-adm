import { apiUrl } from '../config.js';
import { clearToken, getToken } from './auth.js';
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

export function syncEvolutionInbox(id) {
  return fetchApi(`/api/admin/evolution/instances/${encodeURIComponent(id)}/sync-inbox`, {
    method: 'POST',
  });
}

export function syncEvolutionAvatars(id) {
  return fetchApi(`/api/admin/evolution/instances/${encodeURIComponent(id)}/sync-avatars`, {
    method: 'POST',
  });
}

export function syncEvolutionMedia(id) {
  return fetchApi(`/api/admin/evolution/instances/${encodeURIComponent(id)}/sync-media`, {
    method: 'POST',
  });
}

export function fetchWhatsAppInboxThreads(instanceId) {
  const query = instanceId ? `?instanceId=${encodeURIComponent(instanceId)}` : '';
  return fetchApi(`/api/admin/evolution/inbox/threads${query}`);
}

export function fetchWhatsAppThreadMessages(instanceId, contactPhone, limit = 300) {
  const phone = String(contactPhone ?? '').trim();
  const instance = String(instanceId ?? '').trim();
  if (!instance || !phone) {
    return Promise.reject(new Error('Conversa inválida (contato sem identificação).'));
  }
  return fetchApi(
    `/api/admin/evolution/inbox/threads/${encodeURIComponent(instance)}/${encodeURIComponent(phone)}/messages?limit=${limit}`,
  );
}

export async function fetchWhatsAppContactAvatarBlob(instanceId, contactPhone) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(
    apiUrl(
      `/api/admin/evolution/inbox/threads/${encodeURIComponent(instanceId)}/${encodeURIComponent(contactPhone)}/avatar`,
    ),
    { headers },
  );

  if (response.status === 401) {
    clearToken();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) {
    throw new Error(`Avatar indisponível (${response.status})`);
  }

  return response.blob();
}

export async function fetchWhatsAppMessageMediaBlob(messageId) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(
    apiUrl(`/api/admin/evolution/inbox/messages/${encodeURIComponent(messageId)}/media`),
    { headers },
  );

  if (response.status === 401) {
    clearToken();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) {
    let message = `API ${response.status}`;
    try {
      const err = await response.json();
      if (err.message) message = err.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return response.blob();
}
