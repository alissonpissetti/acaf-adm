import { useCallback, useEffect, useState } from 'react';
import { appConfirm } from './confirm/appConfirm.js';
import { SuccessFlashEffect } from './flash/FlashMessageProvider.jsx';
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
  if (type === 'connect_member') return 'Plano';
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
    const confirmed = await appConfirm({
      title: 'Cancelar check-in',
      message: 'Cancelar este check-in? O aluno poderá fazer check-in novamente hoje.',
      confirmLabel: 'Cancelar check-in',
      cancelLabel: 'Voltar',
      tone: 'danger',
    });
    if (!confirmed) return;
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
        <div className="table-wrap table-wrap-responsive">
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
                  <td data-label="Horário">{formatCheckInTime(row.validatedAt)}</td>
                  <td data-label="Aluno">{row.holderName}</td>
                  <td data-label="Tipo">{typeLabel(row.type)}</td>
                  <td data-label="Código" className="mono">{row.code}</td>
                  <td data-label="Ação">
                    <button
                      type="button"
                      className="btn-ghost btn-sm unit-checkin-cancel"
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

      <SuccessFlashEffect message={message} />
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
