import { useEffect, useMemo, useState, useCallback } from 'react';
import { appAlert } from '../components/confirm/appConfirm.js';
import { getCommercialFunnelOptions } from '../api/commercial.js';
import {
  createMarketingLandingPage,
  getMarketingCampaign,
  getMarketingCampaignOptions,
  getMarketingLandingPage,
  getMarketingLandingPages,
  updateMarketingLandingPage,
} from '../api/marketing.js';
import {
  deactivateAndVerifyMarketingLandingPage,
  LEGACY_API_DEPLOY_MESSAGE,
} from '../api/marketingLandingPageDelete.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { MarketingLandingPageEditor } from '../components/MarketingLandingPageEditor.jsx';
import { MarketingLandingPageMetricsPage } from './MarketingLandingPageMetricsPage.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import {
  confirmMarketingLandingPageDelete,
  inactiveBadgeClass,
  inactiveLabel,
} from '../crud/crudUtils.js';
import { activeStatusFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { useAsyncResource, useCrudRouter } from '../crud/useCrudRouter.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { pageToForm } from '../utils/marketingFormBuilder.js';
import '../styles/marketing.css';

export function MarketingLandingPagesPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('marketing.formularios.manage');
  const router = useCrudRouter();
  const filterDefinitions = useMemo(() => [activeStatusFilter()], []);
  const defaultFieldFilters = useMemo(() => [{ id: 'active', value: true }], []);
  const [listMessage, setListMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: rows, loading, error, reload, setData } = useAsyncResource(
    () => getMarketingLandingPages(true),
    [],
  );

  const list = useCrudList(rows ?? [], {
    storageKey: LIST_PREFERENCE_KEYS.marketingLandingPages,
    searchKeys: ['name', 'slug', 'campaignName', 'headline'],
    filterDefinitions,
    defaultFieldFilters,
    defaultSort: { key: 'name', direction: 'asc' },
  });

  const { data: campaignOptions } = useAsyncResource(() => getMarketingCampaignOptions(), []);
  const { data: funnelOptions } = useAsyncResource(() => getCommercialFunnelOptions(), []);
  const { data: detail, reload: reloadDetail } = useAsyncResource(
    () => (router.id ? getMarketingLandingPage(router.id) : Promise.resolve(null)),
    [router.id],
  );
  const [creatives, setCreatives] = useState([]);

  useEffect(() => {
    if (!detail?.campaignId) {
      setCreatives([]);
      return;
    }
    getMarketingCampaign(detail.campaignId)
      .then((campaign) => setCreatives(campaign.creatives ?? []))
      .catch(() => setCreatives([]));
  }, [detail?.campaignId]);

  const loadCreatives = async (campaignId) => {
    if (!campaignId) {
      setCreatives([]);
      return;
    }
    const campaign = await getMarketingCampaign(campaignId);
    setCreatives(campaign.creatives ?? []);
  };

  /** Evita novo objeto a cada render (ex.: após loadCreatives), o que resetava o formulário. */
  const createFormInitial = useMemo(() => pageToForm(null), []);
  const editFormInitial = useMemo(
    () => (detail ? pageToForm(detail) : null),
    [detail],
  );

  const applyLandingPageRemoval = useCallback(
    (pageId, pageName) => {
      setData((current) => (current ?? []).filter((item) => item.id !== pageId));
      setListMessage(`Formulário "${pageName}" removido.`);
    },
    [setData],
  );

  const runVerifiedLandingPageDelete = useCallback(
    async (pageId, pageName) => {
      const { status } = await deactivateAndVerifyMarketingLandingPage(pageId, { force: true });
      if (status === 'removed') {
        applyLandingPageRemoval(pageId, pageName);
        await reload();
        return 'removed';
      }
      await reload();
      setListMessage(
        `Formulário "${pageName}" foi apenas inativado — a API em produção precisa de redeploy para exclusão definitiva.`,
      );
      await appAlert({
        title: 'API desatualizada em produção',
        message: LEGACY_API_DEPLOY_MESSAGE,
        tone: 'warning',
      });
      return 'legacy_soft_delete';
    },
    [applyLandingPageRemoval, reload],
  );

  const handleDelete = useCallback(
    async (row) => {
      if (!canManage) return;
      if (!(await confirmMarketingLandingPageDelete(row.name))) return;
      setListMessage('');
      setActionError('');
      try {
        await runVerifiedLandingPageDelete(row.id, row.name);
      } catch (err) {
        setActionError(err.message);
        await appAlert({
          title: 'Não foi possível excluir',
          message: err.message,
          tone: 'danger',
        });
      }
    },
    [canManage, runVerifiedLandingPageDelete],
  );

  if (loading) return <AppLoadingPanel label="Carregando formulários…" />;

  if (router.isCreating) {
    return (
      <PermissionGate permission="marketing.formularios.manage">
        <MarketingLandingPageEditor
          title="Novo formulário"
          subtitle="Crie uma landing page de captação que gera leads no funil comercial."
          breadcrumbs={[{ label: 'Formulários', onClick: router.goToList }, { label: 'Novo formulário' }]}
          initial={createFormInitial}
          campaignOptions={campaignOptions ?? []}
          funnelOptions={funnelOptions ?? []}
          creatives={creatives}
          onCampaignChange={loadCreatives}
          onCancel={router.goToList}
          onSubmit={(payload) => createMarketingLandingPage(payload)}
          onSaved={async () => {
            await reload();
            router.goToList();
          }}
        />
      </PermissionGate>
    );
  }

  if (router.isMetrics && detail) {
    return (
      <PermissionGate permission="marketing.formularios">
        <MarketingLandingPageMetricsPage
          pageId={detail.id}
          pageName={detail.name}
          canManage={canManage}
          onBack={router.goToList}
          onConfigure={() => router.goToEdit(detail.id)}
        />
      </PermissionGate>
    );
  }

  if ((router.isEditing || router.isViewing) && detail) {
    return (
      <PermissionGate permission="marketing.formularios">
        <MarketingLandingPageEditor
          title={router.isViewing ? detail.name : 'Editar formulário'}
          subtitle={detail.headline}
          breadcrumbs={[{ label: 'Formulários', onClick: router.goToList }, { label: detail.name }]}
          initial={editFormInitial}
          readOnly={router.isViewing}
          campaignOptions={campaignOptions ?? []}
          funnelOptions={funnelOptions ?? []}
          creatives={creatives}
          onCampaignChange={loadCreatives}
          onCancel={router.goToList}
          onEdit={canManage && router.isViewing ? () => router.goToEdit(detail.id) : undefined}
          onOpenMetrics={() => router.goToMetrics(detail.id)}
          onSubmit={(payload) => updateMarketingLandingPage(detail.id, payload)}
          onSaved={async () => {
            await Promise.all([reload(), reloadDetail()]);
          }}
          onDelete={
            canManage && router.isEditing
              ? async () => {
                  if (!(await confirmMarketingLandingPageDelete(detail.name))) return;
                  try {
                    const outcome = await runVerifiedLandingPageDelete(detail.id, detail.name);
                    if (outcome === 'removed') {
                      router.goToList();
                    }
                  } catch (err) {
                    await appAlert({
                      title: 'Não foi possível excluir',
                      message: err.message,
                      tone: 'danger',
                    });
                  }
                }
              : undefined
          }
        />
      </PermissionGate>
    );
  }

  return (
    <PermissionGate permission="marketing.formularios">
      <CrudListShell
        tableClassName="marketing-landing-pages-table"
        title="Formulários"
        subtitle="Landing pages de captação que alimentam o kanban comercial."
        addLabel="Novo formulário"
        onAdd={canManage ? router.goToCreate : undefined}
        canAdd={canManage}
        error={actionError || error}
        message={listMessage}
        query={list.query}
        onQueryChange={list.onQueryChange}
        searchPlaceholder="Buscar por nome, slug ou campanha"
        sortKey={list.sortKey}
        sortDirection={list.sortDirection}
        onSortChange={list.setSort}
        sortOptions={[
          { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
          { key: 'viewCount', direction: 'desc', label: 'Views (maior)' },
          { key: 'submissionCount', direction: 'desc', label: 'Envios (maior)' },
          { key: 'leadsCount', direction: 'desc', label: 'Leads (maior)' },
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
          {
            key: 'name',
            label: 'Formulário',
            sortable: true,
            className: 'data-table-cell-wrap data-table-col-marketing-landing-name',
            render: (row) => {
              const campaignName = row.campaignName?.trim() || '';
              return (
                <span className="marketing-landing-pages-name-cell">
                  <strong className="marketing-landing-pages-name">{row.name}</strong>
                  {row.slug ? (
                    <span className="marketing-landing-pages-slug muted" title={`Slug: ${row.slug}`}>
                      /{row.slug}
                    </span>
                  ) : null}
                  <span
                    className="marketing-landing-pages-campaign muted"
                    title={campaignName || 'Sem campanha vinculada'}
                  >
                    {campaignName || 'Sem campanha'}
                  </span>
                </span>
              );
            },
          },
          {
            key: 'viewCount',
            label: 'Views',
            mobileLabel: 'Views',
            sortable: true,
            className: 'data-table-cell-numeric data-table-col-marketing-landing-metric',
          },
          {
            key: 'submissionCount',
            label: 'Envios',
            mobileLabel: 'Envios',
            sortable: true,
            className: 'data-table-cell-numeric data-table-col-marketing-landing-metric',
          },
          {
            key: 'leadsCount',
            label: 'Leads',
            mobileLabel: 'Leads',
            headerHint: 'Leads comerciais gerados pelo formulário',
            sortable: true,
            className: 'data-table-cell-numeric data-table-col-marketing-landing-metric',
          },
          {
            key: 'metrics',
            label: 'Métricas',
            headerHint: 'Abrir painel de métricas do formulário',
            className:
              'data-table-col-marketing-landing-metrics data-table-col-marketing-landing-metrics-desktop',
            render: (row) => (
              <button
                type="button"
                className="btn-ghost btn-sm marketing-landing-pages-metrics-btn"
                onClick={(ev) => {
                  ev.stopPropagation();
                  router.goToMetrics(row.id);
                }}
              >
                Métricas
              </button>
            ),
          },
          {
            key: 'conversionRate',
            label: 'Conversão',
            mobileLabel: 'Conv.',
            headerHint: 'Taxa de conversão (envios ÷ views)',
            className:
              'data-table-cell-numeric data-table-col-marketing-landing-conversion',
            render: (row) => `${row.conversionRate ?? 0}%`,
          },
          {
            key: 'active',
            label: 'Situação',
            mobileLabel: 'Situação',
            className: 'data-table-col-marketing-landing-situation',
            render: (row) => (
              <span className={inactiveBadgeClass(row.active)}>{inactiveLabel(row.active)}</span>
            ),
          },
        ]}
        rows={list.rows}
        onRowClick={(row) => router.goToView(row.id)}
        onView={(row) => {
          const url = row.publicUrl || (row.slug ? `/f/${row.slug}` : '');
          if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
          }
          router.goToView(row.id);
        }}
        onEdit={canManage ? (row) => router.goToEdit(row.id) : undefined}
        onDelete={canManage ? handleDelete : undefined}
        canManage={canManage}
      />
    </PermissionGate>
  );
}
