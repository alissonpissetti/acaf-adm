import { ChevronDown, ChevronUp, Settings, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CrudAlerts } from './crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from './crud/CrudFormActions.jsx';
import { PageHeader } from './PageHeader.jsx';
import {
  uploadMarketingLandingCover,
  uploadMarketingLandingLogo,
} from '../api/marketing.js';
import { MarketingFormPreview } from './MarketingFormPreview.jsx';
import { MarketingLandingMediaField } from './MarketingLandingMediaField.jsx';
import { MarketingGradientField } from './MarketingGradientField.jsx';
import { MarketingSharePanel } from './MarketingSharePanel.jsx';
import {
  BACKGROUND_TYPES,
  BUTTON_STYLES,
  countFormStats,
  createField,
  createSection,
  FIELD_MAPS,
  FIELD_TYPES,
  FONT_OPTIONS,
  isMarketingPhoneField,
  isMarketingSelectField,
  MARKETING_PHONE_PLACEHOLDER,
  patchForMarketingPhoneField,
  patchForMarketingSelectField,
  formToPayload,
  moveField,
  pageToForm,
} from '../utils/marketingFormBuilder.js';
import { APP_DEFAULT_FONT_FAMILY } from '../utils/marketingBrandTypography.js';
import { useMarketingBrandTypography } from '../hooks/useMarketingBrandTypography.js';

const TABS = [
  { id: 'identity', label: 'Identidade' },
  { id: 'appearance', label: 'Aparência' },
  { id: 'form', label: 'Formulário' },
  { id: 'share', label: 'Compartilhamento' },
];

const LEAD_TYPES = [
  { value: '', label: 'Detectar automaticamente' },
  { value: 'partner', label: 'Academia (kanban comercial)' },
  { value: 'corporate', label: 'Empresa (kanban comercial)' },
];

function FieldSelectOptionsEditor({ options = [], readOnly, onChange }) {
  const updateOption = (optionIndex, patch) => {
    onChange(
      options.map((option, index) => (index === optionIndex ? { ...option, ...patch } : option)),
    );
  };

  return (
    <div className="marketing-builder-select-options">
      <div className="marketing-builder-select-options-head">
        <span>Opções da seleção</span>
        {!readOnly ? (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => onChange([...options, { label: `Opção ${options.length + 1}`, value: '' }])}
          >
            Adicionar opção
          </button>
        ) : null}
      </div>
      <div className="marketing-builder-select-options-list">
        {options.map((option, optionIndex) => (
          <div key={`select-option-${optionIndex}`} className="marketing-builder-select-option-row">
            <label>
              <span className="sr-only">Rótulo da opção {optionIndex + 1}</span>
              <input
                value={option.label}
                onChange={(ev) => updateOption(optionIndex, { label: ev.target.value })}
                disabled={readOnly}
                placeholder="Rótulo exibido"
              />
            </label>
            <label>
              <span className="sr-only">Valor interno da opção {optionIndex + 1}</span>
              <input
                value={option.value}
                onChange={(ev) => updateOption(optionIndex, { value: ev.target.value })}
                disabled={readOnly}
                placeholder="Valor (opcional)"
              />
            </label>
            {!readOnly ? (
              <button
                type="button"
                className="crud-icon-btn crud-icon-btn-danger"
                title="Remover opção"
                onClick={() => onChange(options.filter((_, index) => index !== optionIndex))}
                disabled={options.length <= 1}
              >
                <X size={14} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <p className="field-hint">O rótulo aparece na lista; o valor é gravado na resposta (deixe em branco para gerar automaticamente).</p>
    </div>
  );
}

function ColorField({ label, value, onChange, disabled }) {
  return (
    <label className="marketing-color-field">
      <span>{label}</span>
      <div className="marketing-color-input">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(ev) => onChange(ev.target.value)}
          disabled={disabled}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(ev) => onChange(ev.target.value)}
          disabled={disabled}
          placeholder="#000000"
        />
      </div>
    </label>
  );
}

function FieldBuilderCard({
  field,
  index,
  total,
  readOnly,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isSection = field.kind === 'section';
  const displayIndex = index + 1;

  return (
    <article className={`form-section marketing-builder-field-card${isSection ? ' is-section' : ''}`}>
      <div className="marketing-builder-field-head">
        <span className="marketing-builder-field-index">{displayIndex}</span>
        <select
          className="marketing-builder-field-type"
          value={isSection ? 'section' : field.type}
          onChange={(ev) => {
            const value = ev.target.value;
            if (value === 'section') {
              onChange({
                kind: 'section',
                key: field.key || `section_${displayIndex}`,
                label: field.label || 'Nova seção',
                sectionStyle: field.sectionStyle ?? 'default',
              });
              return;
            }
            const next = {
              kind: 'field',
              type: value,
              key: field.key || `field_${displayIndex}`,
              label: field.label || 'Nova pergunta',
              required: Boolean(field.required),
              placeholder: field.placeholder ?? '',
              description: field.description ?? '',
              mapTo: field.mapTo,
              ...(value === 'tel' ? patchForMarketingPhoneField(field) : {}),
              ...(value === 'select' ? patchForMarketingSelectField(field) : {}),
            };
            if (value !== 'select') delete next.options;
            onChange(next);
          }}
          disabled={readOnly}
        >
          <option value="section">Seção</option>
          {FIELD_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {!isSection ? (
          <label className="checkbox-inline marketing-builder-required">
            <input
              type="checkbox"
              checked={Boolean(field.required)}
              onChange={(ev) => onChange({ required: ev.target.checked })}
              disabled={readOnly}
            />
            <span>Obrigatório</span>
          </label>
        ) : (
          <select
            className="marketing-builder-field-type"
            value={field.sectionStyle ?? 'default'}
            onChange={(ev) => onChange({ sectionStyle: ev.target.value })}
            disabled={readOnly}
          >
            <option value="default">Estilo padrão</option>
            <option value="highlight">Destaque</option>
          </select>
        )}

        <div className="marketing-builder-field-actions">
          <button
            type="button"
            className="crud-icon-btn"
            title="Configurações avançadas"
            onClick={() => setShowAdvanced((current) => !current)}
            disabled={readOnly}
          >
            <Settings size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="crud-icon-btn"
            title="Mover para cima"
            onClick={onMoveUp}
            disabled={readOnly || index === 0}
          >
            <ChevronUp size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="crud-icon-btn"
            title="Mover para baixo"
            onClick={onMoveDown}
            disabled={readOnly || index >= total - 1}
          >
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="crud-icon-btn crud-icon-btn-danger"
            title="Remover"
            onClick={onRemove}
            disabled={readOnly}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <label>
        <span>{isSection ? 'Nome da seção' : 'Pergunta'}</span>
        <input
          value={field.label}
          onChange={(ev) => onChange({ label: ev.target.value })}
          disabled={readOnly}
          placeholder={isSection ? 'Identificação' : 'Texto da pergunta'}
        />
      </label>

      {!isSection ? (
        <>
          <label>
            <span>Descrição (opcional)</span>
            <input
              value={field.description ?? ''}
              onChange={(ev) => onChange({ description: ev.target.value })}
              disabled={readOnly}
              placeholder="Texto de ajuda exibido abaixo da pergunta"
            />
          </label>
          {isMarketingSelectField(field) ? (
            <FieldSelectOptionsEditor
              options={field.options ?? []}
              readOnly={readOnly}
              onChange={(options) => onChange({ options })}
            />
          ) : (
            <p className="field-hint marketing-builder-field-preview-line">
              Prévia: {isMarketingPhoneField(field) ? MARKETING_PHONE_PLACEHOLDER : 'Sua resposta'}
            </p>
          )}
        </>
      ) : null}

      {showAdvanced && !isSection ? (
        <div className="marketing-builder-field-advanced form-grid-inner">
          <label>
            <span>Chave interna</span>
            <input
              value={field.key}
              onChange={(ev) => onChange({ key: ev.target.value })}
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Placeholder</span>
            <input
              value={field.placeholder ?? ''}
              onChange={(ev) => onChange({ placeholder: ev.target.value })}
              disabled={readOnly}
            />
          </label>
          <label>
            <span>Mapear para lead</span>
            <select
              value={field.mapTo ?? ''}
              onChange={(ev) => onChange({ mapTo: ev.target.value || undefined })}
              disabled={readOnly}
            >
              {FIELD_MAPS.map((item) => (
                <option key={item.value || 'none'} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {showAdvanced && isSection ? (
        <div className="marketing-builder-field-advanced">
          <label>
            <span>Chave interna</span>
            <input
              value={field.key}
              onChange={(ev) => onChange({ key: ev.target.value })}
              disabled={readOnly}
            />
          </label>
        </div>
      ) : null}
    </article>
  );
}

export function MarketingLandingPageEditor({
  title,
  subtitle,
  breadcrumbs,
  initial,
  readOnly,
  campaignOptions,
  funnelOptions,
  creatives,
  leadTypeOptions = LEAD_TYPES,
  onCampaignChange,
  onSubmit,
  onCancel,
  onDelete,
  onEdit,
  onOpenMetrics,
  onSaved,
}) {
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState('identity');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [logoRemovePending, setLogoRemovePending] = useState(false);
  const [coverRemovePending, setCoverRemovePending] = useState(false);

  useEffect(() => {
    setForm(initial);
    setError('');
    setTab('identity');
    setLogoFile(null);
    setCoverFile(null);
    setLogoRemovePending(false);
    setCoverRemovePending(false);
  }, [initial]);

  const stats = useMemo(() => countFormStats(form.fields), [form.fields]);
  const brandTypography = useMarketingBrandTypography(form.theme?.fontFamily);
  const selectedCreative = creatives?.find((item) => item.id === form.creativeId) ?? null;
  const publicPath = form.slug ? `/f/${form.slug}` : '';

  const updateTheme = (patch) => {
    setForm((current) => ({
      ...current,
      theme: { ...current.theme, ...patch },
      primaryColor: patch.buttonColor ?? current.primaryColor,
    }));
  };

  const updateField = (index, patch) => {
    setForm((current) => ({
      ...current,
      fields: current.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    }));
  };

  const clearCommercialLink = async () => {
    setForm((current) => ({ ...current, campaignId: '', creativeId: '' }));
    await onCampaignChange?.('');
  };

  const copySlug = async () => {
    if (!form.slug) return;
    try {
      await navigator.clipboard.writeText(form.slug);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 1500);
    } catch {
      setCopiedSlug(false);
    }
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (readOnly) return;
    setBusy(true);
    setError('');
    try {
      const payload = formToPayload(form);
      if (logoRemovePending && !logoFile) payload.logoUrl = null;
      if (coverRemovePending && !coverFile) payload.coverImageUrl = null;

      let saved = await onSubmit(payload);
      const pageId = saved?.id;
      if (pageId) {
        if (logoFile) saved = await uploadMarketingLandingLogo(pageId, logoFile);
        if (coverFile) saved = await uploadMarketingLandingCover(pageId, coverFile);
      }

      if (saved) {
        setForm(pageToForm(saved));
        setLogoFile(null);
        setCoverFile(null);
        setLogoRemovePending(false);
        setCoverRemovePending(false);
      }

      await onSaved?.(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader breadcrumbs={breadcrumbs} title={title} subtitle={subtitle} />
      <CrudAlerts error={error} />

      <form className="page-stack" onSubmit={submit}>
        <div className="marketing-builder-layout">
          <section className="panel marketing-builder-workspace">
            <div className="unit-edit-tabs" role="tablist" aria-label="Configuração do formulário">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={tab === item.id ? 'unit-edit-tab active' : 'unit-edit-tab'}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="panel-body marketing-builder-body">
              <div className="marketing-builder-main">
                {tab === 'identity' ? (
                  <div className="marketing-builder-sections">
                    <div className="form-section">
                      <h3 className="form-section-title">Identificação</h3>
                      <p className="field-hint">
                        Nome interno e conteúdo exibido na página pública.
                      </p>

                      <div className="form-grid-inner">
                        <label className="field-span-2">
                          <span>Nome interno</span>
                          <input
                            value={form.name}
                            onChange={(ev) => setForm({ ...form, name: ev.target.value })}
                            required
                            disabled={readOnly}
                          />
                          <p className="field-hint">Apenas para controle interno. Não aparece na página pública.</p>
                        </label>

                        <div className="field-span-2">
                          <label>
                            <span>Nome da página</span>
                            <input
                              value={form.headline}
                              onChange={(ev) => setForm({ ...form, headline: ev.target.value })}
                              required
                              disabled={readOnly}
                            />
                          </label>
                          <label className="checkbox-inline">
                            <input
                              type="checkbox"
                              checked={Boolean(form.theme?.hideHeadline)}
                              onChange={(ev) => updateTheme({ hideHeadline: ev.target.checked })}
                              disabled={readOnly}
                            />
                            <span>Ocultar título na página pública</span>
                          </label>
                        </div>

                        <label>
                          <span>Endereço da página</span>
                          <div className="marketing-slug-row">
                            <input
                              value={form.slug}
                              onChange={(ev) => setForm({ ...form, slug: ev.target.value })}
                              disabled={readOnly}
                              placeholder="gerado automaticamente"
                            />
                            <button
                              type="button"
                              className="btn-ghost btn-sm"
                              onClick={copySlug}
                              disabled={!form.slug}
                            >
                              {copiedSlug ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                          <p className="field-hint">Letras minúsculas, números e hífens.</p>
                        </label>

                        <div className="field-span-2">
                          <label>
                            <span>Descrição</span>
                            <textarea
                              value={form.description}
                              onChange={(ev) => setForm({ ...form, description: ev.target.value })}
                              rows={3}
                              disabled={readOnly}
                            />
                          </label>
                          <label className="checkbox-inline">
                            <input
                              type="checkbox"
                              checked={Boolean(form.theme?.hideDescription)}
                              onChange={(ev) => updateTheme({ hideDescription: ev.target.checked })}
                              disabled={readOnly}
                            />
                            <span>Ocultar descrição na página pública</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="form-section">
                      <div className="marketing-integration-head">
                        <div>
                          <h3 className="form-section-title">Integração comercial</h3>
                          <p className="field-hint">Vincule campanha, criativo e funil para rastrear leads.</p>
                        </div>
                        {!readOnly && (form.campaignId || form.creativeId) ? (
                          <button type="button" className="btn-ghost btn-sm" onClick={clearCommercialLink}>
                            Remover vínculo
                          </button>
                        ) : null}
                      </div>

                      <div className="form-grid-inner">
                        <label>
                          <span>Campanha</span>
                          <select
                            value={form.campaignId}
                            onChange={async (ev) => {
                              const nextCampaignId = ev.target.value;
                              setForm({ ...form, campaignId: nextCampaignId, creativeId: '' });
                              await onCampaignChange?.(nextCampaignId);
                            }}
                            disabled={readOnly}
                          >
                            <option value="">Sem campanha</option>
                            {(campaignOptions ?? []).map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span>Criativo</span>
                          <select
                            value={form.creativeId}
                            onChange={(ev) => setForm({ ...form, creativeId: ev.target.value })}
                            disabled={readOnly || !form.campaignId}
                          >
                            <option value="">Sem criativo</option>
                            {(creatives ?? []).map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span>Funil comercial</span>
                          <select
                            value={form.funnelId}
                            onChange={(ev) => setForm({ ...form, funnelId: ev.target.value })}
                            disabled={readOnly}
                          >
                            <option value="">Funil padrão</option>
                            {(funnelOptions ?? []).map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span>Tipo de lead</span>
                          <select
                            value={form.leadType}
                            onChange={(ev) => setForm({ ...form, leadType: ev.target.value })}
                            disabled={readOnly}
                          >
                            {leadTypeOptions.map((item) => (
                              <option key={item.value || 'auto'} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3 className="form-section-title">Mensagem e mídia</h3>
                      <p className="field-hint">Texto de confirmação e imagens opcionais da página.</p>

                      <div className="form-grid-inner marketing-media-section">
                        <label className="field-span-2">
                          <span>Mensagem de agradecimento</span>
                          <textarea
                            value={form.thankYouMessage}
                            onChange={(ev) => setForm({ ...form, thankYouMessage: ev.target.value })}
                            rows={3}
                            disabled={readOnly}
                          />
                          <p className="field-hint">Exibida após o envio do formulário na página pública.</p>
                        </label>

                        <div className="field-span-2 marketing-media-stack">
                          <MarketingLandingMediaField
                            kind="logo"
                            value={form.logoUrl}
                            onChange={setLogoFile}
                            onRemoveSaved={() => {
                              setLogoRemovePending(true);
                              setForm((current) => ({ ...current, logoUrl: '' }));
                            }}
                            onUrlChange={(logoUrl) => {
                              setLogoRemovePending(false);
                              setLogoFile(null);
                              setForm((current) => ({ ...current, logoUrl }));
                            }}
                            disabled={readOnly}
                          />
                          <MarketingLandingMediaField
                            kind="cover"
                            value={form.coverImageUrl}
                            onChange={setCoverFile}
                            onRemoveSaved={() => {
                              setCoverRemovePending(true);
                              setForm((current) => ({ ...current, coverImageUrl: '' }));
                            }}
                            onUrlChange={(coverImageUrl) => {
                              setCoverRemovePending(false);
                              setCoverFile(null);
                              setForm((current) => ({ ...current, coverImageUrl }));
                            }}
                            disabled={readOnly}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {tab === 'appearance' ? (
                  <div className="marketing-builder-sections">
                    <div className="form-section">
                      <h3 className="form-section-title">Aparência</h3>
                      <p className="field-hint">
                        Cor, gradiente ou imagem que preenche toda a tela — no desktop e no celular.
                      </p>

                      <div className="form-grid-inner marketing-builder-tab-grid">
                  <label>
                    <span>Tipo de fundo</span>
                    <select
                      value={form.theme?.backgroundType ?? 'solid'}
                      onChange={(ev) => updateTheme({ backgroundType: ev.target.value })}
                      disabled={readOnly}
                    >
                      {BACKGROUND_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {form.theme?.backgroundType === 'solid' ? (
                    <ColorField
                      label="Cor sólida"
                      value={form.theme?.backgroundColor}
                      onChange={(value) => updateTheme({ backgroundColor: value })}
                      disabled={readOnly}
                    />
                  ) : null}

                  {form.theme?.backgroundType === 'gradient' ? (
                    <MarketingGradientField
                      label="Gradiente"
                      value={form.theme?.backgroundGradient}
                      onChange={(backgroundGradient) => updateTheme({ backgroundGradient })}
                      disabled={readOnly}
                    />
                  ) : null}

                  {form.theme?.backgroundType === 'image' ? (
                    <label>
                      <span>URL da imagem de fundo</span>
                      <input
                        value={form.theme?.backgroundImageUrl ?? ''}
                        onChange={(ev) => updateTheme({ backgroundImageUrl: ev.target.value })}
                        disabled={readOnly}
                        placeholder="https://…"
                      />
                    </label>
                  ) : null}
                      </div>
                    </div>

                    <div className="form-section">
                      <h3 className="form-section-title">Card de conteúdo</h3>
                      <p className="field-hint">
                        Caixa arredondada onde ficam logo, textos e campos. Cor sempre sólida.
                      </p>

                      <div className="form-grid-inner marketing-builder-tab-grid">
                  <ColorField
                    label="Cor do card"
                    value={form.theme?.cardColor}
                    onChange={(value) => updateTheme({ cardColor: value })}
                    disabled={readOnly}
                  />
                  <ColorField
                    label="Cor do texto"
                    value={form.theme?.cardTextColor}
                    onChange={(value) => updateTheme({ cardTextColor: value })}
                    disabled={readOnly}
                  />
                  <label>
                    <span>Fonte</span>
                    <select
                      value={form.theme?.fontFamily ?? APP_DEFAULT_FONT_FAMILY}
                      onChange={(ev) => updateTheme({ fontFamily: ev.target.value })}
                      disabled={readOnly}
                    >
                      {FONT_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <p className="field-hint">
                      O padrão do movimento usa a fonte Figtree publicada no storage (mesma tipografia do admin).
                    </p>
                  </label>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3 className="form-section-title">Botão de envio</h3>
                      <p className="field-hint">Personalize a aparência do botão na página pública.</p>

                      <div className="form-grid-inner marketing-builder-tab-grid">
                  <ColorField
                    label="Cor do botão"
                    value={form.theme?.buttonColor}
                    onChange={(value) => updateTheme({ buttonColor: value })}
                    disabled={readOnly}
                  />
                  <ColorField
                    label="Cor do texto do botão"
                    value={form.theme?.buttonTextColor}
                    onChange={(value) => updateTheme({ buttonTextColor: value })}
                    disabled={readOnly}
                  />
                  <label>
                    <span>Estilo do botão</span>
                    <select
                      value={form.theme?.buttonStyle ?? 'rounded'}
                      onChange={(ev) => updateTheme({ buttonStyle: ev.target.value })}
                      disabled={readOnly}
                    >
                      {BUTTON_STYLES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                      </div>
                    </div>
                  </div>
                ) : null}

                {tab === 'form' ? (
                  <div className="form-section">
                    <div className="marketing-builder-fields-toolbar">
                      <div>
                        <h3 className="form-section-title">Campos</h3>
                        <p className="field-hint">
                          Configure os campos exibidos na página pública. Use as setas para reordenar.
                        </p>
                      </div>
                      <span className="panel-meta">
                        {stats.total} campos · {stats.questions} perguntas
                      </span>
                    </div>

                    {!readOnly ? (
                      <div className="marketing-builder-fields-actions">
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              fields: [...current.fields, createSection(current.fields)],
                            }))
                          }
                        >
                          Adicionar seção
                        </button>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              fields: [...current.fields, createField(current.fields)],
                            }))
                          }
                        >
                          Adicionar pergunta
                        </button>
                      </div>
                    ) : null}

                    <div className="marketing-builder-fields">
                  {form.fields.map((field, index) => (
                    <FieldBuilderCard
                      key={`${field.key}-${index}`}
                      field={field}
                      index={index}
                      total={form.fields.length}
                      readOnly={readOnly}
                      onChange={(patch) => updateField(index, patch)}
                      onMoveUp={() =>
                        setForm((current) => ({
                          ...current,
                          fields: moveField(current.fields, index, -1),
                        }))
                      }
                      onMoveDown={() =>
                        setForm((current) => ({
                          ...current,
                          fields: moveField(current.fields, index, 1),
                        }))
                      }
                      onRemove={() =>
                        setForm((current) => ({
                          ...current,
                          fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index),
                        }))
                      }
                    />
                  ))}
                    </div>
                  </div>
                ) : null}

                {tab === 'share' ? (
                  form.slug ? (
                    <MarketingSharePanel
                      slug={form.slug}
                      sharePath={selectedCreative?.formPath}
                      utm={
                        selectedCreative
                          ? {
                              utmSource: selectedCreative.utmSource,
                              utmMedium: selectedCreative.utmMedium,
                              utmCampaign: selectedCreative.utmCampaign,
                              utmContent: selectedCreative.utmContent,
                              utmTerm: selectedCreative.utmTerm,
                              creativeId: selectedCreative.id,
                            }
                          : undefined
                      }
                      funnelName={(funnelOptions ?? []).find((item) => item.id === form.funnelId)?.name}
                      leadTypeLabel={leadTypeOptions.find((item) => item.value === form.leadType)?.label}
                    />
                  ) : (
                    <div className="placeholder-box">
                      Salve o formulário com um endereço de página para gerar links rastreados.
                    </div>
                  )
                ) : null}

                <div className="form-actions panel-actions field-span-full marketing-builder-actions">
                  {readOnly ? (
                    <CrudViewActions onBack={onCancel} onEdit={onEdit} />
                  ) : (
                    <CrudFormActions busy={busy} onCancel={onCancel} onDelete={onDelete} showDelete={Boolean(onDelete)} />
                  )}
                </div>
              </div>
            </div>
          </section>

          <MarketingFormPreview
            form={form}
            publicPath={publicPath}
            onOpenMetrics={onOpenMetrics}
            brandTypography={brandTypography}
          />
        </div>
      </form>
    </div>
  );
}
