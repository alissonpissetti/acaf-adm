import { useMemo } from 'react';
import { Building2, Calendar, Mail, Phone, UserCog, Users } from 'lucide-react';
import { PageHeader } from '../components/PageHeader.jsx';
import { CrudPagination } from '../components/crud/CrudListToolbar.jsx';
import { CrudRowActions } from '../components/crud/CrudRowActions.jsx';
import { AppLoading } from '../components/crud/AppLoading.jsx';
import { selectFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import {
  COMPANIES_PAGE_SIZE,
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

function formatPhoneDisplay(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function companyDisplayName(company) {
  return company.tradeName?.trim() || company.legalName?.trim() || 'Sem nome';
}

function companySecondaryName(company) {
  const trade = company.tradeName?.trim();
  const legal = company.legalName?.trim();
  if (trade && legal && trade !== legal) return legal;
  return null;
}

function companyInitials(company) {
  const name = companyDisplayName(company);
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function statusFilterValue(fieldFilters) {
  const match = fieldFilters.find((item) => item.id === 'status');
  return match?.value ?? '';
}

function CompanyMetaChip({ icon: Icon, label, value, href }) {
  if (!value || value === '—') return null;

  const content = href ? (
    <a href={href} onClick={(ev) => ev.stopPropagation()}>
      {value}
    </a>
  ) : (
    <span>{value}</span>
  );

  return (
    <span className="companies-registry-chip" title={label}>
      <Icon size={13} aria-hidden="true" />
      {content}
    </span>
  );
}

function CompanyRegistryCard({ company, onView, onEdit }) {
  const secondaryName = companySecondaryName(company);
  const phone = formatPhoneDisplay(company.phone);
  const hasSecondaryRow = Boolean(
    company.cnpj || company.email || phone || company.commercialOwnerName,
  );

  const open = () => (onView ? onView(company.id) : onEdit(company.id));

  return (
    <article
      className="companies-registry-card"
      onClick={open}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          open();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="companies-registry-row companies-registry-row--primary">
        <div className="companies-registry-avatar" aria-hidden="true">
          {companyInitials(company)}
        </div>

        <div className="companies-registry-identity">
          <h3 className="companies-registry-title">{companyDisplayName(company)}</h3>
          {secondaryName ? (
            <>
              <span className="companies-registry-dot" aria-hidden="true">
                ·
              </span>
              <span className="companies-registry-subtitle">{secondaryName}</span>
            </>
          ) : null}
        </div>

        <span className={STATUS_CLASS[company.status] ?? 'badge badge-muted'}>
          {STATUS_LABEL[company.status] ?? company.status}
        </span>

        <div className="companies-registry-metrics">
          <span className="companies-registry-metric" title="Gestores de RH vinculados">
            <Users size={14} aria-hidden="true" />
            <span className="companies-registry-metric-label">Gestores</span>
            <strong>{company.managers ?? 0}</strong>
          </span>
          <span className="companies-registry-metric" title="Colaboradores cadastrados">
            <UserCog size={14} aria-hidden="true" />
            <span className="companies-registry-metric-label">Colab.</span>
            <strong>{company.employees ?? 0}</strong>
          </span>
          <span className="companies-registry-metric" title="Data de cadastro">
            <Calendar size={14} aria-hidden="true" />
            <span className="companies-registry-metric-label">Cadastro</span>
            <strong>{formatDate(company.createdAt)}</strong>
          </span>
        </div>

        <div className="companies-registry-actions">
          <CrudRowActions
            onView={onView ? () => onView(company.id) : undefined}
            onEdit={() => onEdit(company.id)}
          />
        </div>
      </div>

      {hasSecondaryRow ? (
        <div className="companies-registry-row companies-registry-row--secondary">
          <CompanyMetaChip icon={Building2} label="CNPJ" value={company.cnpj || null} />
          <CompanyMetaChip
            icon={Mail}
            label="E-mail"
            value={company.email || null}
            href={company.email ? `mailto:${company.email}` : undefined}
          />
          <CompanyMetaChip
            icon={Phone}
            label="Telefone"
            value={phone || null}
            href={phone ? `tel:+55${String(company.phone).replace(/\D/g, '')}` : undefined}
          />
          {company.commercialOwnerName ? (
            <CompanyMetaChip
              icon={UserCog}
              label="Resp. comercial"
              value={company.commercialOwnerName}
            />
          ) : null}
        </div>
      ) : null}
    </article>
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
      <strong className="stat-value">{value}</strong>
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
}) {
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

  return (
    <div className="page-stack companies-page">
      <PageHeader
        title="Empresas corporativas"
        subtitle="Cadastros do portal corporativo — aprovação, gestores de RH e visão dos colaboradores."
        actions={
          onAdd ? (
            <button type="button" className="btn-primary" onClick={onAdd}>
              Adicionar empresa
            </button>
          ) : null
        }
      />

      {error ? <div className="alert-banner alert-banner-error">{error}</div> : null}

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

      <section className="panel companies-registry-panel">
        <div className="panel-header list-toolbar-header">
          <h2>Empresas cadastradas</h2>
          <span className="panel-meta">
            {list.filteredCount} de {counts.total} na listagem
          </span>
        </div>

        <div className="panel-body list-toolbar-body">
          <div className="list-toolbar">
            <div className="list-toolbar-search">
              <input
                type="search"
                className="list-toolbar-input"
                placeholder="Buscar por nome, CNPJ, e-mail…"
                value={list.query}
                onChange={(ev) => list.onQueryChange(ev.target.value)}
              />
              {list.query ? (
                <button type="button" className="btn-ghost btn-sm" onClick={() => list.onQueryChange('')}>
                  Limpar
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="panel-body companies-registry-body">
          {loading ? (
            <AppLoading label="Carregando empresas…" />
          ) : list.rows.length === 0 ? (
            <div className="empty-state">
              {companies.length === 0
                ? 'Nenhuma empresa cadastrada. Clique em Adicionar empresa para começar.'
                : 'Nenhuma empresa corresponde aos filtros aplicados.'}
            </div>
          ) : (
            <div className="companies-registry-list">
              {list.rows.map((company) => (
                <CompanyRegistryCard
                  key={company.id}
                  company={company}
                  onView={onView}
                  onEdit={onEdit}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && list.totalItems > 0 ? (
          <div className="panel-body crud-pagination-wrap">
            <CrudPagination
              page={list.page}
              pageSize={list.pageSize}
              totalPages={list.totalPages}
              totalItems={list.totalItems}
              onPageChange={list.setPage}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
