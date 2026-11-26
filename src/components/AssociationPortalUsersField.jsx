import { useEffect, useRef, useState } from 'react';
import { fetchAssociationUsers, searchPlatformUsers } from '../api/admin.js';
import { updateUser } from '../api/users.js';
import { Avatar } from './Avatar.jsx';
import { appConfirm } from './confirm/appConfirm.js';
import { SuccessFlashEffect } from './flash/FlashMessageProvider.jsx';

function rolesLabel(user) {
  if (user.roleLabels?.length) return user.roleLabels.join(' · ');
  if (user.roles?.includes('admin')) return 'Console admin';
  return 'Usuário';
}

export function AssociationPortalUsersField({
  associationId,
  associationName,
  partnersPermissionKey,
  readOnly = false,
}) {
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
    if (!associationId) return;
    fetchAssociationUsers(associationId)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setUsers(list);
        linkedIds.current = new Set(list.map((user) => user.id));
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadUsers();
  }, [associationId]);

  useEffect(() => {
    window.clearTimeout(searchTimer.current);
    const trimmed = query.trim();

    if (readOnly || trimmed.length < 2) {
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
        setResults(
          found.filter(
            (user) =>
              !linkedIds.current.has(user.id) &&
              user.associationId !== associationId,
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
  }, [query, users, associationId, readOnly]);

  const linkUser = async (user) => {
    if (user.associationId && user.associationId !== associationId) {
      const label = user.associationName || 'outra associação';
      const confirmed = await appConfirm({
        title: 'Trocar associação do usuário',
        message: `"${user.name}" está vinculado a ${label}. Associar a ${associationName ?? 'esta associação'}?`,
        confirmLabel: 'Associar',
        cancelLabel: 'Cancelar',
      });
      if (!confirmed) return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await updateUser(user.id, { associationId });
      setMessage(`${user.name} associado ao portal.`);
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
      title: 'Desassociar usuário',
      message: `Remover o vínculo de "${user.name}" com ${associationName ?? 'esta associação'}? O usuário deixa de acessar o portal de parceiros desta associação.`,
      confirmLabel: 'Desassociar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await updateUser(user.id, { associationId: null });
      setMessage('Vínculo removido.');
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const renderUserRow = (user, { action }) => {
    const detail = [user.email, user.cpf, rolesLabel(user)].filter(Boolean).join(' · ');
    return (
      <li key={user.id} className="partner-users-list-item">
        <div className="partner-user-row">
          <Avatar name={user.name} src={user.avatarUrl} color={user.avatarColor} size="xs" />
          <div className="partner-user-meta partner-user-meta--compact">
            <div className="partner-user-meta__head">
              <strong>{user.name}</strong>
              {user.active === false ? (
                <span className="badge badge-muted partner-users-inactive-badge">Inativo</span>
              ) : null}
            </div>
            <span className="muted partner-user-meta__detail" title={detail}>
              {detail}
            </span>
          </div>
        </div>
        {action ? <div className="partner-users-list-item__action">{action}</div> : null}
      </li>
    );
  };

  return (
    <section className="panel field-span-full association-portal-users association-portal-users--compact">
      <div className="panel-header association-portal-users__header">
        <div>
          <h2>Pessoas associadas</h2>
          <p className="muted association-portal-users__subtitle">
            Portal de parceiros · {associationName ?? 'esta associação'}
            {partnersPermissionKey ? (
              <>
                {' '}
                · permissão <code>{partnersPermissionKey}</code>
              </>
            ) : null}
          </p>
        </div>
        <span className="badge badge-muted association-portal-users-count">{users.length}</span>
      </div>
      <div className="panel-body association-portal-users__body">
        <div className="partner-users-field association-portal-users-body">
          {!readOnly ? (
            <p className="muted partner-users-help partner-users-help--compact">
              Busque um usuário da plataforma e associe ao portal. Conceda a permissão no grupo de acesso.
            </p>
          ) : null}
          {!readOnly ? (
            <div className="partner-users-search">
              <label>
                <span>Buscar usuário para associar</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nome, e-mail ou CPF"
                  disabled={busy}
                  autoComplete="off"
                />
              </label>
              {query.trim().length > 0 && query.trim().length < 2 ? (
                <small className="muted">Digite ao menos 2 caracteres para buscar.</small>
              ) : null}
              {searchBusy ? <small className="muted">Buscando…</small> : null}
              {searchError ? <p className="error-text partner-users-search-error">{searchError}</p> : null}
              {!searchBusy && searched && !searchError && results.length === 0 ? (
                <p className="muted partner-users-empty">Nenhum usuário encontrado para associar.</p>
              ) : null}
              {results.length ? (
                <ul className="partner-users-results">
                  {results.map((user) =>
                    renderUserRow(user, {
                      action: (
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => linkUser(user)}
                          disabled={busy}
                        >
                          Associar
                        </button>
                      ),
                    }),
                  )}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="association-portal-users-linked">
            {users.length ? (
              <ul className="partner-users-list partner-users-list--compact">
                {users.map((user) =>
                  renderUserRow(user, {
                    action: !readOnly ? (
                      <button
                        type="button"
                        className="btn-ghost btn-sm btn-danger"
                        onClick={() => unlinkUser(user)}
                        disabled={busy}
                      >
                        Desassociar
                      </button>
                    ) : null,
                  }),
                )}
              </ul>
            ) : (
              <p className="muted partner-users-empty">Nenhum usuário associado ainda.</p>
            )}
          </div>

          <SuccessFlashEffect message={message} />
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}