import { useEffect, useMemo, useState } from 'react';
import {
  createMarketingCampaign,
  createMarketingCreative,
  deactivateMarketingCampaign,
  deactivateMarketingCreative,
  getMarketingCampaign,
  getMarketingCampaigns,
  getMarketingLandingPageOptions,
  updateMarketingCampaign,
  updateMarketingCreative,
} from '../api/marketing.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { MarketingSharePanel } from '../components/MarketingSharePanel.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { confirmCrudDelete, inactiveBadgeClass, inactiveLabel } from '../crud/crudUtils.js';
import { activeStatusFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { useAsyncResource, useCrudRouter } from '../crud/useCrudRouter.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { formatBrlInputDigits, parseBrlInput } from '../utils/currency.js';
import '../styles/marketing.css';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'google', label: 'Google' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'other', label: 'Outro' },
];

const STATUSES = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'finished', label: 'Encerrada' },
];

const FORMATS = [
  { value: 'image', label: 'Imagem' },
  { value: 'video', label: 'Vídeo' },
  { value: 'carousel', label: 'Carrossel' },
  { value: 'story', label: 'Story' },
  { value: 'reels', label: 'Reels' },
  { value: 'search', label: 'Busca' },
  { value: 'other', label: 'Outro' },
];

const EMPTY_CREATIVE = {
  name: '',
  slug: '',
  platform: 'instagram',
  format: 'image',
  externalUrl: '',
  landingPageId: '',
  utmSource: '',
  utmMedium: 'social',
  utmCampaign: '',
  utmContent: '',
  utmTerm: '',
  impressions: 0,
  clicks: 0,
  spendCents: 0,
  active: true,
};

function campaignToForm(campaign) {
  return {
    name: campaign?.name ?? '',
    slug: campaign?.slug ?? '',
    description: campaign?.description ?? '',
    platform: campaign?.platform ?? 'instagram',
    status: campaign?.status ?? 'draft',
    startDate: campaign?.startDate ?? '',
    endDate: campaign?.endDate ?? '',
    budgetCents: campaign?.budgetCents ?? 0,
    notes: campaign?.notes ?? '',
    active: campaign?.active ?? true,
    creatives: campaign?.creatives ?? [],
  };
}

function CampaignForm({
  title,
  subtitle,
  breadcrumbs,
  initial,
  readOnly,
  onSubmit,
  onCancel,
  onDelete,
  onCreativeSave,
  onCreativeDelete,
  landingPageOptions = [],
}) {
  const [form, setForm] = useState(initial);
  const [creativeDraft, setCreativeDraft] = useState(EMPTY_CREATIVE);
  const [editingCreativeId, setEditingCreativeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(initial);
    setCreativeDraft(EMPTY_CREATIVE);
    setEditingCreativeId('');
    setError('');
  }, [initial]);

  const submit = async (ev) => {
    ev.preventDefault();
    if (readOnly) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit({
        name: form.name,
        slug: form.slug || undefined,
        description: form.description,
        platform: form.platform,
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        budgetCents: form.budgetCents,
        notes: form.notes,
        active: form.active,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveCreative = async () => {
    if (readOnly || !onCreativeSave) return;
    setBusy(true);
    setError('');
    try {
      await onCreativeSave(editingCreativeId || null, {
        ...creativeDraft,
        landingPageId: creativeDraft.landingPageId || null,
      });
      setCreativeDraft(EMPTY_CREATIVE);
      setEditingCreativeId('');
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

      <section className="panel">
        <div className="panel-header">
          <h2>Campanha</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label className="field-span-2">
              <span>Nome</span>
              <input value={form.name} onChange={(ev) => setForm({ ...form, name: ev.target.value })} required disabled={readOnly} />
            </label>
            <label>
              <span>Slug</span>
              <input value={form.slug} onChange={(ev) => setForm({ ...form, slug: ev.target.value })} disabled={readOnly} placeholder="gerado automaticamente" />
            </label>
            <label>
              <span>Plataforma</span>
              <select value={form.platform} onChange={(ev) => setForm({ ...form, platform: ev.target.value })} disabled={readOnly}>
                {PLATFORMS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={form.status} onChange={(ev) => setForm({ ...form, status: ev.target.value })} disabled={readOnly}>
                {STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Início</span>
              <input type="date" value={form.startDate ?? ''} onChange={(ev) => setForm({ ...form, startDate: ev.target.value })} disabled={readOnly} />
            </label>
            <label>
              <span>Fim</span>
              <input type="date" value={form.endDate ?? ''} onChange={(ev) => setForm({ ...form, endDate: ev.target.value })} disabled={readOnly} />
            </label>
            <label>
              <span>Orçamento</span>
              <input
                value={formatBrlInputDigits((form.budgetCents ?? 0) / 100)}
                onChange={(ev) => setForm({ ...form, budgetCents: Math.round(parseBrlInput(ev.target.value) * 100) })}
                disabled={readOnly}
              />
            </label>
            <label className="field-span-2">
              <span>Descrição</span>
              <textarea value={form.description} onChange={(ev) => setForm({ ...form, description: ev.target.value })} rows={3} disabled={readOnly} />
            </label>
            <label className="field-span-2">
              <span>Observações</span>
              <textarea value={form.notes} onChange={(ev) => setForm({ ...form, notes: ev.target.value })} rows={3} disabled={readOnly} />
            </label>

            <div className="field-span-full form-actions">
              {readOnly ? (
                <CrudViewActions onBack={onCancel} />
              ) : (
                <CrudFormActions busy={busy} onCancel={onCancel} submitLabel="Salvar campanha" onDelete={onDelete} />
              )}
            </div>
          </form>
        </div>
      </section>

      {form.creatives ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Criativos</h2>
          </div>
          <div className="panel-body">
            {(form.creatives ?? []).map((creative) => (
              <article key={creative.id} className="marketing-creative-row">
                <strong>{creative.name}</strong>
                <div className="muted">
                  {creative.platformLabel} · {creative.formatLabel} · {creative.impressions} impressões ·{' '}
                  {creative.clicks} cliques · {creative.conversions} conversões
                </div>
                {creative.landingPageName ? (
                  <div className="muted">Formulário: {creative.landingPageName}</div>
                ) : null}
                {creative.formPath ? (
                  <MarketingSharePanel
                    slug={creative.landingPageSlug}
                    sharePath={creative.formPath}
                    title="Link para redes sociais"
                  />
                ) : (
                  <p className="muted">Vincule um formulário ao criativo para gerar link rastreado.</p>
                )}
                {!readOnly ? (
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        setEditingCreativeId(creative.id);
                        setCreativeDraft({
                          name: creative.name,
                          slug: creative.slug,
                          platform: creative.platform,
                          format: creative.format,
                          externalUrl: creative.externalUrl ?? '',
                          landingPageId: creative.landingPageId ?? '',
                          utmSource: creative.utmSource ?? '',
                          utmMedium: creative.utmMedium ?? '',
                          utmCampaign: creative.utmCampaign ?? '',
                          utmContent: creative.utmContent ?? '',
                          utmTerm: creative.utmTerm ?? '',
                          impressions: creative.impressions ?? 0,
                          clicks: creative.clicks ?? 0,
                          spendCents: creative.spendCents ?? 0,
                          active: creative.active ?? true,
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => onCreativeDelete?.(creative.id)}>
                      Remover
                    </button>
                  </div>
                ) : null}
              </article>
            ))}

            {!readOnly ? (
              <div className="marketing-creative-row">
                <strong>{editingCreativeId ? 'Editar criativo' : 'Novo criativo'}</strong>
                <div className="form-grid">
                  <label>
                    <span>Nome</span>
                    <input value={creativeDraft.name} onChange={(ev) => setCreativeDraft({ ...creativeDraft, name: ev.target.value })} />
                  </label>
                  <label>
                    <span>Formato</span>
                    <select value={creativeDraft.format} onChange={(ev) => setCreativeDraft({ ...creativeDraft, format: ev.target.value })}>
                      {FORMATS.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field-span-2">
                    <span>Formulário de captação</span>
                    <select
                      value={creativeDraft.landingPageId}
                      onChange={(ev) =>
                        setCreativeDraft({ ...creativeDraft, landingPageId: ev.target.value })
                      }
                    >
                      <option value="">Selecione um formulário</option>
                      {landingPageOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-span-2">
                    <span>URL do criativo (mídia externa)</span>
                    <input value={creativeDraft.externalUrl} onChange={(ev) => setCreativeDraft({ ...creativeDraft, externalUrl: ev.target.value })} />
                  </label>
                  <label>
                    <span>Impressões</span>
                    <input type="number" min="0" value={creativeDraft.impressions} onChange={(ev) => setCreativeDraft({ ...creativeDraft, impressions: Number(ev.target.value) })} />
                  </label>
                  <label>
                    <span>Cliques</span>
                    <input type="number" min="0" value={creativeDraft.clicks} onChange={(ev) => setCreativeDraft({ ...creativeDraft, clicks: Number(ev.target.value) })} />
                  </label>
                  <label>
                    <span>Investimento</span>
                    <input
                      value={formatBrlInputDigits((creativeDraft.spendCents ?? 0) / 100)}
                      onChange={(ev) =>
                        setCreativeDraft({
                          ...creativeDraft,
                          spendCents: Math.round(parseBrlInput(ev.target.value) * 100),
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>UTM Source</span>
                    <input value={creativeDraft.utmSource} onChange={(ev) => setCreativeDraft({ ...creativeDraft, utmSource: ev.target.value })} />
                  </label>
                  <label>
                    <span>UTM Medium</span>
                    <input value={creativeDraft.utmMedium} onChange={(ev) => setCreativeDraft({ ...creativeDraft, utmMedium: ev.target.value })} />
                  </label>
                  <label>
                    <span>UTM Campaign</span>
                    <input value={creativeDraft.utmCampaign} onChange={(ev) => setCreativeDraft({ ...creativeDraft, utmCampaign: ev.target.value })} />
                  </label>
                  <label>
                    <span>UTM Content</span>
                    <input value={creativeDraft.utmContent} onChange={(ev) => setCreativeDraft({ ...creativeDraft, utmContent: ev.target.value })} />
                  </label>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-primary btn-sm" onClick={saveCreative} disabled={busy}>
                    {editingCreativeId ? 'Salvar criativo' : 'Adicionar criativo'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function MarketingCampaignsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('marketing.campanhas.manage');
  const router = useCrudRouter();
  const filterDefinitions = useMemo(() => [activeStatusFilter()], []);

  const { data: rows, loading, error, reload } = useAsyncResource(
    () => getMarketingCampaigns(true),
    [],
  );

  const list = useCrudList(rows ?? [], {
    storageKey: LIST_PREFERENCE_KEYS.marketingCampaigns,
    searchKeys: ['name', 'slug', 'platformLabel', 'statusLabel'],
    filterDefinitions,
    defaultSort: { key: 'name', direction: 'asc' },
  });

  const { data: detail, reload: reloadDetail } = useAsyncResource(
    () => (router.id ? getMarketingCampaign(router.id) : Promise.resolve(null)),
    [router.id],
  );
  const { data: landingPageOptions } = useAsyncResource(
    () => (router.id ? getMarketingLandingPageOptions(router.id) : Promise.resolve([])),
    [router.id],
  );

  if (loading) return <AppLoadingPanel label="Carregando campanhas…" />;

  if (router.isCreating) {
    return (
      <PermissionGate permission="marketing.campanhas.manage">
        <CampaignForm
          title="Nova campanha"
          subtitle="Cadastre campanhas e acompanhe criativos das redes sociais."
          breadcrumbs={[{ label: 'Campanhas', onClick: router.goToList }, { label: 'Nova campanha' }]}
          initial={campaignToForm(null)}
          onCancel={router.goToList}
          onSubmit={async (payload) => {
            await createMarketingCampaign(payload);
            await reload();
            router.goToList();
          }}
        />
      </PermissionGate>
    );
  }

  if (router.isEditing && detail) {
    return (
      <PermissionGate permission="marketing.campanhas">
        <CampaignForm
          key={`${detail.id}-${detail.updatedAt}`}
          title="Editar campanha"
          subtitle={detail.name}
          breadcrumbs={[{ label: 'Campanhas', onClick: router.goToList }, { label: detail.name }]}
          initial={campaignToForm(detail)}
          onCancel={router.goToList}
          onSubmit={async (payload) => {
            await updateMarketingCampaign(detail.id, payload);
            await Promise.all([reload(), reloadDetail()]);
          }}
          onDelete={
            canManage
              ? async () => {
                  const confirmed = await confirmCrudDelete('campanha', detail.name);
                  if (!confirmed) return;
                  await deactivateMarketingCampaign(detail.id);
                  await reload();
                  router.goToList();
                }
              : undefined
          }
          onCreativeSave={async (creativeId, payload) => {
            if (creativeId) {
              await updateMarketingCreative(detail.id, creativeId, payload);
            } else {
              await createMarketingCreative(detail.id, payload);
            }
            const next = await getMarketingCampaign(detail.id);
            await reloadDetail();
            return next;
          }}
          onCreativeDelete={async (creativeId) => {
            const confirmed = await confirmCrudDelete('criativo');
            if (!confirmed) return;
            await deactivateMarketingCreative(detail.id, creativeId);
            await reloadDetail();
          }}
          landingPageOptions={landingPageOptions ?? []}
        />
      </PermissionGate>
    );
  }

  if (router.isViewing && detail) {
    return (
      <PermissionGate permission="marketing.campanhas">
        <CampaignForm
          title={detail.name}
          subtitle={`${detail.platformLabel} · ${detail.statusLabel}`}
          breadcrumbs={[{ label: 'Campanhas', onClick: router.goToList }, { label: detail.name }]}
          initial={{ ...campaignToForm(detail), readOnly: true }}
          readOnly
          onCancel={router.goToList}
        />
      </PermissionGate>
    );
  }

  return (
    <PermissionGate permission="marketing.campanhas">
      <CrudListShell
        title="Campanhas"
        subtitle="Organize campanhas e criativos das redes sociais com métricas de performance."
        addLabel="Nova campanha"
        onAdd={canManage ? router.goToCreate : undefined}
        canAdd={canManage}
        error={error}
        query={list.query}
        onQueryChange={list.onQueryChange}
        searchPlaceholder="Buscar por nome, slug ou plataforma"
        sortKey={list.sortKey}
        sortDirection={list.sortDirection}
        onSortChange={list.setSort}
        sortOptions={[
          { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
          { key: 'platformLabel', direction: 'asc', label: 'Plataforma (A–Z)' },
          { key: 'statusLabel', direction: 'asc', label: 'Status (A–Z)' },
        ]}
        filterDefinitions={filterDefinitions}
        fieldFilters={list.fieldFilters}
        onApplyFieldFilter={list.applyFieldFilter}
        onRemoveFieldFilter={list.removeFieldFilter}
        onClearFieldFilters={list.clearFieldFilters}
        page={list.page}
        pageSize={list.pageSize}
        totalItems={list.totalItems}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onPageSizeChange={list.onPageSizeChange}
        columns={[
          { key: 'name', label: 'Campanha', sortable: true },
          { key: 'platformLabel', label: 'Plataforma', sortable: true },
          { key: 'statusLabel', label: 'Status', sortable: true },
          {
            key: 'submissionCount',
            label: 'Leads',
            render: (row) => row.submissionCount ?? 0,
          },
          {
            key: 'ctr',
            label: 'CTR',
            render: (row) => `${row.ctr ?? 0}%`,
          },
          {
            key: 'conversionRate',
            label: 'Conversão',
            render: (row) => `${row.conversionRate ?? 0}%`,
          },
          {
            key: 'active',
            label: 'Situação',
            render: (row) => (
              <span className={inactiveBadgeClass(row.active)}>{inactiveLabel(row.active)}</span>
            ),
          },
        ]}
        rows={list.rows}
        onView={(row) => router.goToView(row.id)}
        onEdit={canManage ? (row) => router.goToEdit(row.id) : undefined}
        canManage={canManage}
      />
    </PermissionGate>
  );
}
