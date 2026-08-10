import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';
import {
  COMPANIES_PAGE_SIZE,
  countCompaniesByStatus,
  filterCompanies,
  paginateItems,
} from '../utils/companiesList.js';

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
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function ListPagination({ page, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1) {
    return (
      <div className="list-pagination">
        <span className="list-pagination-meta">{totalItems} empresa(s)</span>
      </div>
    );
  }

  return (
    <div className="list-pagination">
      <span className="list-pagination-meta">
        {totalItems} empresa(s) · página {page} de {totalPages}
      </span>
      <div className="list-pagination-actions">
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

export function CompaniesList({
  companies,
  statusFilter,
  searchQuery,
  page,
  error,
  onFilterChange,
  onSearchChange,
  onPageChange,
  onEdit,
}) {
  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const counts = useMemo(() => countCompaniesByStatus(companies), [companies]);

  const filtered = useMemo(
    () => filterCompanies(companies, { status: statusFilter, query: searchQuery }),
    [companies, statusFilter, searchQuery],
  );

  const pagination = useMemo(
    () => paginateItems(filtered, page, COMPANIES_PAGE_SIZE),
    [filtered, page],
  );

  const applySearch = () => {
    onSearchChange(searchInput);
  };

  const clearSearch = () => {
    setSearchInput('');
    onSearchChange('');
  };

  return (
    <div className="page-stack companies-page">
      <PageHeader
        title="Empresas corporativas"
        subtitle="Cadastros do portal corporativo — aprovação, gestores de RH e visão dos colaboradores."
      />

      {error ? <div className="alert-banner alert-banner-error">{error}</div> : null}

      <div className="stat-grid companies-stat-grid">
        <article className="panel stat-panel">
          <span className="stat-label">Total</span>
          <strong className="stat-value">{counts.total}</strong>
        </article>
        <article className="panel stat-panel">
          <span className="stat-label">Pendentes</span>
          <strong className="stat-value">{counts.pending}</strong>
        </article>
        <article className="panel stat-panel">
          <span className="stat-label">Ativas</span>
          <strong className="stat-value">{counts.active}</strong>
        </article>
        <article className="panel stat-panel">
          <span className="stat-label">Suspensas</span>
          <strong className="stat-value">{counts.suspended}</strong>
        </article>
      </div>

      <section className="panel">
        <div className="panel-header list-toolbar-header">
          <h2>Empresas cadastradas</h2>
          <span className="panel-meta">
            {filtered.length} de {counts.total} na listagem
          </span>
        </div>

        <div className="panel-body list-toolbar-body">
          <div className="list-toolbar">
            <div className="list-toolbar-search">
              <input
                type="search"
                className="list-toolbar-input"
                placeholder="Buscar por nome, CNPJ, e-mail…"
                value={searchInput}
                onChange={(ev) => setSearchInput(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter') {
                    ev.preventDefault();
                    applySearch();
                  }
                }}
              />
              <button type="button" className="btn-primary btn-sm" onClick={applySearch}>
                Buscar
              </button>
              {searchQuery ? (
                <button type="button" className="btn-ghost btn-sm" onClick={clearSearch}>
                  Limpar
                </button>
              ) : null}
            </div>

            <div className="list-toolbar-filters">
              <button
                type="button"
                className={`filter-chip${statusFilter === '' ? ' active' : ''}`}
                onClick={() => onFilterChange('')}
              >
                Todas
              </button>
              <button
                type="button"
                className={`filter-chip${statusFilter === 'pending' ? ' active' : ''}`}
                onClick={() => onFilterChange('pending')}
              >
                Pendentes
                {counts.pending > 0 ? <span className="filter-chip-count">{counts.pending}</span> : null}
              </button>
              <button
                type="button"
                className={`filter-chip${statusFilter === 'active' ? ' active' : ''}`}
                onClick={() => onFilterChange('active')}
              >
                Ativas
              </button>
              <button
                type="button"
                className={`filter-chip${statusFilter === 'suspended' ? ' active' : ''}`}
                onClick={() => onFilterChange('suspended')}
              >
                Suspensas
              </button>
            </div>
          </div>
        </div>

        <div className="panel-body panel-body-flush">
          {pagination.items.length === 0 ? (
            <div className="empty-state">
              {companies.length === 0
                ? 'Nenhuma empresa cadastrada.'
                : 'Nenhuma empresa corresponde aos filtros aplicados.'}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table data-table-enterprise">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>CNPJ</th>
                    <th>Contato</th>
                    <th>Status</th>
                    <th>Gestores</th>
                    <th>Colaboradores</th>
                    <th>Cadastro</th>
                    <th className="col-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.items.map((company) => (
                    <tr
                      key={company.id}
                      className="data-table-row-clickable"
                      onClick={() => onEdit(company.id)}
                    >
                      <td>
                        <strong>{company.tradeName}</strong>
                        <div className="table-sub">{company.legalName}</div>
                      </td>
                      <td>{company.cnpj}</td>
                      <td>
                        <div>{company.email}</div>
                        {company.phone ? (
                          <div className="table-sub">{company.phone}</div>
                        ) : null}
                      </td>
                      <td>
                        <span className={STATUS_CLASS[company.status] ?? 'badge badge-muted'}>
                          {STATUS_LABEL[company.status] ?? company.status}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-muted">{company.managers ?? 0}</span>
                      </td>
                      <td>
                        <span className="badge badge-muted">{company.employees ?? 0}</span>
                      </td>
                      <td>{formatDate(company.createdAt)}</td>
                      <td className="table-actions col-actions">
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onEdit(company.id);
                          }}
                        >
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination.totalItems > 0 ? (
          <div className="panel-body list-pagination-wrap">
            <ListPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              onPageChange={onPageChange}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
