import { useEffect, useState } from 'react';
import { fetchUserSavedPaymentMethods } from '../api/users.js';
import { formatDate } from '../utils/finance.js';

export function UserSavedPaymentMethodsSection({ userId }) {
  const [holderName, setHolderName] = useState('');
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchUserSavedPaymentMethods(userId)
      .then((data) => {
        if (cancelled) return;
        setHolderName(data?.holderName ?? '');
        setMethods(Array.isArray(data?.methods) ? data.methods : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setMethods([]);
          setError(err.message || 'Não foi possível carregar os cartões.');
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
        <h2>Cartões tokenizados (Movly)</h2>
      </div>
      <div className="panel-body">
        {loading ? <p className="muted">Carregando cartões…</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {!loading && !error && methods.length === 0 ? (
          <p className="muted">Nenhum cartão salvo para este usuário.</p>
        ) : null}
        {!loading && methods.length > 0 ? (
          <>
            {holderName ? (
              <p className="muted" style={{ marginBottom: 12 }}>
                Titular Movly: <strong>{holderName}</strong>
              </p>
            ) : null}
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bandeira</th>
                    <th>Final</th>
                    <th>Nome no cartão</th>
                    <th>Validade</th>
                    <th>Principal</th>
                    <th>Mensalidade</th>
                    <th>Token Asaas</th>
                    <th>Cadastrado em</th>
                  </tr>
                </thead>
                <tbody>
                  {methods.map((row) => (
                    <tr key={row.id}>
                      <td>{row.brand}</td>
                      <td>{row.lastFour}</td>
                      <td>{row.holderName}</td>
                      <td>
                        {row.expiryMonth}/{row.expiryYear?.length >= 4 ? row.expiryYear.slice(-2) : row.expiryYear}
                      </td>
                      <td>{row.isDefault ? 'Sim' : '—'}</td>
                      <td>{row.usedForSubscription ? 'Sim' : '—'}</td>
                      <td>{row.hasAsaasToken ? 'Sim' : 'Não'}</td>
                      <td>{formatDate(row.addedAt?.slice(0, 10))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}