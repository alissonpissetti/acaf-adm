import { useEffect, useRef, useState } from 'react';
import { appConfirm } from './confirm/appConfirm.js';
import { SuccessFlashEffect } from './flash/FlashMessageProvider.jsx';
import {
  addCompanyManager,
  getCompany,
  removeCompanyManager,
  searchPlatformUsers,
} from '../api/admin.js';

function rolesLabel(user) {
  if (user.roleLabels?.length) return user.roleLabels.join(' · ');
  if (user.roles?.includes('admin')) return 'Console admin';
  if (user.roles?.includes('corporate')) return 'Gestor corporativo';
  if (user.roles?.includes('member')) return 'Cliente';
  return 'Usuário';
}

export function CompanyManagersField({ companyId, disabled = false, onChanged }) {
  const [managers, setManagers] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [message, setMessage] = useState('');
  const searchTimer = useRef(null);
  const linkedIds = useRef(new Set());

  const loadManagers = () => {
    getCompany(companyId)
      .then((company) => {
        const rows = company.managers ?? [];
        setManagers(rows);
        linkedIds.current = new Set(rows.map((user) => user.id));
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadManagers();
  }, [companyId]);

  useEffect(() => {
    window.clearTimeout(searchTimer.current);
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      setSearchError('');
      return;
    }

    searchTimer.current = window.setTimeout(async () => {
      setSearchBusy(true);
      setSearchError('');
      try {
        const found = await searchPlatformUsers(trimmed);
        const linkedEmails = new Set(managers.map((user) => user.email.toLowerCase()));
        setResults(
          found.filter(
            (user) =>
              !linkedIds.current.has(user.id) &&
              !linkedEmails.has(user.email.toLowerCase()),
          ),
        );
        setSearched(true);
      } catch (err) {
        setSearchError(err.message);
        setResults([]);
        setSearched(true);
      } finally {
        setSearchBusy(false);
      }
    }, 300);

    return () => window.clearTimeout(searchTimer.current);
  }, [query, managers]);

  const linkUser = async (user) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await addCompanyManager(companyId, user.id);
      setMessage(`${user.name} vinculado como gestor.`);
      setQuery('');
      setResults([]);
      loadManagers();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const unlinkUser = async (user) => {
    const confirmed = await appConfirm({
      title: 'Remover gestor',
      message: `Remover ${user.name} como gestor desta empresa?`,
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await removeCompanyManager(companyId, user.id);
      setMessage(`${user.name} removido.`);
      loadManagers();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="company-managers-field">
      {error ? <p className="error-text">{error}</p> : null}
      <SuccessFlashEffect message={message} />

      <div>
        <p className="company-managers-label">Gestores vinculados</p>
        {managers.length === 0 ? (
          <p className="field-hint">Nenhum gestor vinculado. Use a busca abaixo para adicionar.</p>
        ) : (
          <ul className="partner-users-list">
            {managers.map((user) => (
              <li key={user.id}>
                <div>
                  <strong>{user.name}</strong>
                  <span className="muted">{user.email} · {rolesLabel(user)}</span>
                </div>
                <button
                  type="button"
                  className="btn-ghost btn-sm btn-danger"
                  disabled={disabled || busy}
                  onClick={() => unlinkUser(user)}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="field">
        <label htmlFor="manager-search">Vincular gestor</label>
        <input
          id="manager-search"
          type="search"
          placeholder="Buscar por nome, e-mail ou CPF…"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
          disabled={disabled || busy}
        />
        <p className="field-hint">Digite ao menos 2 caracteres para buscar em acaf_users.</p>
      </div>

      {searchBusy ? <p className="field-hint">Buscando…</p> : null}
      {searchError ? <p className="error-text">{searchError}</p> : null}

      {searched && results.length === 0 && !searchBusy ? (
        <p className="field-hint">Nenhum usuário encontrado.</p>
      ) : null}

      {results.length > 0 && (
        <ul className="partner-users-results">
          {results.map((user) => (
            <li key={user.id}>
              <div>
                <strong>{user.name}</strong>
                <span className="muted">{user.email} · {rolesLabel(user)}</span>
              </div>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={disabled || busy}
                onClick={() => linkUser(user)}
              >
                Vincular
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
