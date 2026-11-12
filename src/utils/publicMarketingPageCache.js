import { getPublicMarketingPage } from '../api/public.js';
import { seedBrandTypographyCache } from './marketingBrandTypography.js';

const CACHE_TTL_MS = 60_000;
const pageCache = new Map();
const inflight = new Map();

function cacheKey(slug, utm = {}) {
  const params = new URLSearchParams();
  if (utm.creativeId) params.set('cr', utm.creativeId);
  if (utm.utmSource) params.set('utm_source', utm.utmSource);
  if (utm.utmMedium) params.set('utm_medium', utm.utmMedium);
  if (utm.utmCampaign) params.set('utm_campaign', utm.utmCampaign);
  if (utm.utmContent) params.set('utm_content', utm.utmContent);
  if (utm.utmTerm) params.set('utm_term', utm.utmTerm);
  const query = params.toString();
  return query ? `${slug}?${query}` : slug;
}

export function getPublicMarketingPageCached(slug, utm = {}) {
  const key = cacheKey(slug, utm);
  const cached = pageCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = getPublicMarketingPage(slug, utm)
    .then((data) => {
      if (data?.brandTypography) {
        seedBrandTypographyCache(data.brandTypography);
      }
      pageCache.set(key, { data, at: Date.now() });
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}
