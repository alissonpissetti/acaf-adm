import { useEffect, useState } from 'react';
import { deleteUser, updateUser } from '../api/users.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import {
  formatCpfInput,
  formatMobilePhoneInput,
  normalizeCpf,
  normalizeMobilePhone,
} from '../utils/person.js';

function personFieldsFromUser(user) {
  return {
    name: user.name,
    cpf: user.cpf ? formatCpfInput(user.cpf) : '',
    mobilePhone: user.mobilePhone ? formatMobilePhoneInput(user.mobilePhone) : '',
    active: user.active,
    password: '',
  };
}

export function UserEditScreen({ user, onBack, onUpdated, onDeleted }) {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState(() => personFieldsFromUser(user));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const isSelf = currentUser?.id === user.id;

  useEffect(() => {
    setForm(personFieldsFromUser(user));
    setError('');
    setMessage('');
  }, [user]);

  const saveUser = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const patch = {
        name: form.name,
        cpf: normalizeCpf(form.cpf),
        mobilePhone: normalizeMobilePhone(form.mobilePhone),
        active: form.active,
      };
      if (form.password.trim()) {
        patch.password = form.password;
      }
      await updateUser(user.id, patch);
      setForm((current) => ({ ...current, password: '' }));
      setMessage('Usuário atualizado.');
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async () => {
    const confirmed = window.confirm(
      `Remover o usuário "${user.name}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await deleteUser(user.id);
      onDeleted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        breadcrumbs={[
          { label: 'Usuários', onClick: onBack.toList },
          { label: user.name },
        ]}
        title="Editar usuário"
        subtitle={user.email}
        actions={
          <button type="button" className="btn-ghost" onClick={onBack.toList}>
            Voltar para lista
          </button>
        }
      />

      <section className="panel">
        <div className="panel-header">
          <h2>Dados do usuário</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={saveUser}>
            <label className="field-span-2">
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>

            <label>
              <span>CPF</span>
              <input
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: formatCpfInput(e.target.value) })}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
                required
              />
            </label>

            <label>
              <span>Celular</span>
              <input
                value={form.mobilePhone}
                onChange={(e) =>
                  setForm({ ...form, mobilePhone: formatMobilePhoneInput(e.target.value) })
                }
                placeholder="(00) 00000-0000"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </label>

            <label className="field-span-2">
              <span>E-mail</span>
              <input type="email" value={user.email} disabled />
            </label>

            <label className="field-span-2">
              <span>Status</span>
              <div className="toggle-row">
                <button
                  type="button"
                  className={form.active ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                  onClick={() => setForm({ ...form, active: true })}
                  disabled={busy || isSelf}
                >
                  Ativo
                </button>
                <button
                  type="button"
                  className={!form.active ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                  onClick={() => setForm({ ...form, active: false })}
                  disabled={busy || isSelf}
                >
                  Inativo
                </button>
              </div>
              {isSelf ? (
                <small className="muted">Você não pode inativar seu próprio usuário.</small>
              ) : null}
            </label>

            <label className="field-span-2">
              <span>Nova senha</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Deixe em branco para manter a atual"
                minLength={6}
              />
            </label>

            <div className="field-span-2 panel-actions">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Salvando…' : 'Salvar alterações'}
              </button>
              {!isSelf ? (
                <button
                  type="button"
                  className="btn-ghost btn-danger"
                  onClick={removeUser}
                  disabled={busy}
                >
                  Remover usuário
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </section>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
