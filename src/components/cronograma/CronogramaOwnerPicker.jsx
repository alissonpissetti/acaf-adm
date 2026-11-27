import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { searchPlatformUsers } from '../../api/admin.js';
import { filterCronogramaAssigneeUsers, parseOwnerField } from '../../lib/cronogramaOwners.js';
import { Avatar } from '../Avatar.jsx';

const MIN_SEARCH_LEN = 3;
const SEARCH_DEBOUNCE_MS = 450;

function normalizeUserRow(row) {
  if (!row?.id) return null;
  const roles = Array.isArray(row.roles) ? row.roles : [];
  return {
    id: row.id,
    name: row.name ?? '',
    email: row.email ?? null,
    avatarUrl: row.avatarUrl ?? null,
    avatarColor: row.avatarColor ?? null,
    isPortalPartner: roles.includes('partner') || Boolean(row.isPortalPartner),
  };
}

function matchesQuery(user, query) {
  const q = query.toLowerCase();
  const hay = `${user.name ?? ''} ${user.email ?? ''}`.toLowerCase();
  return hay.includes(q);
}

function extraTokensFromField(ownerExtra) {
  return parseOwnerField(ownerExtra);
}

function joinExtraTokens(tokens) {
  return tokens.join(', ');
}

function tokenExists(tokens, label) {
  const key = String(label ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!key) return true;
  return tokens.some(
    (t) =>
      t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') === key,
  );
}

export function CronogramaOwnerPicker({
  users,
  selectedIds,
  ownerExtra,
  onChangeIds,
  onChangeExtra,
  disabled,
  currentUserId,
  stacked = false,
}) {
  const rootRef = useRef(null);
  const searchInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [remoteHits, setRemoteHits] = useState([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [directoryExtra, setDirectoryExtra] = useState(() => new Map());
  const debounceRef = useRef(null);

  const adminCandidates = useMemo(() => filterCronogramaAssigneeUsers(users), [users]);
  const extraTokens = useMemo(() => extraTokensFromField(ownerExtra), [ownerExtra]);

  const directory = useMemo(() => {
    const map = new Map();
    for (const user of adminCandidates) {
      if (user?.id) map.set(user.id, normalizeUserRow(user));
    }
    for (const [id, user] of directoryExtra) {
      if (!map.has(id)) map.set(id, user);
    }
    return map;
  }, [adminCandidates, directoryExtra]);

  const selectedSet = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);

  const selectedProfiles = useMemo(
    () => (selectedIds ?? []).map((id) => directory.get(id)).filter(Boolean),
    [selectedIds, directory],
  );

  const meOption = useMemo(() => {
    if (!currentUserId || selectedSet.has(currentUserId)) return null;
    return directory.get(currentUserId) ?? normalizeUserRow(users?.find((u) => u.id === currentUserId));
  }, [currentUserId, selectedSet, directory, users]);

  const localHits = useMemo(() => {
    const q = searchTerm.trim();
    if (q.length < MIN_SEARCH_LEN) return [];
    return adminCandidates.filter((user) => {
      if (selectedSet.has(user.id)) return false;
      return matchesQuery(user, q);
    });
  }, [adminCandidates, searchTerm, selectedSet]);

  const mergedHits = useMemo(() => {
    const q = searchTerm.trim();
    if (q.length < MIN_SEARCH_LEN) return [];
    const map = new Map();
    for (const row of localHits) {
      const n = normalizeUserRow(row);
      if (n) map.set(n.id, n);
    }
    for (const row of remoteHits) {
      if (selectedSet.has(row.id)) continue;
      if (!matchesQuery(row, q)) continue;
      const prev = map.get(row.id);
      if (prev) {
        map.set(row.id, { ...prev, isPortalPartner: prev.isPortalPartner || row.isPortalPartner });
      } else {
        map.set(row.id, row);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }, [localHits, remoteHits, searchTerm, selectedSet]);

  const searchQuery = searchTerm.trim();
  const qLen = searchQuery.length;
  const canOfferOther =
    qLen >= MIN_SEARCH_LEN &&
    !loadingRemote &&
    !tokenExists(extraTokens, searchQuery) &&
    !mergedHits.length;

  const close = useCallback(() => {
    setOpen(false);
    setSearchTerm('');
    setRemoteHits([]);
    setLoadingRemote(false);
    window.clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    const focusTimer = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, close]);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    const q = searchTerm.trim();
    if (!open || q.length < MIN_SEARCH_LEN) {
      setRemoteHits([]);
      setLoadingRemote(false);
      return undefined;
    }

    let cancelled = false;
    debounceRef.current = window.setTimeout(() => {
      setLoadingRemote(true);
      searchPlatformUsers(q)
        .then((rows) => {
          if (cancelled) return;
          const list = (Array.isArray(rows) ? rows : [])
            .map(normalizeUserRow)
            .filter(Boolean)
            .filter((user) => !selectedSet.has(user.id));
          setRemoteHits(list);
        })
        .catch(() => {
          if (!cancelled) setRemoteHits([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingRemote(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceRef.current);
    };
  }, [open, searchTerm, selectedSet]);

  const addUser = (userLike) => {
    if (disabled || !userLike?.id || selectedSet.has(userLike.id)) return;
    const normalized = normalizeUserRow(userLike);
    if (!normalized) return;
    setDirectoryExtra((prev) => {
      const next = new Map(prev);
      next.set(normalized.id, normalized);
      return next;
    });
    onChangeIds([...(selectedIds ?? []), normalized.id]);
    close();
  };

  const addExtraToken = (label) => {
    if (disabled) return;
    const token = String(label ?? '').trim().slice(0, 80);
    if (!token || tokenExists(extraTokens, token)) {
      close();
      return;
    }
    onChangeExtra(joinExtraTokens([...extraTokens, token]));
    close();
  };

  const removeUser = (userId) => {
    if (disabled) return;
    onChangeIds((selectedIds ?? []).filter((id) => id !== userId));
  };

  const removeExtraToken = (token) => {
    if (disabled) return;
    onChangeExtra(joinExtraTokens(extraTokens.filter((t) => t !== token)));
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (open) close();
    else setOpen(true);
  };

  const hasAssignees = selectedProfiles.length > 0 || extraTokens.length > 0;

  return (
    <div className="cronograma-assignee-selector" ref={rootRef}>
      <div
        className={`cronograma-assignee-display${stacked ? ' cronograma-assignee-display--stacked' : ''}`}
      >
        {!hasAssignees ? (
          <span
            className="cronograma-assignee-placeholder"
            aria-hidden="true"
            title="Nenhum responsável"
          />
        ) : null}

        {selectedProfiles.map((user) => (
          <div key={user.id} className="cronograma-assignee-avatar-wrap">
            <Avatar
              name={user.name}
              src={user.avatarUrl}
              color={user.avatarColor}
              size="sm"
              title={user.name}
            />
            {!disabled ? (
              <button
                type="button"
                className="cronograma-assignee-remove"
                aria-label={`Remover ${user.name}`}
                onClick={() => removeUser(user.id)}
              >
                <X size={11} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ))}

        {extraTokens.map((token) => (
          <div key={`extra:${token}`} className="cronograma-assignee-avatar-wrap">
            <Avatar name={token} size="sm" title={`${token} (sem login no admin)`} />
            {!disabled ? (
              <button
                type="button"
                className="cronograma-assignee-remove"
                aria-label={`Remover ${token}`}
                onClick={() => removeExtraToken(token)}
              >
                <X size={11} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ))}

        {!disabled ? (
          <button
            type="button"
            className="cronograma-assignee-add"
            aria-label="Adicionar responsável"
            aria-expanded={open}
            onClick={toggleOpen}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="cronograma-assignee-dropdown" role="dialog" aria-label="Buscar responsável">
          <div className="cronograma-assignee-dropdown-head">
            <Search size={16} className="cronograma-assignee-search-icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="search"
              className="cronograma-assignee-search-input"
              placeholder="Buscar usuário (mín. 3 caracteres)…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
            {loadingRemote ? <span className="cronograma-assignee-search-loading">…</span> : null}
          </div>

          <div className="cronograma-assignee-dropdown-list" role="listbox">
            {meOption ? (
              <button
                type="button"
                role="option"
                className="cronograma-assignee-dropdown-item cronograma-assignee-dropdown-item--me"
                onClick={() => addUser(meOption)}
              >
                <Avatar
                  name={meOption.name}
                  src={meOption.avatarUrl}
                  color={meOption.avatarColor}
                  size="sm"
                />
                <span className="cronograma-assignee-dropdown-text">
                  <strong>Eu</strong>
                  <small className="muted">{meOption.name}</small>
                </span>
              </button>
            ) : null}

            {loadingRemote && qLen >= MIN_SEARCH_LEN ? (
              <p className="cronograma-assignee-dropdown-empty">Buscando usuários…</p>
            ) : null}

            {mergedHits.map((user) => (
              <button
                key={user.id}
                type="button"
                role="option"
                className="cronograma-assignee-dropdown-item"
                onClick={() => addUser(user)}
              >
                <Avatar name={user.name} src={user.avatarUrl} color={user.avatarColor} size="sm" />
                <span className="cronograma-assignee-dropdown-text">
                  <strong>{user.name}</strong>
                  {user.isPortalPartner ? (
                    <small className="muted">Parceiro / fornecedor</small>
                  ) : user.email ? (
                    <small className="muted">{user.email}</small>
                  ) : null}
                </span>
              </button>
            ))}

            {canOfferOther ? (
              <button
                type="button"
                role="option"
                className="cronograma-assignee-dropdown-item cronograma-assignee-dropdown-item--other"
                onClick={() => addExtraToken(searchQuery)}
              >
                <span className="cronograma-assignee-other-badge" aria-hidden="true">
                  Outro
                </span>
                <span className="cronograma-assignee-dropdown-text">
                  <strong>Outro (sem login no admin)</strong>
                  <small className="muted">Usar “{searchQuery}”</small>
                </span>
              </button>
            ) : null}

            {!loadingRemote && qLen >= MIN_SEARCH_LEN && !mergedHits.length && !canOfferOther ? (
              <p className="cronograma-assignee-dropdown-empty">Nenhum usuário encontrado.</p>
            ) : null}

            {!loadingRemote && qLen < MIN_SEARCH_LEN ? (
              <p className="cronograma-assignee-dropdown-empty">Digite pelo menos 3 caracteres para buscar</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}