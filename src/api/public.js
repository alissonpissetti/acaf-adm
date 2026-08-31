import { apiUrl } from '../config.js';

async function parseErrorResponse(response) {
  let message = `API ${response.status}: ${response.statusText}`;
  try {
    const err = await response.json();
    if (err.message) message = err.message;
  } catch {
    /* ignore */
  }
  return message;
}

export async function fetchPublicApi(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return response.json();
}

export function getPublicMarketingPage(slug, utm = {}) {
  const params = new URLSearchParams();
  if (utm.utmSource) params.set('utm_source', utm.utmSource);
  if (utm.utmMedium) params.set('utm_medium', utm.utmMedium);
  if (utm.utmCampaign) params.set('utm_campaign', utm.utmCampaign);
  if (utm.utmContent) params.set('utm_content', utm.utmContent);
  if (utm.utmTerm) params.set('utm_term', utm.utmTerm);
  if (utm.creativeId) params.set('cr', utm.creativeId);
  const query = params.toString();
  return fetchPublicApi(
    `/api/public/marketing/pages/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`,
  );
}

export function recordPublicMarketingClick(slug, payload) {
  return fetchPublicApi(`/api/public/marketing/pages/${encodeURIComponent(slug)}/click`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitPublicMarketingPage(slug, payload) {
  return fetchPublicApi(`/api/public/marketing/pages/${encodeURIComponent(slug)}/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
