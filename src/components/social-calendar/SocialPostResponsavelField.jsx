import { useMemo } from 'react';
import { filterCronogramaAssigneeUsers } from '../../lib/cronogramaOwners.js';

export function SocialPostResponsavelField({ users, value, onChange, disabled, required }) {
  const candidates = useMemo(() => filterCronogramaAssigneeUsers(users), [users]);
  const selected = candidates.find((u) => u.id === value);

  return (
    <label className="field-label-block sc-responsavel-field">
      Responsável pela publicação manual
      {required ? <span className="sc-required" aria-hidden="true"> *</span> : null}
      <select
        className="sc-responsavel-select"
        disabled={disabled}
        value={value ?? ''}
        onChange={(ev) => onChange(ev.target.value || null)}
        aria-required={required || undefined}
      >
        <option value="">{required ? 'Selecione um usuário admin…' : 'Nenhum'}</option>
        {candidates.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
            {user.email ? ` · ${user.email}` : ''}
          </option>
        ))}
      </select>
      {selected ? (
        <p className="muted sc-responsavel-hint">
          Lembretes por SMS/e-mail 15 min antes do horário agendado vão para{' '}
          <strong>{selected.name}</strong>
          {selected.mobilePhone || selected.email
            ? ` (${[selected.mobilePhone, selected.email].filter(Boolean).join(' · ')})`
            : ' — cadastre celular ou e-mail no usuário.'}
        </p>
      ) : required ? (
        <p className="muted sc-responsavel-hint">Obrigatório para posts com link ou interação no app.</p>
      ) : null}
    </label>
  );
}