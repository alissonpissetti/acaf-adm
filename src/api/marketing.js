import { fetchApi, fetchApiUpload } from './client.js';

export function getMarketingDashboard() {
  return fetchApi('/api/admin/marketing/dashboard');
}

export function getMarketingCampaigns(all = false) {
  return fetchApi(`/api/admin/marketing/campaigns${all ? '?all=1' : ''}`);
}

export function getMarketingCampaignOptions() {
  return fetchApi('/api/admin/marketing/campaigns/options');
}

export function getMarketingCampaign(id) {
  return fetchApi(`/api/admin/marketing/campaigns/${id}`);
}

export function createMarketingCampaign(payload) {
  return fetchApi('/api/admin/marketing/campaigns', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateMarketingCampaign(id, payload) {
  return fetchApi(`/api/admin/marketing/campaigns/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deactivateMarketingCampaign(id) {
  return fetchApi(`/api/admin/marketing/campaigns/${id}`, {
    method: 'DELETE',
  });
}

export function createMarketingCreative(campaignId, payload) {
  return fetchApi(`/api/admin/marketing/campaigns/${campaignId}/creatives`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateMarketingCreative(campaignId, creativeId, payload) {
  return fetchApi(`/api/admin/marketing/campaigns/${campaignId}/creatives/${creativeId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deactivateMarketingCreative(campaignId, creativeId) {
  return fetchApi(`/api/admin/marketing/campaigns/${campaignId}/creatives/${creativeId}`, {
    method: 'DELETE',
  });
}

export function getMarketingLandingPages(all = false) {
  return fetchApi(`/api/admin/marketing/landing-pages${all ? '?all=1' : ''}`);
}

export function getMarketingLandingPageOptions(campaignId) {
  const query = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
  return fetchApi(`/api/admin/marketing/landing-pages/options${query}`);
}

export function getMarketingLandingPage(id) {
  return fetchApi(`/api/admin/marketing/landing-pages/${id}`);
}

export function createMarketingLandingPage(payload) {
  return fetchApi('/api/admin/marketing/landing-pages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateMarketingLandingPage(id, payload) {
  return fetchApi(`/api/admin/marketing/landing-pages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deactivateMarketingLandingPage(id, { force = true } = {}) {
  const query = force ? '?force=1' : '?force=0';
  return fetchApi(`/api/admin/marketing/landing-pages/${encodeURIComponent(id)}${query}`, {
    method: 'DELETE',
  });
}

export function uploadMarketingLandingLogo(id, file) {
  const formData = new FormData();
  formData.append('image', file);
  return fetchApiUpload(`/api/admin/marketing/landing-pages/${id}/logo`, formData);
}

export function uploadMarketingLandingCover(id, file) {
  const formData = new FormData();
  formData.append('image', file);
  return fetchApiUpload(`/api/admin/marketing/landing-pages/${id}/cover`, formData);
}

export function getMarketingLandingPageMetrics(id, query = '') {
  return fetchApi(`/api/admin/marketing/landing-pages/${id}/metrics${query}`);
}

export function clearMarketingLandingPageMetrics(id) {
  return fetchApi(`/api/admin/marketing/landing-pages/${id}/metrics`, {
    method: 'DELETE',
  });
}
