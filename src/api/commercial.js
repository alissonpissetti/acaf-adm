import { fetchApi } from './client.js';

export function getCommercialFunnels(all = false) {
  return fetchApi(`/api/admin/commercial/funnels${all ? '?all=1' : ''}`);
}

export function getCommercialFunnelOptions() {
  return fetchApi('/api/admin/commercial/funnels/options');
}

export function getCommercialFunnel(id) {
  return fetchApi(`/api/admin/commercial/funnels/${id}`);
}

export function createCommercialFunnel(payload) {
  return fetchApi('/api/admin/commercial/funnels', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCommercialFunnel(id, payload) {
  return fetchApi(`/api/admin/commercial/funnels/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deactivateCommercialFunnel(id) {
  return fetchApi(`/api/admin/commercial/funnels/${id}`, {
    method: 'DELETE',
  });
}

export function getCommercialLeads(filters = {}) {
  const params = new URLSearchParams();
  if (filters.funnelId) params.set('funnelId', filters.funnelId);
  if (filters.ownerUserId) params.set('ownerUserId', filters.ownerUserId);
  if (filters.type) params.set('type', filters.type);
  const query = params.toString();
  return fetchApi(`/api/admin/commercial/leads${query ? `?${query}` : ''}`);
}

export function getCommercialLead(id) {
  return fetchApi(`/api/admin/commercial/leads/${id}`);
}

export function createCommercialLead(payload) {
  return fetchApi('/api/admin/commercial/leads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCommercialLead(id, payload) {
  return fetchApi(`/api/admin/commercial/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function convertCommercialLead(id) {
  return fetchApi(`/api/admin/commercial/leads/${id}/convert`, {
    method: 'POST',
  });
}

export function recordCommercialLeadInteraction(id, kind) {
  return fetchApi(`/api/admin/commercial/leads/${id}/interaction`, {
    method: 'POST',
    body: JSON.stringify(kind ? { kind } : {}),
  });
}

export function getCommercialLeadInteractions(leadId) {
  return fetchApi(`/api/admin/commercial/leads/${leadId}/interactions`);
}

export function addCommercialLeadInteraction(leadId, content) {
  return fetchApi(`/api/admin/commercial/leads/${leadId}/interactions`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
