import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { submitPublicMarketingPage } from '../api/public.js';
import { MarketingFormSkeleton } from '../components/MarketingFormSkeleton.jsx';
import { getPublicMarketingPageCached } from '../utils/publicMarketingPageCache.js';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import {
  buildButtonRadius,
  buildPageBackgroundStyle,
  DEFAULT_MARKETING_THEME,
  isMarketingPhoneField,
  MARKETING_PHONE_PLACEHOLDER,
} from '../utils/marketingFormBuilder.js';
import { formatMobilePhoneInput, normalizeMobilePhone } from '../utils/person.js';
import { useMarketingBrandTypography } from '../hooks/useMarketingBrandTypography.js';
import { injectBrandFontFaces, resolveMarketingFontFamily } from '../utils/marketingBrandTypography.js';
import '../styles/marketing.css';

function readUtm(searchParams, creative) {
  const creativeId = searchParams.get('cr') || creative?.id || undefined;
  return {
    creativeId,
    utmSource: searchParams.get('utm_source') || creative?.utmSource || undefined,
    utmMedium: searchParams.get('utm_medium') || creative?.utmMedium || undefined,
    utmCampaign: searchParams.get('utm_campaign') || creative?.utmCampaign || undefined,
    utmContent: searchParams.get('utm_content') || creative?.utmContent || undefined,
    utmTerm: searchParams.get('utm_term') || creative?.utmTerm || undefined,
  };
}

function PublicField({ field, value, onChange }) {
  if (field.kind === 'section') {
    return (
      <div
        className={`marketing-public-section${field.sectionStyle === 'highlight' ? ' is-highlight' : ''}`}
      >
        {field.label}
      </div>
    );
  }

  return (
    <label className="marketing-public-field">
      <span className="marketing-public-field-label">
        {field.label}
        {field.required ? ' *' : ''}
      </span>
      {field.description ? <small className="marketing-public-field-help">{field.description}</small> : null}
      {field.type === 'textarea' ? (
        <textarea
          rows={4}
          value={value}
          placeholder={field.placeholder || 'Sua resposta'}
          onChange={(ev) => onChange(ev.target.value)}
          required={Boolean(field.required)}
        />
      ) : (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
          value={value}
          placeholder={
            field.placeholder ||
            (isMarketingPhoneField(field) ? MARKETING_PHONE_PLACEHOLDER : 'Sua resposta')
          }
          inputMode={field.type === 'tel' ? 'tel' : undefined}
          autoComplete={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : undefined}
          onChange={(ev) =>
            onChange(
              isMarketingPhoneField(field) ? formatMobilePhoneInput(ev.target.value) : ev.target.value,
            )
          }
          required={Boolean(field.required)}
        />
      )}
    </label>
  );
}

export function MarketingFormPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const utmFromUrl = useMemo(() => readUtm(searchParams, null), [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setSuccess('');

    getPublicMarketingPageCached(slug, utmFromUrl)
      .then((result) => {
        if (cancelled) return;
        if (result.brandTypography) {
          injectBrandFontFaces(result.brandTypography);
        }
        setPage(result);
        const initial = {};
        (result.fields ?? [])
          .filter((field) => field.kind !== 'section')
          .forEach((field) => {
            initial[field.key] = '';
          });
        setValues(initial);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    slug,
    utmFromUrl.creativeId,
    utmFromUrl.utmSource,
    utmFromUrl.utmMedium,
    utmFromUrl.utmCampaign,
    utmFromUrl.utmContent,
    utmFromUrl.utmTerm,
  ]);

  const utm = useMemo(
    () => readUtm(searchParams, page?.creative),
    [searchParams, page?.creative],
  );

  const theme = useMemo(
    () => ({
      ...DEFAULT_MARKETING_THEME,
      ...(page?.theme ?? {}),
      buttonColor: page?.theme?.buttonColor ?? page?.primaryColor ?? DEFAULT_MARKETING_THEME.buttonColor,
    }),
    [page],
  );

  const hookTypography = useMarketingBrandTypography(page ? theme.fontFamily : null);
  const brandTypography = page?.brandTypography ?? hookTypography;
  const resolvedFontFamily = resolveMarketingFontFamily(theme.fontFamily, brandTypography);
  const buttonRadius = buildButtonRadius(theme.buttonStyle);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = { ...values };
      (page?.fields ?? []).forEach((field) => {
        if (isMarketingPhoneField(field) && data[field.key]) {
          data[field.key] = normalizeMobilePhone(data[field.key]);
        }
      });
      const result = await submitPublicMarketingPage(slug, {
        data,
        ...utm,
      });
      setSuccess(result.thankYouMessage || 'Recebemos seus dados. Em breve entraremos em contato.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <MarketingFormSkeleton />;

  if (error && !page) {
    return (
      <div className="marketing-public-page" style={buildPageBackgroundStyle()}>
        <div className="marketing-public-card">
          <CrudAlerts error={error} />
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="marketing-public-page" style={buildPageBackgroundStyle()}>
        <div className="marketing-public-card">
          <CrudAlerts error={error || 'Formulário indisponível.'} />
        </div>
      </div>
    );
  }

  return (
    <div className="marketing-public-page" style={buildPageBackgroundStyle(theme)}>
      <div
        className="marketing-landing-card marketing-public-card marketing-public-card-themed"
        style={{
          backgroundColor: theme.cardColor,
          color: theme.cardTextColor,
          fontFamily: resolvedFontFamily,
        }}
      >
        {page.coverImageUrl ? (
          <div
            className="marketing-landing-cover"
            style={{ backgroundImage: `url(${page.coverImageUrl})` }}
            role="img"
            aria-hidden="true"
          />
        ) : null}

        <div className="marketing-landing-card-body">
          {success ? (
            <div className="marketing-public-success">
              <h1>Obrigado!</h1>
              <p>{success}</p>
            </div>
          ) : (
            <>
              {page.logoUrl ? <img src={page.logoUrl} alt="" className="marketing-public-logo" /> : null}

              {!theme.hideHeadline && page.headline ? <h1>{page.headline}</h1> : null}
              {!theme.hideDescription && page.description ? <p>{page.description}</p> : null}

              <CrudAlerts error={error} />

              <form className="marketing-public-form" onSubmit={onSubmit}>
                {(page.fields ?? []).map((field, index) => (
                  <PublicField
                    key={`${field.key}-${index}`}
                    field={field}
                    value={values[field.key] ?? ''}
                    onChange={(nextValue) => setValues({ ...values, [field.key]: nextValue })}
                  />
                ))}
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    backgroundColor: theme.buttonColor,
                    color: theme.buttonTextColor,
                    borderRadius: buttonRadius,
                  }}
                >
                  {busy ? 'Enviando…' : 'Enviar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
