import { ChevronDown, ChevronUp, Settings, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CrudAlerts } from './crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from './crud/CrudFormActions.jsx';
import { PageHeader } from './PageHeader.jsx';
import { MarketingFormPreview } from './MarketingFormPreview.jsx';
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
  formToPayload,
  moveField,
} from '../utils/marketingFormBuilder.js';

const TABS = [
  { id: 'identity', label: 'Identidade' },
  { id: 'appearance', label: 'Aparência' },
  { id: 'form', label: 'Formulário' },
  { id: 'share', label: 'Links para redes (com rastreamento)' },
];

const LEAD_TYPES = [
  { value: '', label: 'Detectar automaticamente' },
  { value: 'partner', label: 'Academia (kanban comercial)' },
  { value: 'corporate', label: 'Empresa (kanban comercial)' },
];

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
            onChange({
              kind: 'field',
              type: value,
              key: field.key || `field_${displayIndex}`,
              label: field.label || 'Nova pergunta',
              required: Boolean(field.required),
              placeholder: field.placeholder ?? '',
              description: field.description ?? '',
              mapTo: field.mapTo,
            });
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
          <label className="marketing-builder-required">
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
          <p className="field-hint marketing-builder-field-preview-line">Prévia: Sua resposta</p>
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
  onOpenMetrics,
}) {
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState('identity');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedSlug, setCopiedSlug] = useState(false);

  useEffect(() => {
    setForm(initial);
    setError('');
    setTab('identity');
  }, [initial]);

  const stats = useMemo(() => countFormStats(form.fields), [form.fields]);
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
      await onSubmit(formToPayload(form));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack marketing-builder-page">
      <PageHeader breadcrumbs={breadcrumbs} title={title} subtitle={subtitle} />
      <CrudAlerts error={error} />

      <form onSubmit={submit}>
        <section className="panel marketing-builder-workspace">
          <div className="panel-header marketing-builder-tabs-header">
            <div className="notifications-filter" role="tablist" aria-label="Configuração do formulário">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`notifications-filter-btn${tab === item.id ? ' is-active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-body marketing-builder-body">
            <div className="marketing-builder-layout">
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

                        <label>
                          <span>Nome da página</span>
                          <input
                            value={form.headline}
                            onChange={(ev) => setForm({ ...form, headline: ev.target.value })}
                            required
                            disabled={readOnly}
                          />
                          <div className="marketing-inline-check">
                            <input
                              type="checkbox"
                              id="hide-headline"
                              checked={Boolean(form.theme?.hideHeadline)}
                              onChange={(ev) => updateTheme({ hideHeadline: ev.target.checked })}
                              disabled={readOnly}
                            />
                            <label htmlFor="hide-headline">Ocultar título na página pública</label>
                          </div>
                        </label>

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

                        <label className="field-span-2">
                          <span>Descrição</span>
                          <textarea
                            value={form.description}
                            onChange={(ev) => setForm({ ...form, description: ev.target.value })}
                            rows={3}
                            disabled={readOnly}
                          />
                          <div className="marketing-inline-check">
                            <input
                              type="checkbox"
                              id="hide-description"
                              checked={Boolean(form.theme?.hideDescription)}
                              onChange={(ev) => updateTheme({ hideDescription: ev.target.checked })}
                              disabled={readOnly}
                            />
                            <label htmlFor="hide-description">Ocultar descrição na página pública</label>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3 className="form-section-title">Integração comercial</h3>
                      <p className="field-hint">Vincule campanha, criativo e funil para rastrear leads.</p>

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

                      <div className="form-grid-inner">
                        <label className="field-span-2">
                          <span>Mensagem de agradecimento</span>
                          <textarea
                            value={form.thankYouMessage}
                            onChange={(ev) => setForm({ ...form, thankYouMessage: ev.target.value })}
                            rows={2}
                            disabled={readOnly}
                          />
                        </label>

                        <label>
                          <span>Logo (URL)</span>
                          <input
                            value={form.logoUrl}
                            onChange={(ev) => setForm({ ...form, logoUrl: ev.target.value })}
                            disabled={readOnly}
                          />
                          <p className="field-hint">PNG ou WebP com fundo transparente.</p>
                        </label>

                        <label>
                          <span>Foto de capa (URL)</span>
                          <input
                            value={form.coverImageUrl}
                            onChange={(ev) => setForm({ ...form, coverImageUrl: ev.target.value })}
                            disabled={readOnly}
                          />
                          <p className="field-hint">Banner no topo. Proporção recomendada 16:3.</p>
                        </label>
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

                      <div className="form-grid-inner marketing-builder-tab-grid marketing-builder-grid-3">
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
                      value={form.theme?.fontFamily ?? 'Inter'}
                      onChange={(ev) => updateTheme({ fontFamily: ev.target.value })}
                      disabled={readOnly}
                    >
                      {FONT_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3 className="form-section-title">Botão de envio</h3>
                      <p className="field-hint">Personalize a aparência do botão na página pública.</p>

                      <div className="form-grid-inner marketing-builder-tab-grid marketing-builder-grid-3">
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

                <div className="marketing-builder-footer">
                  {readOnly ? (
                    <CrudViewActions onBack={onCancel} />
                  ) : (
                    <CrudFormActions
                      busy={busy}
                      onCancel={onCancel}
                      submitLabel="Salvar configuração"
                      onDelete={onDelete}
                    />
                  )}
                </div>
              </div>

              <MarketingFormPreview form={form} publicPath={publicPath} onOpenMetrics={onOpenMetrics} />
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
