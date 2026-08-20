import { useEffect, useState } from 'react';
import { getCompanyEmployeeProfile } from '../api/admin.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { formatDate, formatDateTime, formatMoney } from '../utils/finance.js';

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

const RELATIONSHIP_LABEL = {
  primary: 'Assinante principal',
  daily_pass: 'Diárias',
  visitor: 'Visitante',
  mixed: 'Plano + diárias',
};

const CHECKIN_TYPE_LABEL = {
  connect_member: 'Plano mensal',
  daily_pass: 'Diária',
};

function StatCard({ label, value, hint }) {
  return (
    <div className="company-detail-stat employee-profile-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small className="employee-profile-stat-hint">{hint}</small> : null}
    </div>
  );
}

export function CompanyEmployeeProfileScreen({ companyId, employeeId, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getCompanyEmployeeProfile(companyId, employeeId)
      .then(setProfile)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [companyId, employeeId]);

  if (loading) {
    return <AppLoadingPanel label="Carregando perfil do colaborador…" />;
  }

  if (error || !profile) {
    return (
      <div className="page-stack">
        <PageHeader title="Colaborador" breadcrumbs={[{ label: 'Empresas', onClick: onBack }]} />
        <div className="alert-banner alert-banner-error">
          {error || 'Não foi possível carregar o perfil do colaborador.'}
        </div>
        <button type="button" className="btn-ghost" onClick={onBack}>
          Voltar
        </button>
      </div>
    );
  }

  const { employee, company, client } = profile;
  const primary = client.primaryHistory ?? { changes: [] };

  return (
    <div className="page-stack company-employee-profile-page">
      <PageHeader
        breadcrumbs={[
          { label: 'Empresas', onClick: onBack },
          { label: company.tradeName, onClick: onBack },
          { label: employee.name },
        ]}
        title={employee.name}
        subtitle={`Colaborador · ${company.tradeName}`}
        actions={
          <button type="button" className="btn-ghost" onClick={onBack}>
            Voltar para empresa
          </button>
        }
      />

      <section className="panel company-detail-hero">
        <div className="company-detail-hero-body">
          <div className="company-detail-hero-main">
            <span className={EMPLOYEE_STATUS_CLASS[employee.status] ?? 'badge badge-muted'}>
              {EMPLOYEE_STATUS_LABEL[employee.status] ?? employee.status}
            </span>
            <p className="company-detail-meta">
              {employee.email || 'E-mail não informado'}
              {employee.mobilePhone ? ` · ${employee.mobilePhone}` : ''}
              {employee.cpf ? ` · CPF ${employee.cpf}` : ''}
            </p>
            <p className="company-detail-meta">
              Empresa: <strong>{client.companyName || company.tradeName}</strong>
              {' · '}
              Perfil no app:{' '}
              <strong>{RELATIONSHIP_LABEL[client.relationship] ?? client.relationship}</strong>
            </p>
          </div>
          <div className="company-detail-stats employee-profile-stats">
            <StatCard label="Check-ins totais" value={client.totalCheckIns ?? 0} />
            <StatCard label="Check-ins no mês" value={client.checkInsThisMonth ?? 0} />
            <StatCard label="Diárias totais" value={client.dailyPassesTotal ?? 0} />
            <StatCard
              label="Diárias no mês"
              value={client.dailyPassesThisMonth ?? 0}
              hint={
                client.dailyPassPricePaid != null
                  ? `Última diária: ${formatMoney(client.dailyPassPricePaid)}`
                  : null
              }
            />
          </div>
        </div>
      </section>

      <div className="company-detail-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Academia principal e plano</h2>
          </div>
          <div className="panel-body">
            <dl className="detail-grid detail-grid-dl">
              <div>
                <dt>Academia principal</dt>
                <dd>{primary.currentPrimaryUnitName || client.primaryUnitName || '—'}</dd>
              </div>
              <div>
                <dt>Plano Connect</dt>
                <dd>{primary.connectPlanName || primary.connectPlanId || '—'}</dd>
              </div>
              <div>
                <dt>Assinante desde</dt>
                <dd>{formatDate(primary.connectSince || client.connectSince)}</dd>
              </div>
              <div>
                <dt>Principal escolhida em</dt>
                <dd>{formatDate(primary.primaryChosenAt || client.primaryChosenAt)}</dd>
              </div>
              <div>
                <dt>Check-ins na principal</dt>
                <dd>{primary.primaryCheckInsSinceFirst ?? '—'}</dd>
              </div>
              <div>
                <dt>Última visita</dt>
                <dd>{formatDateTime(client.lastVisit)}</dd>
              </div>
              {client.corporateBenefitPerMonth != null ? (
                <div>
                  <dt>Benefício corporativo/mês</dt>
                  <dd>{formatMoney(client.corporateBenefitPerMonth)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Histórico de academias principais</h2>
            <span className="panel-meta">{primary.changes?.length ?? 0} troca(s)</span>
          </div>
          <div className="panel-body">
            {primary.changes?.length ? (
              <div className="table-wrap table-wrap-responsive">
                <table className="data-table data-table-enterprise data-table-compact">
                  <thead>
                    <tr>
                      <th>De</th>
                      <th>Para</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {primary.changes.map((change) => (
                      <tr key={change.id}>
                        <td data-label="De">{change.fromUnitName || '—'}</td>
                        <td data-label="Para">{change.toUnitName}</td>
                        <td data-label="Data">{formatDateTime(change.changedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">Nenhuma troca de academia principal registrada.</div>
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Histórico de check-ins</h2>
          <span className="panel-meta">{client.checkIns?.length ?? 0} registro(s)</span>
        </div>
        <div className="panel-body panel-body-flush">
          {client.checkIns?.length ? (
            <div className="table-wrap table-wrap-responsive">
              <table className="data-table data-table-enterprise data-table-compact">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Unidade</th>
                    <th>Tipo</th>
                    <th>Código</th>
                  </tr>
                </thead>
                <tbody>
                  {client.checkIns.map((entry) => (
                    <tr key={entry.id}>
                      <td data-label="Data">{formatDateTime(entry.validatedAt)}</td>
                      <td data-label="Unidade">{entry.unitName}</td>
                      <td data-label="Tipo">
                        <span className="badge badge-muted">
                          {CHECKIN_TYPE_LABEL[entry.type] ?? entry.type}
                        </span>
                      </td>
                      <td data-label="Código">
                        <code>{entry.code}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state panel-body">Nenhum check-in registrado para este colaborador.</div>
          )}
        </div>
      </section>

      {client.studentRecords?.length ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Registros por unidade</h2>
            <span className="panel-meta">{client.studentRecords.length} unidade(s)</span>
          </div>
          <div className="panel-body panel-body-flush">
            <div className="table-wrap table-wrap-responsive">
              <table className="data-table data-table-enterprise data-table-compact">
                <thead>
                  <tr>
                    <th>Unidade</th>
                    <th>Canal</th>
                    <th>Check-ins no mês</th>
                    <th>Diárias no mês</th>
                    <th>Última diária paga</th>
                  </tr>
                </thead>
                <tbody>
                  {client.studentRecords.map((student) => (
                    <tr key={student.id}>
                      <td data-label="Unidade">{student.unitName || student.unitId}</td>
                      <td data-label="Canal">
                        {student.channel === 'daily_pass' ? 'Diária' : 'Plano principal'}
                      </td>
                      <td data-label="Check-ins no mês">{student.checkInsThisMonth ?? 0}</td>
                      <td data-label="Diárias no mês">{student.dailyPassesThisMonth ?? 0}</td>
                      <td data-label="Última diária paga">
                        {student.dailyPassPricePaid != null
                          ? formatMoney(student.dailyPassPricePaid)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
