import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { recordPublicMarketingClick } from '../api/public.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';

export function MarketingGoPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const payload = {
      creativeId: searchParams.get('cr') || undefined,
      utmSource: searchParams.get('utm_source') || undefined,
      utmMedium: searchParams.get('utm_medium') || undefined,
      utmCampaign: searchParams.get('utm_campaign') || undefined,
      utmContent: searchParams.get('utm_content') || undefined,
      utmTerm: searchParams.get('utm_term') || undefined,
    };

    recordPublicMarketingClick(slug, payload)
      .catch(() => null)
      .finally(() => {
        const query = searchParams.toString();
        navigate(query ? `/f/${slug}?${query}` : `/f/${slug}`, { replace: true });
      });
  }, [navigate, searchParams, slug]);

  return <AppLoadingPanel label="Redirecionando…" />;
}
