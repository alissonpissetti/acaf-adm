import { useCallback, useEffect, useState } from 'react';
import { cancelUnitCheckIn, getUnitCheckIns } from '../api/admin.js';

function formatCheckInTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function typeLabel(type) {
  if (type === 'connect_member') return 'Connect';
  if (type === 'daily_pass') return 'Diária';
  return type;
}

export function UnitCheckInsField({ unitId, disabled }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getUnitCheckIns(unitId, { todayOnly: true })
      .then((data) => setEntries(data.entries ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [unitId]);

  useEffect(() => {
    load();
  }, [load]);

  const onCancel = async (entryId) => {
    if (!window.confirm('Cancelar este check-in? O aluno poderá fazer check-in novamente hoje.')) {
      return;
    }
    setBusyId(entryId);
    setMessage('');
    setError('');
    try {
      await cancelUnitCheckIn(unitId, entryId);
      setMessage('Check-in removido.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <p className="muted">Carregando check-ins de hoje…</p>;
  }

  return (
    <div className="unit-checkins-field">
      <p className="muted">
        Check-ins registrados hoje nesta unidade. Use cancelar para liberar novos testes no app.
      </p>

      {entries.length === 0 ? (
        <p className="muted">Nenhum check-in hoje nesta unidade.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Aluno</th>
                <th>Tipo</th>
                <th>Código</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => (
                <tr key={row.id}>
                  <td>{formatCheckInTime(row.validatedAt)}</td>
                  <td>{row.holderName}</td>
                  <td>{typeLabel(row.type)}</td>
                  <td className="mono">{row.code}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      disabled={disabled || busyId === row.id}
                      onClick={() => onCancel(row.id)}
                    >
                      {busyId === row.id ? 'Cancelando…' : 'Cancelar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
