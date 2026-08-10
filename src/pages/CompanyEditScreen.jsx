import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';
import { CompanyManagersField } from '../components/CompanyManagersField.jsx';
import { getCompany, updateCompanyStatus } from '../api/admin.js';
import { paginateItems } from '../utils/companiesList.js';

const EMPLOYEE_PAGE_SIZE = 20;

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

const EMPLOYEE_STATUS_LABEL = {
  pending: 'Pendente',
  invited: 'Convite enviado',
  active: 'Ativo',
  inactive: 'Inativo',
};

const EMPLOYEE_STATUS_CLASS = {
  pending: 'badge badge-warning',
  invited: 'badge badge-muted',
  active: 'badge badge-success',
  inactive: 'badge badge-muted',
};

function countManagers(company) {
  if (!company) return 0;
  if (Array.isArray(company.managers)) return company.managers.length;
  return company.managers ?? 0;
}

function countEmployees(company) {
  if (!company) return 0;
  if (Array.isArray(company.employees)) return company.employees.length;
  return company.employees ?? 0;
}

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

function employeeMatchesSearch(employee, query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  return (
    employee.name.toLowerCase().includes(trimmed) ||
    employee.email.toLowerCase().includes(trimmed) ||
    (employee.mobilePhone ?? '').toLowerCase().includes(trimmed)
  );
}

export function CompanyEditScreen({ companyId, onBack, onUpdated }) {
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeePage, setEmployeePage] = useState(1);

  const load = () => {
    getCompany(companyId)
      .then(setCompany)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    setCompany(null);
    setError('');
    setMessage('');
    setEmployeeSearch('');
    setEmployeePage(1);
    load();
  }, [companyId]);

  const setStatus = async (status) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateCompanyStatus(companyId, status);
      setCompany((prev) => ({ ...prev, ...updated }));
      if (status === 'active' && updated.enrollmentCode) {
        setMessage(`Empresa aprovada. Código de adesão para o app: ${updated.enrollmentCode}`);
      } else {
        setMessage(`Status atualizado para ${STATUS_LABEL[status] ?? status}.`);
      }
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const employees = Array.isArray(company?.employees) ? company.employees : [];
  const filteredEmployees = useMemo(
    () => employees.filter((emp) => employeeMatchesSearch(emp, employeeSearch)),
    [employees, employeeSearch],
  );
  const employeePagination = useMemo(
    () => paginateItems(filteredEmployees, employeePage, EMPLOYEE_PAGE_SIZE),
    [filteredEmployees, employeePage],
  );

  if (!company && !error) {
    return (
      <div className="page-stack">
        <PageHeader
          breadcrumbs={[{ label: 'Empresas', onClick: onBack }]}
          title="Carregando empresa…"
          actions={
            <button type="button" className="btn-ghost" onClick={onBack}>
              Voltar para lista
            </button>
          }
        />
        <div className="panel">
          <div className="panel-body">Buscando dados cadastrais, gestores e colaboradores.</div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="page-stack">
        <PageHeader
          breadcrumbs={[{ label: 'Empresas', onClick: onBack }]}
          title="Empresa não encontrada"
          actions={
            <button type="button" className="btn-ghost" onClick={onBack}>
              Voltar para lista
            </button>
          }
        />
        <div className="alert-banner alert-banner-error">
          {error || 'Não foi possível localizar este cadastro.'}
        </div>
      </div>
    );
  }

  const managerCount = countManagers(company);
  const employeeCount = countEmployees(company);

  return (
    <div className="page-stack company-detail-page">
      <PageHeader
        breadcrumbs={[
          { label: 'Empresas', onClick: onBack },
          { label: company.tradeName },
        ]}
        title={company.tradeName}
        subtitle={company.legalName}
        actions={
          <button type="button" className="btn-ghost" onClick={onBack}>
            Voltar para lista
          </button>
        }
      />

      {error ? <div className="alert-banner alert-banner-error">{error}</div> : null}
      {message ? <div className="alert-banner alert-banner-success">{message}</div> : null}

      <section className="panel company-detail-hero">
        <div className="company-detail-hero-body">
          <div className="company-detail-hero-main">
            <span className={STATUS_CLASS[company.status] ?? 'badge badge-muted'}>
              {STATUS_LABEL[company.status] ?? company.status}
            </span>
            <p className="company-detail-meta">
              CNPJ {company.cnpj} · Cadastro em {formatDate(company.createdAt)}
            </p>
            <p className="company-detail-meta">
              {company.email}
              {company.phone ? ` · ${company.phone}` : ''}
            </p>
          </div>

          <div className="company-detail-stats">
            <div className="company-detail-stat">
              <span>Gestores RH</span>
              <strong>{managerCount}</strong>
            </div>
            <div className="company-detail-stat">
              <span>Colaboradores</span>
              <strong>{employeeCount}</strong>
            </div>
          </div>
        </div>

        <div className="company-detail-actions">
          {company.status === 'pending' && (
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => setStatus('active')}
            >
              Aprovar empresa
            </button>
          )}
          {company.status === 'active' && (
            <button
              type="button"
              className="btn-ghost btn-danger"
              disabled={busy}
              onClick={() => setStatus('suspended')}
            >
              Suspender empresa
            </button>
          )}
          {company.status === 'suspended' && (
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => setStatus('active')}
            >
              Reativar empresa
            </button>
          )}
        </div>
      </section>

      <div className="company-detail-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Dados cadastrais</h2>
          </div>
          <div className="panel-body">
            <dl className="detail-grid detail-grid-dl">
              <div>
                <dt>Razão social</dt>
                <dd>{company.legalName}</dd>
              </div>
              <div>
                <dt>Nome fantasia</dt>
                <dd>{company.tradeName}</dd>
              </div>
              <div>
                <dt>CNPJ</dt>
                <dd>{company.cnpj}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{company.email}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{company.phone || '—'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={STATUS_CLASS[company.status] ?? 'badge badge-muted'}>
                    {STATUS_LABEL[company.status] ?? company.status}
                  </span>
                </dd>
              </div>
              {company.status === 'active' && company.enrollmentCode ? (
                <div>
                  <dt>Código de adesão (app)</dt>
                  <dd>
                    <code className="enrollment-code-admin">{company.enrollmentCode}</code>
                    <p className="field-hint">
                      Colaboradores usam este código em Minha conta no app ACAF Connect.
                    </p>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Gestores de RH</h2>
            <span className="panel-meta">{managerCount} vinculado(s)</span>
          </div>
          <div className="panel-body">
            <CompanyManagersField companyId={companyId} disabled={busy} onChanged={load} />
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header list-toolbar-header">
          <h2>Colaboradores</h2>
          <span className="panel-meta">{employeeCount} cadastrado(s)</span>
        </div>

        {employees.length > 0 ? (
          <div className="panel-body list-toolbar-body">
            <div className="list-toolbar list-toolbar-compact">
              <div className="list-toolbar-search">
                <input
                  type="search"
                  className="list-toolbar-input"
                  placeholder="Buscar colaborador por nome ou e-mail…"
                  value={employeeSearch}
                  onChange={(ev) => {
                    setEmployeeSearch(ev.target.value);
                    setEmployeePage(1);
                  }}
                />
                {employeeSearch ? (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      setEmployeeSearch('');
                      setEmployeePage(1);
                    }}
                  >
                    Limpar
                  </button>
                ) : null}
              </div>
              <span className="panel-meta">
                {filteredEmployees.length} de {employeeCount} na listagem
              </span>
            </div>
          </div>
        ) : null}

        <div className="panel-body panel-body-flush">
          {employees.length === 0 ? (
            <div className="empty-state">Nenhum colaborador cadastrado nesta empresa.</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="empty-state">Nenhum colaborador corresponde à busca.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table data-table-enterprise">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Celular</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employeePagination.items.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <strong>{emp.name}</strong>
                      </td>
                      <td>{emp.email}</td>
                      <td>{emp.mobilePhone ?? '—'}</td>
                      <td>
                        <span className={EMPLOYEE_STATUS_CLASS[emp.status] ?? 'badge badge-muted'}>
                          {EMPLOYEE_STATUS_LABEL[emp.status] ?? emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filteredEmployees.length > 0 ? (
          <div className="panel-body list-pagination-wrap">
            <div className="list-pagination">
              <span className="list-pagination-meta">
                {employeePagination.totalItems} colaborador(es)
                {employeePagination.totalPages > 1
                  ? ` · página ${employeePagination.page} de ${employeePagination.totalPages}`
                  : ''}
              </span>
              {employeePagination.totalPages > 1 ? (
                <div className="list-pagination-actions">
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={employeePagination.page <= 1}
                    onClick={() => setEmployeePage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={employeePagination.page >= employeePagination.totalPages}
                    onClick={() => setEmployeePage((p) => p + 1)}
                  >
                    Próxima
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
