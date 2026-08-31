export function buildMarketingFormPath(slug, utm = {}) {
  const params = new URLSearchParams();
  if (utm.utmSource) params.set('utm_source', utm.utmSource);
  if (utm.utmMedium) params.set('utm_medium', utm.utmMedium);
  if (utm.utmCampaign) params.set('utm_campaign', utm.utmCampaign);
  if (utm.utmContent) params.set('utm_content', utm.utmContent);
  if (utm.utmTerm) params.set('utm_term', utm.utmTerm);
  if (utm.creativeId) params.set('cr', utm.creativeId);

  const query = params.toString();
  return query ? `/f/${slug}?${query}` : `/f/${slug}`;
}

export function buildMarketingClickPath(slug, utm = {}) {
  const params = new URLSearchParams();
  if (utm.utmSource) params.set('utm_source', utm.utmSource);
  if (utm.utmMedium) params.set('utm_medium', utm.utmMedium);
  if (utm.utmCampaign) params.set('utm_campaign', utm.utmCampaign);
  if (utm.utmContent) params.set('utm_content', utm.utmContent);
  if (utm.utmTerm) params.set('utm_term', utm.utmTerm);
  if (utm.creativeId) params.set('cr', utm.creativeId);

  const query = params.toString();
  return query ? `/f/go/${slug}?${query}` : `/f/go/${slug}`;
}

export function buildMarketingFormUrl(slug, utm = {}, baseUrl = window.location.origin) {
  return `${String(baseUrl).replace(/\/$/, '')}${buildMarketingFormPath(slug, utm)}`;
}

export function buildMarketingClickUrl(slug, utm = {}, baseUrl = window.location.origin) {
  return `${String(baseUrl).replace(/\/$/, '')}${buildMarketingClickPath(slug, utm)}`;
}

export async function copyMarketingLink(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const SOCIAL_DISTRIBUTION_HINTS = [
  {
    id: 'instagram-bio',
    label: 'Instagram · link na bio',
    hint: 'Cole o link rastreado na bio ou use ferramenta de link na bio.',
  },
  {
    id: 'instagram-story',
    label: 'Instagram · story/reels',
    hint: 'Use o adesivo de link com a URL rastreada do criativo.',
  },
  {
    id: 'facebook',
    label: 'Facebook / Meta Ads',
    hint: 'Defina a URL de destino do anúncio ou botão com os UTMs do criativo.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    hint: 'Use a URL rastreada no botão “Saiba mais” ou descrição patrocinada.',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    hint: 'Coloque o link rastreado na bio ou campanha com objetivo de conversão.',
  },
];
