import { useCallback, useEffect, useState } from 'react';
import { getUnitPrimaryMembers } from '../api/admin.js';
import { formatCpfDisplay, normalizeCpf } from '../utils/person.js';

function formatLinkedAt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatCpfCell(cpf) {
  if (!cpf?.trim()) return '—';
  const digits = normalizeCpf(cpf);
  if (digits.length === 11) return formatCpfDisplay(digits);
  return cpf;
}

function planLabel(row) {
  if (row.movlyPlanName) return row.movlyPlanName;
  if (row.movlyPlanId) return row.movlyPlanId;
  return '—';
}

export function UnitPrimaryMembersField({ unitId }) {
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getUnitPrimaryMembers(unitId)
      .then((data) => {
        setClients(data.clients ?? []);
        setTotal(data.total ?? data.clients?.length ?? 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [unitId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="muted">Carregando clientes…</p>;
  }

  return (
    <div className="unit-primary-members-field">
      <p className="muted">
        Clientes com esta unidade como <strong>academia principal</strong> no app Movly.
        {total > 0 ? ` ${total} cliente${total === 1 ? '' : 's'}.` : ''}
      </p>

      {clients.length === 0 ? (
        <p className="muted">Nenhum cliente com esta unidade como academia principal.</p>
      ) : (
        <div className="table-wrap table-wrap-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>CPF</th>
                <th>Plano Movly</th>
                <th>Data do vínculo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((row) => (
                <tr key={row.holderKey}>
                  <td data-label="Nome">{row.name}</td>
                  <td data-label="E-mail">{row.email?.trim() || '—'}</td>
                  <td data-label="CPF" className="mono">
                    {formatCpfCell(row.cpf)}
                  </td>
                  <td data-label="Plano Movly">{planLabel(row)}</td>
                  <td data-label="Data do vínculo">{formatLinkedAt(row.linkedAt)}</td>
                  <td data-label="Status">{row.active ? 'Ativo' : 'Inativo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}