import { useEffect, useState } from 'react';
import { fetchUserConnectBillingStatement } from '../api/users.js';
import { formatDate, formatMoney } from '../utils/finance.js';

const STATUS_LABELS = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Falhou',
};

function displayProductCopy(text) {
  if (!text) return text;
  return String(text)
    .replaceAll('Movly Connect', 'Movly')
    .replaceAll('Assinatura Connect', 'Assinatura Movly')
    .replaceAll('Upgrade Connect', 'Upgrade Movly');
}

function statusClass(status) {
  if (status === 'paid') return 'status-pill status-pill-success';
  if (status === 'failed') return 'status-pill status-pill-danger';
  return 'status-pill status-pill-warning';
}

export function UserConnectBillingSection({ userId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchUserConnectBillingStatement(userId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setEntries([]);
          setError(err.message || 'Não foi possível carregar o extrato.');
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
        <h2>Extrato de pagamentos</h2>
      </div>
      <div className="panel-body">
        {loading ? <p className="muted">Carregando extrato…</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {!loading && !error && entries.length === 0 ? (
          <p className="muted">Nenhuma cobrança vinculada a este usuário.</p>
        ) : null}
        {!loading && entries.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Compensação</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.occurredAt?.slice(0, 10))}</td>
                    <td>{displayProductCopy(row.description)}</td>
                    <td>{formatMoney(row.amount)}</td>
                    <td>
                      <span className={statusClass(row.status)}>
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </td>
                    <td>{formatDate(row.compensationAt?.slice(0, 10))}</td>
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
