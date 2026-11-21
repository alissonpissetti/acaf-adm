import { useMemo, useState } from 'react';
import { Avatar } from '../Avatar.jsx';
import { filterCronogramaAssigneeUsers } from '../../lib/cronogramaOwners.js';

export function CronogramaOwnerPicker({
  users,
  selectedIds,
  ownerExtra,
  onChangeIds,
  onChangeExtra,
  disabled,
}) {
  const [query, setQuery] = useState('');
  const candidates = useMemo(() => filterCronogramaAssigneeUsers(users), [users]);
  const byId = useMemo(() => new Map(candidates.map((u) => [u.id, u])), [candidates]);

  const selected = (selectedIds ?? []).map((id) => byId.get(id)).filter(Boolean);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((u) => {
      const hay = `${u.name} ${u.email ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [candidates, query]);

  const toggle = (id) => {
    if (disabled) return;
    const set = new Set(selectedIds ?? []);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChangeIds([...set]);
  };

  return (
    <fieldset className="cronograma-owner-picker" disabled={disabled}>
      <legend className="cronograma-owner-picker__legend">Responsáveis</legend>
      {selected.length ? (
        <div className="cronograma-owner-picker__chips" aria-label="Selecionados">
          {selected.map((user) => (
            <button
              key={user.id}
              type="button"
              className="cronograma-owner-picker__chip"
              onClick={() => toggle(user.id)}
              title={`Remover ${user.name}`}
              disabled={disabled}
            >
              <Avatar name={user.name} src={user.avatarUrl} color={user.avatarColor} size="xs" />
              <span>{user.name}</span>
              <span className="cronograma-owner-picker__chip-x" aria-hidden="true">
                ×
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted cronograma-owner-picker__empty">Nenhum usuário selecionado.</p>
      )}
      <input
        type="search"
        className="cronograma-owner-picker__search"
        placeholder="Buscar usuário do admin…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
        aria-label="Buscar usuário"
      />
      <ul className="cronograma-owner-picker__list" role="listbox" aria-multiselectable="true">
        {filtered.map((user) => {
          const on = (selectedIds ?? []).includes(user.id);
          return (
            <li key={user.id}>
              <button
                type="button"
                role="option"
                aria-selected={on}
                className={`cronograma-owner-picker__option${on ? ' cronograma-owner-picker__option--on' : ''}`}
                onClick={() => toggle(user.id)}
                disabled={disabled}
              >
                <Avatar name={user.name} src={user.avatarUrl} color={user.avatarColor} size="sm" />
                <span className="cronograma-owner-picker__option-text">
                  <strong>{user.name}</strong>
                  {user.email ? <small className="muted">{user.email}</small> : null}
                </span>
              </button>
            </li>
          );
        })}
        {!filtered.length ? <li className="muted cronograma-owner-picker__none">Nenhum usuário encontrado.</li> : null}
      </ul>
      <label className="cronograma-field cronograma-field--wide cronograma-owner-picker__extra">
        Outros (sem login no admin)
        <input
          type="text"
          value={ownerExtra ?? ''}
          onChange={(e) => onChangeExtra(e.target.value)}
          disabled={disabled}
          placeholder="ex.: Sócios, ACAF, Contador"
        />
      </label>
    </fieldset>
  );
}