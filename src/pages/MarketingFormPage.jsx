import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { getPublicMarketingPage, submitPublicMarketingPage } from '../api/public.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import {
  buildButtonRadius,
  buildPageBackgroundStyle,
  DEFAULT_MARKETING_THEME,
} from '../utils/marketingFormBuilder.js';
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
          placeholder={field.placeholder || 'Sua resposta'}
          onChange={(ev) => onChange(ev.target.value)}
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
    setLoading(true);
    setError('');
    setSuccess('');
    getPublicMarketingPage(slug, utmFromUrl)
      .then((result) => {
        setPage(result);
        const initial = {};
        (result.fields ?? [])
          .filter((field) => field.kind !== 'section')
          .forEach((field) => {
            initial[field.key] = '';
          });
        setValues(initial);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await submitPublicMarketingPage(slug, {
        data: values,
        ...utm,
      });
      setSuccess(result.thankYouMessage || 'Recebemos seus dados. Em breve entraremos em contato.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppLoadingPanel label="Carregando formulário…" />;

  if (error && !page) {
    return (
      <div className="marketing-public-page" style={buildPageBackgroundStyle()}>
        <div className="marketing-public-card">
          <CrudAlerts error={error} />
        </div>
      </div>
    );
  }

  const buttonRadius = buildButtonRadius(theme.buttonStyle);

  return (
    <div className="marketing-public-page" style={buildPageBackgroundStyle(theme)}>
      <div
        className="marketing-public-card marketing-public-card-themed"
        style={{
          backgroundColor: theme.cardColor,
          color: theme.cardTextColor,
          fontFamily: theme.fontFamily,
        }}
      >
        {page.coverImageUrl ? (
          <div
            className="marketing-public-cover"
            style={{ backgroundImage: `url(${page.coverImageUrl})` }}
          />
        ) : null}

        <div className="marketing-public-card-body">
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
