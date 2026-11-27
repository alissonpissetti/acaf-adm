import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Calendar,
  ChevronRight,
  Mail,
  Phone,
  Search,
  UserCog,
  Users,
} from 'lucide-react';
import { SuccessFlashEffect } from '../components/flash/FlashMessageProvider.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { CrudPagination } from '../components/crud/CrudListToolbar.jsx';
import { CompanyManagersField } from '../components/CompanyManagersField.jsx';
import { CompanyMonthlyStatementsSection } from '../components/CompanyMonthlyStatementsSection.jsx';
import { PayerMembershipFeesSection } from '../components/PayerMembershipFeesSection.jsx';
import { CompanyUsageSection } from '../components/companies/CompanyUsageSection.jsx';
import { CompanyManagerOnboardingPanel } from '../components/companies/CompanyManagerOnboardingPanel.jsx';
import { getCompany, updateCompanyStatus, deleteCompany, removeCompanyEmployee } from '../api/admin.js';
import { appConfirm } from '../components/confirm/appConfirm.js';
import {
  companyDisplayName,
  companyInitials,
  companySecondaryName,
  paginateItems,
  personInitials,
  sortPeopleByName,
} from '../utils/companiesList.js';

const EMPLOYEE_PAGE_SIZE = 20;

const COMPANY_TABS = [
  { id: 'cadastral', label: 'Cadastral' },
  { id: 'extrato', label: 'Extrato' },
  { id: 'uso', label: 'Check-ins / uso' },
  { id: 'gestores', label: 'Gestores' },
  { id: 'colaboradores', label: 'Colaboradores' },
];

const COMPANY_TAB_IDS = new Set(COMPANY_TABS.map((tab) => tab.id));

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

function formatPhoneDisplay(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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

function CompanyDetailChip({ icon: Icon, label, children }) {
  if (!children) return null;
  return (
    <span className="company-detail-chip" title={label}>
      <Icon size={14} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

function CompanyEmployeeCard({ employee, busy, readOnly, onView, onRemove }) {
  return (
    <li
      className="company-employee-row"
      onClick={onView}
      onKeyDown={(ev) => {
        if (!onView) return;
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onView();
        }
      }}
      role={onView ? 'button' : undefined}
      tabIndex={onView ? 0 : undefined}
    >
      <div className="company-employee-row-main">
        <div className="company-employee-avatar" aria-hidden="true">
          {personInitials(employee.name)}
        </div>
        <div className="company-employee-main">
          <strong className="company-employee-name">{employee.name}</strong>
          <span className="company-employee-meta">
            {employee.email}
            {employee.mobilePhone ? ` · ${formatPhoneDisplay(employee.mobilePhone)}` : ''}
          </span>
        </div>
      </div>

      <div className="company-employee-row-side">
        <span className={EMPLOYEE_STATUS_CLASS[employee.status] ?? 'badge badge-muted'}>
          {EMPLOYEE_STATUS_LABEL[employee.status] ?? employee.status}
        </span>
        <div className="company-employee-actions">
          {onView ? (
            <button
              type="button"
              className="btn-ghost btn-sm company-employee-profile-btn"
              onClick={(ev) => {
                ev.stopPropagation();
                onView();
              }}
            >
              Ver perfil
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          ) : null}
          {!readOnly ? (
            <button
              type="button"
              className="btn-ghost btn-sm btn-danger"
              disabled={busy}
              onClick={(ev) => {
                ev.stopPropagation();
                onRemove();
              }}
            >
              Remover
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function CompanyEditScreen({
  companyId,
  readOnly = false,
  onBack,
  onEdit,
  onViewEmployee,
  onUpdated,
  onDeleted,
}) {
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeePage, setEmployeePage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const activeTab = COMPANY_TAB_IDS.has(tabFromUrl) ? tabFromUrl : 'cadastral';

  const setActiveTab = (tabId) => {
    const next = new URLSearchParams(searchParams);
    if (tabId === 'cadastral') next.delete('tab');
    else next.set('tab', tabId);
    setSearchParams(next, { replace: true });
  };

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

  const removeCompany = async () => {
    if (company?.canDelete === false) return;
    const label = companyDisplayName(company);
    const confirmed = await appConfirm({
      title: 'Excluir empresa',
      message: `Excluir "${label}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir empresa',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!confirmed) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await deleteCompany(companyId);
      onDeleted?.();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const removeEmployee = async (employee) => {
    if (
      !(await appConfirm({
        title: 'Remover colaborador',
        message: `Remover ${employee.name} desta empresa? O cadastro do colaborador será excluído.`,
        confirmLabel: 'Remover',
        cancelLabel: 'Cancelar',
        tone: 'danger',
      }))
    ) {
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await removeCompanyEmployee(companyId, employee.id);
      setMessage(`${employee.name} removido da empresa.`);
      load();
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const employees = Array.isArray(company?.employees) ? company.employees : [];
  const filteredEmployees = useMemo(
    () =>
      sortPeopleByName(
        employees.filter((emp) => employeeMatchesSearch(emp, employeeSearch)),
      ),
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
  const displayName = companyDisplayName(company);
  const secondaryName = companySecondaryName(company);
  const phone = formatPhoneDisplay(company.phone);

  return (
    <div className="page-stack company-detail-page">
      <PageHeader
        breadcrumbs={[
          { label: 'Empresas', onClick: onBack },
          ...(readOnly ? [{ label: displayName }] : []),
        ]}
        title={readOnly ? undefined : displayName}
        subtitle={readOnly ? undefined : secondaryName || company.legalName}
        actions={
          <>
            {readOnly && onEdit ? (
              <button type="button" className="btn-primary" onClick={onEdit}>
                Editar
              </button>
            ) : null}
            <button type="button" className="btn-ghost" onClick={onBack}>
              Voltar para lista
            </button>
          </>
        }
      />

      {error ? <div className="alert-banner alert-banner-error">{error}</div> : null}
      <SuccessFlashEffect message={message} />

      <section className="panel company-detail-hero">
        <div className="company-detail-hero-inner">
          <div className="company-detail-identity">
            <div className="company-detail-avatar" aria-hidden="true">
              {companyInitials(company)}
            </div>
            <div className="company-detail-copy">
              <div className="company-detail-title-row">
                <h2 className="company-detail-title">{displayName}</h2>
                <span className={STATUS_CLASS[company.status] ?? 'badge badge-muted'}>
                  {STATUS_LABEL[company.status] ?? company.status}
                </span>
              </div>
              {secondaryName ? <p className="company-detail-legal">{secondaryName}</p> : null}
              <div className="company-detail-chips">
                <CompanyDetailChip icon={Building2} label="CNPJ">
                  {company.cnpj || null}
                </CompanyDetailChip>
                <CompanyDetailChip icon={Mail} label="E-mail">
                  {company.email || null}
                </CompanyDetailChip>
                <CompanyDetailChip icon={Phone} label="Telefone">
                  {phone || null}
                </CompanyDetailChip>
                <CompanyDetailChip icon={Calendar} label="Cadastro">
                  {formatDate(company.createdAt)}
                </CompanyDetailChip>
                {company.commercialOwnerName ? (
                  <CompanyDetailChip icon={UserCog} label="Resp. comercial">
                    {company.commercialOwnerName}
                  </CompanyDetailChip>
                ) : null}
              </div>
            </div>
          </div>

          <div className="company-detail-stats">
            <div className="company-detail-stat">
              <Users size={18} aria-hidden="true" />
              <span>Gestores RH</span>
              <strong>{managerCount}</strong>
            </div>
            <div className="company-detail-stat">
              <UserCog size={18} aria-hidden="true" />
              <span>Colaboradores</span>
              <strong>{employeeCount}</strong>
            </div>
          </div>
        </div>

        {company.status === 'active' && company.enrollmentCode ? (
          <div className="company-detail-enrollment">
            <div className="company-detail-enrollment-copy">
              <span className="company-detail-enrollment-label">Código de adesão no app</span>
              <p className="company-detail-enrollment-hint">
                Colaboradores informam este código em Minha conta no app para vincular o benefício
                corporativo.
              </p>
            </div>
            <code className="enrollment-code-admin company-detail-enrollment-code">
              {company.enrollmentCode}
            </code>
          </div>
        ) : null}

        {company.status === 'pending' ? (
          <div className="company-detail-alert alert-banner alert-banner-warning">
            Empresa aguardando aprovação. Após aprovar, o código de adesão será gerado automaticamente.
          </div>
        ) : null}
      </section>

      <section className="panel company-detail-workspace">
        <div
          className="unit-edit-tabs company-detail-tabs"
          role="tablist"
          aria-label="Seções da empresa"
        >
          {COMPANY_TABS.map((tab) => {
            const count =
              tab.id === 'gestores'
                ? managerCount
                : tab.id === 'colaboradores'
                  ? employeeCount
                  : null;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={
                  activeTab === tab.id
                    ? 'unit-edit-tab company-detail-tab active'
                    : 'unit-edit-tab company-detail-tab'
                }
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'colaboradores') setEmployeePage(1);
                }}
              >
                {tab.label}
                {count != null ? <span className="company-detail-tab-badge">{count}</span> : null}
              </button>
            );
          })}
        </div>

        {activeTab === 'cadastral' ? (
          <div
            className="company-detail-tab-body company-detail-tab-body--padded"
            role="tabpanel"
            aria-label="Cadastral"
          >
            <CompanyManagerOnboardingPanel
              companyId={companyId}
              companyEmail={company.email}
              managerCount={managerCount}
              inviteMeta={company.managerOnboardingInvite}
              disabled={busy || readOnly}
              onChanged={load}
            />

            <dl className="detail-grid detail-grid-dl">
              <div>
                <dt>Razão social</dt>
                <dd>{company.legalName || '—'}</dd>
              </div>
              <div>
                <dt>Nome fantasia</dt>
                <dd>{company.tradeName || '—'}</dd>
              </div>
              <div>
                <dt>CNPJ</dt>
                <dd>{company.cnpj || '—'}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{company.email || '—'}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{phone || '—'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{STATUS_LABEL[company.status] ?? company.status}</dd>
              </div>
              <div>
                <dt>Responsável comercial</dt>
                <dd>{company.commercialOwnerName || '—'}</dd>
              </div>
              <div>
                <dt>Cadastro em</dt>
                <dd>{formatDate(company.createdAt)}</dd>
              </div>
            </dl>

            {company.canDelete === false && company.deleteBlockedReason ? (
              <div className="alert-banner alert-banner-warning company-detail-delete-hint">
                {company.deleteBlockedReason}
              </div>
            ) : null}

            {!readOnly ? (
              <div className="company-detail-actions company-detail-actions--tab">
                <div className="company-detail-actions-primary">
                  {company.status === 'pending' ? (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={busy}
                      onClick={() => setStatus('active')}
                    >
                      Aprovar empresa
                    </button>
                  ) : null}
                  {company.status === 'active' ? (
                    <button
                      type="button"
                      className="btn-ghost btn-danger"
                      disabled={busy}
                      onClick={() => setStatus('suspended')}
                    >
                      Suspender empresa
                    </button>
                  ) : null}
                  {company.status === 'suspended' ? (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={busy}
                      onClick={() => setStatus('active')}
                    >
                      Reativar empresa
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="btn-ghost btn-danger"
                  disabled={busy || company.canDelete === false}
                  title={
                    company.canDelete === false
                      ? company.deleteBlockedReason || 'Não é possível excluir esta empresa.'
                      : 'Excluir empresa'
                  }
                  onClick={removeCompany}
                >
                  Excluir empresa
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'extrato' ? (
          <div className="company-detail-tab-body company-detail-tab-stack" role="tabpanel" aria-label="Extrato">
            <PayerMembershipFeesSection payerKind="company" payerId={companyId} showInvoice />
            <CompanyMonthlyStatementsSection companyId={companyId} />
          </div>
        ) : null}

        {activeTab === 'uso' ? (
          <div role="tabpanel" aria-label="Check-ins e uso">
            <CompanyUsageSection
              companyId={companyId}
              active
              onViewEmployee={onViewEmployee ? (employeeId) => onViewEmployee(employeeId) : undefined}
            />
          </div>
        ) : null}

        {activeTab === 'gestores' ? (
          <div
            className="company-detail-tab-body company-detail-tab-body--padded"
            role="tabpanel"
            aria-label="Gestores"
          >
            <p className="muted company-detail-tab-lead">
              Usuários com acesso ao portal corporativo desta empresa ({managerCount} vinculado(s)).
            </p>
            <CompanyManagersField companyId={companyId} disabled={busy || readOnly} onChanged={load} />
          </div>
        ) : null}

        {activeTab === 'colaboradores' ? (
          <div className="company-detail-employees-panel" role="tabpanel" aria-label="Colaboradores">
            <div className="company-detail-employees-body">
          {employees.length > 0 ? (
            <div className="company-detail-employees-toolbar">
              <label className="company-detail-employees-search">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">Buscar colaborador</span>
                <input
                  type="search"
                  className="company-detail-employees-search-input"
                  placeholder="Buscar por nome ou e-mail…"
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
              </label>
            </div>
          ) : null}

          {employees.length === 0 ? (
            <div className="company-detail-employees-empty empty-state">
              Nenhum colaborador cadastrado nesta empresa.
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="company-detail-employees-empty empty-state">
              Nenhum colaborador corresponde à busca.
            </div>
          ) : (
            <ul className="company-employee-list">
              {employeePagination.items.map((emp) => (
                <CompanyEmployeeCard
                  key={emp.id}
                  employee={emp}
                  busy={busy}
                  readOnly={readOnly}
                  onView={onViewEmployee ? () => onViewEmployee(emp.id) : undefined}
                  onRemove={() => removeEmployee(emp)}
                />
              ))}
            </ul>
          )}

          {filteredEmployees.length > 0 ? (
            <div className="company-detail-employees-footer">
              <CrudPagination
                page={employeePagination.page}
                pageSize={EMPLOYEE_PAGE_SIZE}
                totalItems={employeePagination.totalItems}
                totalPages={employeePagination.totalPages}
                onPageChange={setEmployeePage}
              />
            </div>
          ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
