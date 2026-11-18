import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCompanyMembershipFees, listNetworkMembershipFees } from '../api/admin.js';
import { formatDate, formatDateTime, formatMoney, statusClass, statusLabel } from '../utils/finance.js';

const INVOICE_STATUS_LABEL = {
  paid: 'Paga',
  open: 'Em aberto',
};

function formatMonthKey(monthKey) {
  const [year, month] = String(monthKey ?? '').split('-');
  if (!year || !month) return monthKey ?? '—';
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function loadFees(payerKind, payerId) {
  if (payerKind === 'company') return listCompanyMembershipFees(payerId);
  return listNetworkMembershipFees(payerId);
}

export function PayerMembershipFeesSection({ payerKind, payerId, showInvoice = false }) {
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    loadFees(payerKind, payerId)
      .then((rows) => {
        if (!cancelled) setMonths(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setMonths([]);
          setError(err.message || 'Não foi possível carregar o extrato de mensalidades.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [payerKind, payerId]);

  const subtitle =
    payerKind === 'company'
      ? 'Contas a receber com pagador = esta empresa (mês de referência = vencimento). Inclui fatura corporativa do benefício quando houver.'
      : 'Contas a receber com pagador = esta rede (mensalidades e cobranças vinculadas à academia).';

  return (
    <section className="panel payer-membership-fees-panel">
      <div className="panel-header">
        <div>
          <h2>Extrato de mensalidades</h2>
          <p className="panel-subtitle muted">{subtitle}</p>
        </div>
        <Link to="/m/financeiro/contas-receber" className="panel-meta muted" style={{ textDecoration: 'underline' }}>
          Contas a receber →
        </Link>
      </div>
      <div className="panel-body">
        {error ? <div className="alert-banner alert-banner-error">{error}</div> : null}
        {loading ? <p className="muted">Carregando extrato…</p> : null}
        {!loading && !error && months.length === 0 ? (
          <p className="empty-state">
            Nenhuma mensalidade registrada no financeiro para este cadastro. Crie contas a receber com pagador
            vinculado a {payerKind === 'company' ? 'esta empresa' : 'esta rede'}.
          </p>
        ) : null}
        {!loading && months.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table data-table-enterprise payer-membership-fees-table">
              <thead>
                <tr>
                  <th>Mês ref.</th>
                  {showInvoice ? <th className="col-money">Fatura benefício</th> : null}
                  <th className="col-money">Recebível</th>
                  <th className="col-money">Liquidado</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {months.map((group) => (
                  <PayerMembershipFeeMonthRow
                    key={group.monthKey}
                    group={group}
                    showInvoice={showInvoice}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PayerMembershipFeeMonthRow({ group, showInvoice }) {
  const invoice = group.invoice;
  const receivables = group.receivables ?? [];

  return (
    <>
      <tr className="payer-membership-fees-month-row">
        <td>
          <strong>{formatMonthKey(group.monthKey)}</strong>
          {invoice ? (
            <div className="table-sub">
              Fatura: {invoice.activeEmployees} ativo(s) ·{' '}
              <span className={invoice.status === 'paid' ? 'badge badge-success' : 'badge badge-muted'}>
                {INVOICE_STATUS_LABEL[invoice.status] ?? invoice.status}
              </span>
            </div>
          ) : null}
        </td>
        {showInvoice ? (
          <td className="col-money" data-label="Fatura">
            {invoice ? formatMoney(invoice.totalAmount) : '—'}
          </td>
        ) : null}
        <td className="col-money" data-label="Recebível">
          {group.totalReceivableAmount > 0 ? formatMoney(group.totalReceivableAmount) : '—'}
        </td>
        <td className="col-money" data-label="Liquidado">
          {group.totalPaidAmount > 0 ? formatMoney(group.totalPaidAmount) : '—'}
        </td>
        <td data-label="Detalhe">
          {receivables.length === 0 && !invoice ? (
            <span className="muted">—</span>
          ) : (
            <ul className="payer-membership-fees-lines">
              {receivables.map((row) => (
                <li key={row.id}>
                  <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>{' '}
                  {formatMoney(row.amount)} · venc. {formatDate(row.dueDate)}
                  {row.settledAt ? <> · pago {formatDateTime(row.settledAt)}</> : null}
                  <div className="table-sub">{row.description}</div>
                </li>
              ))}
              {invoice && receivables.length === 0 ? (
                <li className="muted">Sem recebível vinculado neste mês (só fatura interna).</li>
              ) : null}
            </ul>
          )}
        </td>
      </tr>
    </>
  );
}