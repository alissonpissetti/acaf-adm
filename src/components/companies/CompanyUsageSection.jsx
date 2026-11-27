import { useEffect, useState } from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { getCompanyUsageOverview } from '../../api/admin.js';
import { AppLoading } from '../crud/AppLoading.jsx';
import { formatDateTime } from '../../utils/finance.js';

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

function UsageStat({ label, value, hint }) {
  return (
    <div className="company-detail-stat company-usage-stat">
      <Activity size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small className="company-usage-stat-hint">{hint}</small> : null}
    </div>
  );
}

export function CompanyUsageSection({ companyId, onViewEmployee, active }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    getCompanyUsageOverview(companyId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, active]);

  if (!active) return null;

  if (loading && !data) {
    return (
      <div className="company-detail-tab-body company-detail-tab-body--padded">
        <AppLoading label="Carregando uso e check-ins…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="company-detail-tab-body company-detail-tab-body--padded">
        <div className="alert-banner alert-banner-error">{error}</div>
      </div>
    );
  }

  const totals = data?.totals ?? {};
  const rows = Array.isArray(data?.employees) ? data.employees : [];

  return (
    <div className="company-detail-tab-body">
      <div className="company-usage-summary">
        <div className="company-detail-stats company-usage-stats">
          <UsageStat label="Check-ins totais" value={totals.totalCheckIns ?? 0} />
          <UsageStat label="Check-ins no mês" value={totals.checkInsThisMonth ?? 0} />
          <UsageStat
            label="Colab. com uso"
            value={totals.employeesWithUsage ?? 0}
            hint={
              totals.employees
                ? `De ${totals.employees} cadastrado(s)`
                : 'Nenhum colaborador'
            }
          />
          <UsageStat label="Diárias totais" value={totals.dailyPassesTotal ?? 0} />
        </div>
        <p className="company-usage-summary-hint muted">
          Consolida check-ins e diárias vinculados aos colaboradores desta empresa. Abra o perfil
          de cada pessoa para o histórico detalhado.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state company-usage-empty">Nenhum colaborador para analisar uso.</div>
      ) : (
        <ul className="company-employee-list company-usage-list">
          {rows.map((employee) => (
            <li
              key={employee.id}
              className="company-employee-row company-usage-row"
              onClick={onViewEmployee ? () => onViewEmployee(employee.id) : undefined}
              onKeyDown={(ev) => {
                if (!onViewEmployee) return;
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  onViewEmployee(employee.id);
                }
              }}
              role={onViewEmployee ? 'button' : undefined}
              tabIndex={onViewEmployee ? 0 : undefined}
            >
              <div className="company-employee-row-main">
                <div className="company-usage-metrics" aria-label="Resumo de uso">
                  <span>
                    <strong>{employee.totalCheckIns ?? 0}</strong> check-ins
                  </span>
                  <span>
                    <strong>{employee.checkInsThisMonth ?? 0}</strong> no mês
                  </span>
                  <span>
                    <strong>{employee.dailyPassesTotal ?? 0}</strong> diárias
                  </span>
                </div>
                <div className="company-employee-main">
                  <strong className="company-employee-name">{employee.name}</strong>
                  <span className="company-employee-meta">
                    {employee.email}
                    {employee.lastVisit
                      ? ` · Última visita ${formatDateTime(employee.lastVisit)}`
                      : ''}
                  </span>
                </div>
              </div>
              <div className="company-employee-row-side">
                <span className={EMPLOYEE_STATUS_CLASS[employee.status] ?? 'badge badge-muted'}>
                  {EMPLOYEE_STATUS_LABEL[employee.status] ?? employee.status}
                </span>
                {employee.connectActive ? (
                  <span className="badge badge-success">Plano ativo</span>
                ) : null}
                {onViewEmployee ? (
                  <button
                    type="button"
                    className="btn-ghost btn-sm company-employee-profile-btn"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onViewEmployee(employee.id);
                    }}
                  >
                    Ver uso
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}