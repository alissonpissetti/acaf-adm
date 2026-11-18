import { useEffect, useState } from 'react';
import { getCompanyMonthlyStatement, listCompanyMonthlyStatements } from '../api/admin.js';
import { formatDateTime, formatMoney } from '../utils/finance.js';

const INVOICE_STATUS_LABEL = {
  paid: 'Paga',
  open: 'Em aberto',
};

const EMPLOYEE_STATUS_LABEL = {
  pending: 'Pendente',
  invited: 'Convite enviado',
  active: 'Ativo',
  inactive: 'Inativo',
};

const RELATIONSHIP_LABEL = {
  primary: 'Assinante (academia principal)',
  daily_pass: 'Só diárias',
  mixed: 'Assinante + diárias',
  visitor: 'Sem vínculo ativo no app',
};

function formatMonthKey(monthKey) {
  const [year, month] = String(monthKey ?? '').split('-');
  if (!year || !month) return monthKey ?? '—';
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function invoiceStatusClass(status) {
  return status === 'paid' ? 'badge badge-success' : 'badge badge-muted';
}

export function CompanyMonthlyStatementsSection({ companyId }) {
  const [months, setMonths] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [selectedMonthKey, setSelectedMonthKey] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setError('');
    setSelected(null);
    setSelectedMonthKey('');
    listCompanyMonthlyStatements(companyId)
      .then((rows) => {
        if (cancelled) return;
        setMonths(rows);
        if (rows[0]) {
          setSelectedMonthKey(rows[0].monthKey);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMonths([]);
          setError(err.message || 'Não foi possível carregar o extrato mensal.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (!selectedMonthKey) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setError('');
    getCompanyMonthlyStatement(companyId, selectedMonthKey)
      .then((detail) => {
        if (!cancelled) setSelected(detail);
      })
      .catch((err) => {
        if (!cancelled) {
          setSelected(null);
          setError(err.message || 'Não foi possível carregar o detalhe do mês.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, selectedMonthKey]);

  return (
    <section className="panel company-monthly-statements-panel">
      <div className="panel-header">
        <div>
              <h2>Extrato de uso (app)</h2>
              <p className="panel-subtitle">
                Meses encerrados — uso retrospectivo no Movly (check-ins, planos). Valores pagos pela empresa
                estão no extrato de mensalidades acima.
              </p>
        </div>
      </div>
      <div className="panel-body">
        {error ? <div className="alert-banner alert-banner-error">{error}</div> : null}

        {loadingList ? (
          <p className="muted">Carregando meses disponíveis…</p>
        ) : months.length === 0 ? (
          <p className="empty-state">
            Nenhum mês encerrado com fatura registrada. O mês em curso aparece aqui após o
            encerramento.
          </p>
        ) : (
          <div className="company-monthly-statements-layout">
            <div className="table-wrap">
              <table className="data-table data-table-enterprise company-monthly-statements-table">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th className="col-count">Ativos</th>
                    <th className="col-money">Empresa</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((row) => (
                    <tr
                      key={row.monthKey}
                      className={
                        selectedMonthKey === row.monthKey
                          ? 'company-monthly-statements-row-selected data-table-row-clickable'
                          : 'data-table-row-clickable'
                      }
                      onClick={() => setSelectedMonthKey(row.monthKey)}
                    >
                      <td>{formatMonthKey(row.monthKey)}</td>
                      <td className="col-count">{row.activeEmployees}</td>
                      <td className="col-money">{formatMoney(row.totalAmount)}</td>
                      <td>
                        <span className={invoiceStatusClass(row.status)}>
                          {INVOICE_STATUS_LABEL[row.status] ?? row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loadingDetail && !selected ? (
              <p className="muted">Carregando detalhe do mês…</p>
            ) : null}

            {selected ? (
              <div className="company-monthly-statements-detail">
                <div className="company-monthly-statements-detail-header">
                  <h3>{formatMonthKey(selected.monthKey)}</h3>
                  <span className={invoiceStatusClass(selected.invoice.status)}>
                    {INVOICE_STATUS_LABEL[selected.invoice.status] ?? selected.invoice.status}
                  </span>
                </div>

                <dl className="detail-grid detail-grid-dl company-monthly-statements-summary">
                  <div>
                    <dt>Colaboradores ativos (fatura)</dt>
                    <dd>{selected.invoice.activeEmployees}</dd>
                  </div>
                  <div>
                    <dt>Benefício corporativo / colaborador</dt>
                    <dd>{formatMoney(selected.billing.corporateBenefitPerMonth)}</dd>
                  </div>
                  <div>
                    <dt>Total empresa no mês</dt>
                    <dd>
                      <strong>{formatMoney(selected.billing.companyTotalAmount)}</strong>
                    </dd>
                  </div>
                  <div>
                    <dt>Estimativa assinatura colaboradores</dt>
                    <dd>
                      {formatMoney(selected.billing.estimatedEmployeeSubscriptionTotal)}
                      <span className="table-sub">
                        {' '}
                        (plano − benefício, por colaborador com plano)
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Gerada em</dt>
                    <dd>{formatDateTime(selected.invoice.generatedAt)}</dd>
                  </div>
                </dl>

                <p className="muted company-monthly-statements-usage-lead">
                  Uso no mês: {selected.usage.totals.employees} colaborador(es) ·{' '}
                  <strong>{selected.usage.totals.memberCheckInDaysInMonth}</strong> dias-distintos com
                  check-in de plano ·{' '}
                  <strong>{selected.usage.totals.dailyPassVisitDaysInMonth}</strong> dias-distintos
                  com diária.
                </p>

                {selected.billing.byPlan.length > 0 ? (
                  <>
                    <h4 className="company-monthly-statements-subtitle">Por plano (cobrança e uso)</h4>
                    <div className="table-wrap table-wrap-responsive">
                      <table className="data-table data-table-enterprise data-table-compact">
                        <thead>
                          <tr>
                            <th>Plano</th>
                            <th className="col-count">Colab.</th>
                            <th className="col-money">Plano/mês</th>
                            <th className="col-money">Empresa</th>
                            <th className="col-money">Colaborador</th>
                            <th className="col-count">Dias check-in</th>
                            <th className="col-count">Dias diária</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.billing.byPlan.map((plan) => (
                            <tr key={plan.subscriptionPlanId ?? 'none'}>
                              <td data-label="Plano">{plan.subscriptionPlanName}</td>
                              <td className="col-count" data-label="Colaboradores">
                                {plan.employeeCount}
                              </td>
                              <td className="col-money" data-label="Plano/mês">
                                {plan.planMonthlyAmount != null
                                  ? formatMoney(plan.planMonthlyAmount)
                                  : '—'}
                              </td>
                              <td className="col-money" data-label="Empresa">
                                {formatMoney(plan.estimatedCompanyAmount)}
                              </td>
                              <td className="col-money" data-label="Colaborador">
                                {plan.employeePortionPerMonth != null
                                  ? formatMoney(plan.estimatedEmployeeAmount)
                                  : '—'}
                              </td>
                              <td className="col-count" data-label="Dias check-in">
                                {plan.sumMemberCheckInDays}
                              </td>
                              <td className="col-count" data-label="Dias diária">
                                {plan.sumDailyPassVisitDays}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}

                <h4 className="company-monthly-statements-subtitle">Por colaborador</h4>
                <div className="table-wrap table-wrap-responsive">
                  <table className="data-table data-table-enterprise data-table-compact">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Status RH</th>
                        <th className="col-count">Dias plano</th>
                        <th className="col-count">Dias diária</th>
                        <th>Plano</th>
                        <th>Perfil app</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.usage.rows.map((row) => (
                        <tr key={row.employeeId}>
                          <td data-label="Nome">
                            <strong>{row.name}</strong>
                            {row.email ? <div className="table-sub">{row.email}</div> : null}
                          </td>
                          <td data-label="Status RH">
                            {EMPLOYEE_STATUS_LABEL[row.status] ?? row.status}
                          </td>
                          <td className="col-count" data-label="Dias plano">
                            {row.memberCheckInDaysInMonth}
                          </td>
                          <td className="col-count" data-label="Dias diária">
                            {row.dailyPassVisitDaysInMonth}
                          </td>
                          <td data-label="Plano">{row.subscriptionPlanName ?? '—'}</td>
                          <td data-label="Perfil app">
                            {RELATIONSHIP_LABEL[row.relationship] ?? row.relationship}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}