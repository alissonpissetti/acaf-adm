import { useCallback, useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader.jsx';
import { TableNetworkLogo } from '../components/TableNetworkLogo.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { DenseListRowIdentity } from '../components/crud/DenseListRowIdentity.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { CompanyRowMenu } from '../components/companies/CompanyRowMenu.jsx';
import { appConfirm } from '../components/confirm/appConfirm.js';
import { useFlashMessage } from '../components/flash/FlashMessageProvider.jsx';
import { selectFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { createCompanyManagerOnboardingInvite } from '../api/admin.js';
import {
  COMPANIES_PAGE_SIZE,
  companyDisplayName,
  companyMatchesSearch,
  countCompaniesByStatus,
} from '../utils/companiesList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';

const STATUS_LABEL = {
  pending: 'Pendente',
  active: 'Ativa',
  suspended: 'Suspensa',
};

const STATUS_CLASS = {
  pending: 'badge badge-warning',
  active: 'badge badge-success',
  suspended: 'badge badge-muted',
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function statusFilterValue(fieldFilters) {
  const match = fieldFilters.find((item) => item.id === 'status');
  return match?.value ?? '';
}

function CompanyScaleSummary({ company }) {
  const managers = company.managers ?? 0;
  const employees = company.employees ?? 0;
  return (
    <div className="networks-scale-summary" role="group" aria-label="Resumo da empresa">
      <div className="networks-scale-chip" title="Gestores de RH com acesso ao portal">
        <span className="networks-scale-chip__label">Gest.</span>
        <span className="badge badge-muted">{managers}</span>
      </div>
      <div className="networks-scale-chip" title="Colaboradores cadastrados">
        <span className="networks-scale-chip__label">Colab.</span>
        <span className="badge badge-muted">{employees}</span>
      </div>
    </div>
  );
}

function StatPanel({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      className={`panel stat-panel companies-stat-panel${active ? ' companies-stat-panel--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="stat-label">{label}</span>
      <strong className="stat-value stat-value--hero">{value}</strong>
    </button>
  );
}

export function CompaniesList({
  companies,
  loading = false,
  error,
  onAdd,
  onView,
  onEdit,
  onDelete,
  onReload,
}) {
  const flash = useFlashMessage();
  const [openRowMenuId, setOpenRowMenuId] = useState(null);
  const [onboardingCopyBusyId, setOnboardingCopyBusyId] = useState(null);

  const filterDefinitions = useMemo(
    () => [
      selectFilter('status', 'Status', 'status', [
        { value: 'pending', label: 'Pendente' },
        { value: 'active', label: 'Ativa' },
        { value: 'suspended', label: 'Suspensa' },
      ]),
    ],
    [],
  );

  const list = useCrudList(companies, {
    filterDefinitions,
    matchesSearch: companyMatchesSearch,
    defaultSort: { key: 'tradeName', direction: 'asc' },
    defaultPageSize: COMPANIES_PAGE_SIZE,
    storageKey: LIST_PREFERENCE_KEYS.companies,
  });

  const counts = useMemo(() => countCompaniesByStatus(companies), [companies]);
  const statusFilter = statusFilterValue(list.fieldFilters);

  const setStatusFilter = (value) => {
    if (!value) list.removeFieldFilter('status');
    else list.applyFieldFilter({ id: 'status', value });
  };

  const onboardingActionMeta = useCallback(
    (row) => {
      const hasManager = (row.managers ?? 0) > 0;
      const busy = onboardingCopyBusyId === row.id;
      const invite = row.managerOnboardingInvite;
      const hasValidInvite = Boolean(invite?.inviteUrl && !invite?.expired && !invite?.used);
      const disabled = hasManager || busy;
      let title = 'Copiar link de onboarding do gestor';
      let menuLabel = 'Copiar link de onboarding';
      if (busy) {
        menuLabel = 'Gerando link…';
      } else if (hasManager) {
        title = 'Empresa já possui gestor — use a aba Gestores na ficha';
        menuLabel = 'Onboarding indisponível';
      } else if (!hasValidInvite) {
        title = 'Gerar link de onboarding (14 dias) e copiar';
        menuLabel = 'Gerar e copiar link';
      }
      return { disabled, title, menuLabel, busy };
    },
    [onboardingCopyBusyId],
  );

  const copyOnboardingUrl = async (row, ev) => {
    ev?.stopPropagation?.();
    if ((row.managers ?? 0) > 0) return;

    let url = row.managerOnboardingInvite?.inviteUrl;
    const invite = row.managerOnboardingInvite;
    const needsGenerate = !url || invite?.expired || invite?.used;

    if (needsGenerate) {
      setOnboardingCopyBusyId(row.id);
      try {
        const res = await createCompanyManagerOnboardingInvite(row.id);
        url = res.inviteUrl;
        onReload?.();
      } catch (err) {
        flash.error(err instanceof Error ? err.message : 'Não foi possível gerar o link.');
        return;
      } finally {
        setOnboardingCopyBusyId(null);
      }
    }

    if (!url) {
      flash.error('Nenhum link disponível. Abra a ficha na aba Cadastral para gerar.');
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      flash.success('Link de onboarding copiado.');
    } catch {
      flash.error('Não foi possível copiar. Tente novamente ou copie pela ficha da empresa.');
    }
  };

  const renderOnboardingCopyAction = (row) => {
    const { disabled, title, busy } = onboardingActionMeta(row);
    return (
      <button
        type="button"
        className="crud-icon-btn companies-onboarding-icon-btn"
        disabled={disabled}
        title={title}
        aria-label={title}
        onClick={(ev) => void copyOnboardingUrl(row, ev)}
      >
        {busy ? (
          '…'
        ) : (
          <Link2 size={15} strokeWidth={2} aria-hidden="true" />
        )}
      </button>
    );
  };

  const confirmDeleteCompany = async (row) => {
    if (row.canDelete === false) {
      flash.error(row.deleteBlockedReason || 'Não é possível excluir esta empresa.');
      return;
    }
    const label = companyDisplayName(row);
    const confirmed = await appConfirm({
      title: 'Excluir empresa',
      message: `Excluir "${label}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir empresa',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!confirmed || !onDelete) return;
    await onDelete(row);
  };

  return (
    <div className="page-stack crud-list-page companies-page">
      <PageHeader
        title="Empresas"
        subtitle="Cadastros do portal corporativo — aprovação, gestores de RH e visão dos colaboradores."
        actions={
          onAdd ? (
            <button type="button" className="btn-primary" onClick={onAdd}>
              Adicionar empresa
            </button>
          ) : null
        }
      />

      <CrudAlerts error={error} />

      {counts.pending > 0 ? (
        <div className="alert-banner alert-banner-warning">
          <strong>{counts.pending} empresa(s) aguardando aprovação.</strong> Abra a empresa na lista e
          clique em <strong>Aprovar empresa</strong> para liberar o portal corporativo e o código de
          adesão.
        </div>
      ) : null}

      <div className="stat-grid companies-stat-grid">
        <StatPanel
          label="Total"
          value={counts.total}
          active={statusFilter === ''}
          onClick={() => setStatusFilter('')}
        />
        <StatPanel
          label="Pendentes"
          value={counts.pending}
          active={statusFilter === 'pending'}
          onClick={() => setStatusFilter('pending')}
        />
        <StatPanel
          label="Ativas"
          value={counts.active}
          active={statusFilter === 'active'}
          onClick={() => setStatusFilter('active')}
        />
        <StatPanel
          label="Suspensas"
          value={counts.suspended}
          active={statusFilter === 'suspended'}
          onClick={() => setStatusFilter('suspended')}
        />
      </div>

      <section className="panel crud-list-panel companies-list-panel">
        <div className="panel-header panel-header--meta-only companies-list-panel-header">
          <h2>Empresas cadastradas</h2>
          <span className="panel-meta">
            {list.filteredCount} de {counts.total} na listagem
          </span>
        </div>

        <CrudListShell
          embedded
          loading={loading}
          query={list.query}
          onQueryChange={list.onQueryChange}
          searchPlaceholder="Buscar por nome, CNPJ, e-mail, telefone ou responsável comercial"
          toolbarLayout="compact"
          toolbarWrapClassName="crud-list-toolbar companies-list-toolbar"
          filterDefinitions={filterDefinitions}
          fieldFilters={list.fieldFilters}
          onApplyFieldFilter={list.applyFieldFilter}
          onRemoveFieldFilter={list.removeFieldFilter}
          onClearFieldFilters={list.clearFieldFilters}
          sortKey={list.sortKey}
          sortDirection={list.sortDirection}
          onSortChange={list.setSort}
          sortOptions={[
            { key: 'tradeName', direction: 'asc', label: 'Nome (A–Z)' },
            { key: 'tradeName', direction: 'desc', label: 'Nome (Z–A)' },
            { key: 'createdAt', direction: 'desc', label: 'Cadastro (recente)' },
            { key: 'createdAt', direction: 'asc', label: 'Cadastro (antigo)' },
            { key: 'status', direction: 'asc', label: 'Status' },
          ]}
          page={list.page}
          pageSize={list.pageSize}
          totalItems={list.totalItems}
          totalPages={list.totalPages}
          onPageChange={list.setPage}
          onPageSizeChange={list.onPageSizeChange}
          emptyMessage={
            companies.length === 0
              ? 'Nenhuma empresa cadastrada. Clique em Adicionar empresa para começar.'
              : 'Nenhuma empresa corresponde à busca ou aos filtros.'
          }
          tableClassName="dense-list-table dense-list-table--no-select companies-list-table"
          columns={[
            {
              key: 'logo',
              label: '',
              className: 'data-table-col-logo data-table-col-company-avatar',
              render: (row) => (
                <TableNetworkLogo name={companyDisplayName(row)} logoUrl={null} />
              ),
            },
            {
              key: 'name',
              label: 'Empresa',
              headerHint: 'Nome fantasia ou razão social. E-mail cadastrado logo abaixo.',
              className:
                'data-table-cell-wrap data-table-col-network-name data-table-col-company-name',
              render: (row) => (
                <DenseListRowIdentity
                  title={companyDisplayName(row)}
                  badge={STATUS_LABEL[row.status] ?? row.status}
                  badgeClassName={STATUS_CLASS[row.status] ?? 'badge-muted'}
                  meta={row.email || 'Sem e-mail cadastrado'}
                  metaClassName={row.email ? '' : 'muted'}
                  metaHref={row.email ? `mailto:${row.email}` : undefined}
                />
              ),
            },
            {
              key: 'status',
              label: 'Status',
              headerHint: 'Pendente aguarda aprovação no admin.',
              className: 'data-table-col-company-status dense-list-desktop-only',
              render: (row) => (
                <span className={STATUS_CLASS[row.status] ?? 'badge badge-muted'}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              ),
            },
            {
              key: 'cnpj',
              label: 'CNPJ',
              className: 'data-table-col-company-cnpj dense-list-desktop-only',
              render: (row) => row.cnpj ?? '—',
            },
            {
              key: 'scale',
              label: 'Resumo',
              headerAbbr: 'Resumo',
              headerHint: 'Gestores de RH e colaboradores cadastrados.',
              className: 'data-table-col-company-scale dense-list-desktop-only',
              render: (row) => <CompanyScaleSummary company={row} />,
            },
            {
              key: 'commercialOwnerName',
              label: 'Resp. comercial',
              headerAbbr: 'Comercial',
              className: 'data-table-col-company-commercial dense-list-desktop-only',
              render: (row) => row.commercialOwnerName ?? '—',
            },
            {
              key: 'createdAt',
              label: 'Cadastro',
              headerHint: 'Data de criação no admin.',
              className:
                'data-table-col-company-created data-table-cell-numeric dense-list-desktop-only',
              render: (row) => formatDate(row.createdAt),
            },
            {
              key: 'rowMenu',
              label: '',
              className: 'data-table-col-network-row-menu dense-list-mobile-only',
              render: (row) => {
                const onboarding = onboardingActionMeta(row);
                return (
                  <CompanyRowMenu
                    isOpen={openRowMenuId === row.id}
                    onToggle={() =>
                      setOpenRowMenuId((prev) => (prev === row.id ? null : row.id))
                    }
                    onClose={() => setOpenRowMenuId(null)}
                    onView={onView ? () => onView(row.id) : undefined}
                    onEdit={onEdit ? () => onEdit(row.id) : undefined}
                    onDelete={onDelete ? () => void confirmDeleteCompany(row) : undefined}
                    onCopyOnboarding={() => void copyOnboardingUrl(row, null)}
                    onboardingLabel={onboarding.menuLabel}
                    onboardingDisabled={onboarding.disabled}
                  />
                );
              },
            },
          ]}
          rows={list.rows}
          onRowClick={onView ? (row) => onView(row.id) : onEdit ? (row) => onEdit(row.id) : undefined}
          onView={onView ? (row) => onView(row.id) : undefined}
          onEdit={onEdit ? (row) => onEdit(row.id) : undefined}
          onDelete={onDelete ? (row) => void confirmDeleteCompany(row) : undefined}
          renderActionsExtra={renderOnboardingCopyAction}
        />
      </section>
    </div>
  );
}