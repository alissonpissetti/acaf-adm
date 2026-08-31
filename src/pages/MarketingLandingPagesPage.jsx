import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCommercialFunnelOptions } from '../api/commercial.js';
import {
  createMarketingLandingPage,
  deactivateMarketingLandingPage,
  getMarketingCampaign,
  getMarketingCampaignOptions,
  getMarketingLandingPage,
  getMarketingLandingPages,
  updateMarketingLandingPage,
} from '../api/marketing.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { MarketingLandingPageEditor } from '../components/MarketingLandingPageEditor.jsx';
import { MarketingLandingPageMetricsPage } from './MarketingLandingPageMetricsPage.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { confirmCrudDelete, inactiveBadgeClass, inactiveLabel } from '../crud/crudUtils.js';
import { activeStatusFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { useAsyncResource, useCrudRouter } from '../crud/useCrudRouter.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { pageToForm } from '../utils/marketingFormBuilder.js';
import '../styles/marketing.css';
import '../styles/notifications.css';

export function MarketingLandingPagesPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('marketing.formularios.manage');
  const router = useCrudRouter();
  const filterDefinitions = useMemo(() => [activeStatusFilter()], []);

  const { data: rows, loading, error, reload } = useAsyncResource(
    () => getMarketingLandingPages(true),
    [],
  );

  const list = useCrudList(rows ?? [], {
    storageKey: LIST_PREFERENCE_KEYS.marketingLandingPages,
    searchKeys: ['name', 'slug', 'campaignName', 'headline'],
    filterDefinitions,
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

  if (loading) return <AppLoadingPanel label="Carregando formulários…" />;

  if (router.isCreating) {
    return (
      <PermissionGate permission="marketing.formularios.manage">
        <MarketingLandingPageEditor
          title="Novo formulário"
          subtitle="Crie uma landing page de captação que gera leads no funil comercial."
          breadcrumbs={[{ label: 'Formulários', onClick: router.goToList }, { label: 'Novo formulário' }]}
          initial={pageToForm(null)}
          campaignOptions={campaignOptions ?? []}
          funnelOptions={funnelOptions ?? []}
          creatives={creatives}
          onCampaignChange={loadCreatives}
          onCancel={router.goToList}
          onSubmit={async (payload) => {
            await createMarketingLandingPage(payload);
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
          initial={pageToForm(detail)}
          readOnly={router.isViewing}
          campaignOptions={campaignOptions ?? []}
          funnelOptions={funnelOptions ?? []}
          creatives={creatives}
          onCampaignChange={loadCreatives}
          onCancel={router.goToList}
          onOpenMetrics={() => router.goToMetrics(detail.id)}
          onSubmit={async (payload) => {
            await updateMarketingLandingPage(detail.id, payload);
            await Promise.all([reload(), reloadDetail()]);
          }}
          onDelete={
            canManage && router.isEditing
              ? async () => {
                  const confirmed = await confirmCrudDelete('formulário', detail.name);
                  if (!confirmed) return;
                  await deactivateMarketingLandingPage(detail.id);
                  await reload();
                  router.goToList();
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
        title="Formulários"
        subtitle="Landing pages de captação que alimentam o kanban comercial."
        addLabel="Novo formulário"
        onAdd={canManage ? router.goToCreate : undefined}
        canAdd={canManage}
        error={error}
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
          { key: 'name', label: 'Formulário', sortable: true },
          { key: 'campaignName', label: 'Campanha', render: (row) => row.campaignName ?? '—' },
          { key: 'viewCount', label: 'Views', sortable: true },
          {
            key: 'submissionCount',
            label: 'Envios',
            sortable: true,
          },
          {
            key: 'metrics',
            label: 'Métricas',
            render: (row) => (
              <button type="button" className="btn-ghost btn-sm" onClick={() => router.goToMetrics(row.id)}>
                Métricas
              </button>
            ),
          },
          {
            key: 'conversionRate',
            label: 'Conversão',
            render: (row) => `${row.conversionRate ?? 0}%`,
          },
          {
            key: 'publicUrl',
            label: 'URL',
            render: (row) => (
              <Link to={row.publicUrl} target="_blank" rel="noreferrer">
                {row.publicUrl}
              </Link>
            ),
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
