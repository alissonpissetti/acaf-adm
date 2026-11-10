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

export function fetchWhatsAppInboxInstances() {
  return fetchApi('/api/admin/evolution/inbox/instances');
}

export function fetchWhatsAppInboxThreads(instanceId, options = {}) {
  const params = new URLSearchParams();
  if (instanceId) params.set('instanceId', String(instanceId));
  if (options.view) params.set('view', String(options.view));
  if (options.light) params.set('light', '1');
  if (options.limit != null) params.set('limit', String(options.limit));
  if (options.offset != null) params.set('offset', String(options.offset));
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchApi(`/api/admin/evolution/inbox/threads${query}`);
}

export function setWhatsAppThreadArchived(instanceId, contactPhone, archive = true) {
  const phone = String(contactPhone ?? '').trim();
  const instance = String(instanceId ?? '').trim();
  if (!instance || !phone) {
    return Promise.reject(new Error('Conversa inválida.'));
  }
  const segment = archive ? 'archive' : 'unarchive';
  return fetchApi(
    `/api/admin/evolution/inbox/threads/${encodeURIComponent(instance)}/${encodeURIComponent(phone)}/${segment}`,
    {
      method: 'POST',
      body: JSON.stringify({ archive, syncWhatsApp: true }),
    },
  );
}

export function fetchYouTubeLinkPreview(url) {
  const raw = String(url ?? '').trim();
  if (!raw) {
    return Promise.reject(new Error('Link inválido.'));
  }
  return fetchApi(
    `/api/admin/evolution/inbox/link-preview/youtube?url=${encodeURIComponent(raw)}`,
  );
}

export function markWhatsAppThreadRead(instanceId, contactPhone) {
  const phone = String(contactPhone ?? '').trim();
  const instance = String(instanceId ?? '').trim();
  if (!instance || !phone) {
    return Promise.reject(new Error('Conversa inválida.'));
  }
  return fetchApi(
    `/api/admin/evolution/inbox/threads/${encodeURIComponent(instance)}/${encodeURIComponent(phone)}/read`,
    { method: 'POST' },
  );
}

export function fetchWhatsAppThreadMessages(instanceId, contactPhone, options = {}) {
  const phone = String(contactPhone ?? '').trim();
  const instance = String(instanceId ?? '').trim();
  if (!instance || !phone) {
    return Promise.reject(new Error('Conversa inválida (contato sem identificação).'));
  }
  const params = new URLSearchParams();
  params.set('limit', String(options.limit ?? 300));
  if (options.syncRemote === true) params.set('remote', '1');
  else if (options.syncRemote === false) params.set('remote', '0');
  return fetchApi(
    `/api/admin/evolution/inbox/threads/${encodeURIComponent(instance)}/${encodeURIComponent(phone)}/messages?${params.toString()}`,
  );
}

export function fetchWhatsAppAvatarsBatch(items) {
  return fetchApi('/api/admin/evolution/inbox/avatars/batch', {
    method: 'POST',
    body: JSON.stringify({ items: items ?? [] }),
  });
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
