import { useCallback, useEffect, useState } from 'react';
import { getCommercialLeadAuditLogs } from '../api/commercial.js';
import { AppLoadingPanel } from './crud/AppLoading.jsx';
import { formatRelativeTime } from '../utils/relativeTime.js';

function formatAbsolute(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LeadAuditPanel({ leadId, refreshKey = 0 }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getCommercialLeadAuditLogs(leadId);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar o histórico.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <aside className="commercial-lead-audit-panel" aria-label="Histórico de alterações">
      <div className="commercial-lead-panel-head">
        <h3>Histórico de alterações</h3>
      </div>

      {loading ? <AppLoadingPanel label="Carregando histórico…" /> : null}
      {!loading && error ? <p className="form-error">{error}</p> : null}

      {!loading && !error && !rows.length ? (
        <p className="field-hint">Nenhuma alteração registrada ainda.</p>
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <ol className="commercial-lead-audit-timeline">
          {rows.map((entry) => (
            <li key={entry.id} className="commercial-lead-audit-item">
              <header>
                <strong>{entry.summary}</strong>
                <time dateTime={entry.createdAt} title={formatAbsolute(entry.createdAt)}>
                  {formatRelativeTime(entry.createdAt)}
                </time>
              </header>
              {entry.userName ? <p className="commercial-lead-audit-actor">por {entry.userName}</p> : null}
              {entry.changes?.length ? (
                <ul className="commercial-lead-audit-changes">
                  {entry.changes.map((change) => (
                    <li key={`${entry.id}-${change.field}`}>
                      <span className="commercial-lead-audit-field">{change.label}</span>
                      {change.from !== change.to ? (
                        <span className="commercial-lead-audit-diff">
                          {change.from ? <s>{change.from}</s> : <em>vazio</em>}
                          {' → '}
                          {change.to ? <strong>{change.to}</strong> : <em>vazio</em>}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </aside>
  );
}
