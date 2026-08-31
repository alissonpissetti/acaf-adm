import { useEffect, useRef, useState } from 'react';
import { appConfirm } from './confirm/appConfirm.js';
import { SuccessFlashEffect } from './flash/FlashMessageProvider.jsx';
import {
  addUnitPartnerUser,
  getUnitPartnerUsers,
  removeUnitPartnerUser,
  searchPlatformUsers,
} from '../api/admin.js';

function rolesLabel(user) {
  if (user.roleLabels?.length) return user.roleLabels.join(' · ');
  if (user.roles?.includes('admin')) return 'Console admin';
  if (user.roles?.includes('member')) return 'Cliente';
  return 'Usuário';
}

export function UnitPartnerUsersField({ unitId, disabled = false, embedded = false }) {
  const [users, setUsers] = useState([]);
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

  const loadUsers = () => {
    getUnitPartnerUsers(unitId)
      .then((rows) => {
        setUsers(rows);
        linkedIds.current = new Set(rows.map((user) => user.id));
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadUsers();
  }, [unitId]);

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
        const linkedEmails = new Set(users.map((user) => user.email.toLowerCase()));
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
  }, [query, users]);

  const linkUser = async (user) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await addUnitPartnerUser(unitId, { userId: user.id });
      setMessage('Usuário vinculado ao acesso da unidade.');
      setQuery('');
      setResults([]);
      setSearched(false);
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const unlinkUser = async (user) => {
    const confirmed = await appConfirm({
      title: 'Remover acesso',
      message: 'Remover o acesso deste usuário à unidade?',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await removeUnitPartnerUser(unitId, user.id);
      setMessage('Acesso removido.');
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`partner-users-field ${embedded ? 'partner-users-field-embedded' : ''} field-span-full`}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter') ev.preventDefault();
      }}
    >
      {!embedded ? (
        <div>
          <span className="field-label">Acesso ao portal parceiro</span>
          <p className="muted partner-users-help">
            Vincule qualquer pessoa cadastrada na plataforma (clientes, admins ou equipe) para
            acessar esta unidade no connect-partner.
          </p>
        </div>
      ) : (
        <p className="muted partner-users-help">
          Vincule qualquer pessoa cadastrada na plataforma (clientes, admins ou equipe) para acessar
          esta unidade no connect-partner.
        </p>
      )}

      <div className="partner-users-search">
        <label>
          <span>Buscar usuário</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, e-mail ou CPF"
            disabled={disabled || busy}
            autoComplete="off"
          />
        </label>
        {query.trim().length > 0 && query.trim().length < 2 ? (
          <small className="muted">Digite ao menos 2 caracteres para buscar.</small>
        ) : null}
        {searchBusy ? <small className="muted">Buscando…</small> : null}
        {searchError ? <p className="error-text partner-users-search-error">{searchError}</p> : null}
        {!searchBusy && searched && !searchError && results.length === 0 ? (
          <p className="muted partner-users-empty">Nenhum usuário encontrado.</p>
        ) : null}
        {results.length ? (
          <ul className="partner-users-results">
            {results.map((user) => (
              <li key={user.id}>
                <div>
                  <strong>{user.name}</strong>
                  <span className="muted">
                    {user.email}
                    {user.cpf ? ` · ${user.cpf}` : ''}
                    {` · ${rolesLabel(user)}`}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => linkUser(user)}
                  disabled={disabled || busy}
                >
                  Adicionar
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {users.length ? (
        <ul className="partner-users-list">
          {users.map((user) => (
            <li key={user.id}>
              <div>
                <strong>{user.name}</strong>
                <span className="muted">
                  {user.email}
                  {user.cpf ? ` · ${user.cpf}` : ''}
                  {` · ${rolesLabel(user)}`}
                </span>
              </div>
              <button
                type="button"
                className="btn-ghost btn-sm btn-danger"
                onClick={() => unlinkUser(user)}
                disabled={disabled || busy}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nenhum usuário com acesso a esta unidade.</p>
      )}

      <SuccessFlashEffect message={message} />
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
