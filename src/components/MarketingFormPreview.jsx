import {
  buildButtonRadius,
  buildPageBackgroundStyle,
  DEFAULT_MARKETING_THEME,
  isMarketingPhoneField,
  MARKETING_PHONE_PLACEHOLDER,
} from '../utils/marketingFormBuilder.js';
import { useMarketingBrandTypography } from '../hooks/useMarketingBrandTypography.js';
import { resolveMarketingFontFamily } from '../utils/marketingBrandTypography.js';

function PreviewField({ field }) {
  if (field.kind === 'section') {
    return (
      <div
        className={`marketing-preview-section${field.sectionStyle === 'highlight' ? ' is-highlight' : ''}`}
      >
        {field.label}
      </div>
    );
  }

  return (
    <label className="marketing-preview-field">
      <span className="marketing-preview-field-label">
        {field.label}
        {field.required ? ' *' : ''}
      </span>
      {field.description ? <p className="field-hint">{field.description}</p> : null}
      {field.type === 'textarea' ? (
        <div className="marketing-preview-input marketing-preview-textarea">Sua resposta</div>
      ) : (
        <div className="marketing-preview-input">
          {isMarketingPhoneField(field)
            ? field.placeholder?.trim() || MARKETING_PHONE_PLACEHOLDER
            : 'Sua resposta'}
        </div>
      )}
    </label>
  );
}

export function MarketingFormPreview({ form, publicPath, onOpenMetrics, brandTypography: brandTypographyProp }) {
  const theme = { ...DEFAULT_MARKETING_THEME, ...(form?.theme ?? {}) };
  const hookTypography = useMarketingBrandTypography(theme.fontFamily);
  const brandTypography = brandTypographyProp ?? hookTypography;
  const resolvedFontFamily = resolveMarketingFontFamily(theme.fontFamily, brandTypography);
  const buttonRadius = buildButtonRadius(theme.buttonStyle);

  return (
    <aside className="panel marketing-builder-preview">
      <div className="panel-header">
        <div>
          <h2>Pré-visualização</h2>
          <p className="panel-subtitle">Como a página pública será exibida.</p>
        </div>
        <div className="panel-header-actions">
          {onOpenMetrics ? (
            <button type="button" className="btn-ghost btn-sm" onClick={onOpenMetrics}>
              Métricas
            </button>
          ) : null}
          {publicPath ? (
            <a href={publicPath} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
              Abrir página
            </a>
          ) : null}
        </div>
      </div>

      <div className="panel-body marketing-builder-preview-frame" style={buildPageBackgroundStyle(theme)}>
        <div className="marketing-preview-stage">
          <div
            className="marketing-landing-card marketing-preview-card marketing-public-card-themed"
            style={{
              backgroundColor: theme.cardColor,
              color: theme.cardTextColor,
              fontFamily: resolvedFontFamily,
            }}
          >
            {form.coverImageUrl ? (
              <div
                className="marketing-landing-cover"
                style={{ backgroundImage: `url(${form.coverImageUrl})` }}
                role="img"
                aria-hidden="true"
              />
            ) : null}

            <div className="marketing-landing-card-body">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="" className="marketing-preview-logo" />
            ) : null}

            {!theme.hideHeadline && form.headline ? (
              <h1>{form.headline}</h1>
            ) : null}

            {!theme.hideDescription && form.description ? (
              <p>{form.description}</p>
            ) : null}

            <div className="marketing-preview-fields">
              {(form.fields ?? []).map((field, index) => (
                <PreviewField key={`${field.key}-${index}`} field={field} />
              ))}
            </div>

            <button
              type="button"
              className="marketing-preview-submit"
              style={{
                backgroundColor: theme.buttonColor,
                color: theme.buttonTextColor,
                borderRadius: buttonRadius,
              }}
            >
              Enviar
            </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
