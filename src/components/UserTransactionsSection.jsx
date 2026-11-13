import { useEffect, useState } from 'react';
import { fetchUserTransactions } from '../api/users.js';
import { formatDate, formatMoney } from '../utils/finance.js';

const STATUS_LABELS = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  failed: 'Falhou',
  cancelled: 'Cancelada',
};

const KIND_LABELS = {
  connect_subscription: 'Assinatura Movly',
  connect_plan_upgrade: 'Upgrade de plano',
  connect_plan_downgrade: 'Downgrade de plano',
  connect_one_off: 'Cobrança avulsa',
  product_sale: 'Venda',
};

function displayProductCopy(text) {
  if (!text) return text;
  return String(text)
    .replaceAll('Movly Connect', 'Movly')
    .replaceAll('Assinatura Connect', 'Assinatura Movly')
    .replaceAll('Upgrade Connect', 'Upgrade Movly');
}

function statusClass(status) {
  if (status === 'completed') return 'status-pill status-pill-success';
  if (status === 'failed' || status === 'cancelled') return 'status-pill status-pill-danger';
  return 'status-pill status-pill-warning';
}

export function UserTransactionsSection({ userId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchUserTransactions(userId)
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setRows([]);
          setError(err.message || 'Não foi possível carregar as transações.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Transações</h2>
      </div>
      <div className="panel-body">
        {loading ? <p className="muted">Carregando transações…</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="muted">Nenhuma transação vinculada a este usuário.</p>
        ) : null}
        {!loading && rows.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Criada em</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Tentativas gateway</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.createdAt?.slice?.(0, 10) ?? row.createdAt)}</td>
                    <td>{KIND_LABELS[row.kind] ?? row.kind}</td>
                    <td>{displayProductCopy(row.description)}</td>
                    <td>{formatMoney(row.amountTotal)}</td>
                    <td>
                      <span className={statusClass(row.status)}>
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </td>
                    <td>{Array.isArray(row.gatewayAttempts) ? row.gatewayAttempts.length : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
