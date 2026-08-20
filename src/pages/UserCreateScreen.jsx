import { useState } from 'react';
import { createUser } from '../api/users.js';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions } from '../components/crud/CrudFormActions.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import {
  formatCpfInput,
  formatMobilePhoneInput,
  normalizeCpf,
  normalizeMobilePhone,
} from '../utils/person.js';

export function UserCreateScreen({ onBack, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    cpf: '',
    mobilePhone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await createUser({
        ...form,
        cpf: normalizeCpf(form.cpf),
        mobilePhone: normalizeMobilePhone(form.mobilePhone),
      });
      onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        breadcrumbs={[{ label: 'Usuários', onClick: onBack }, { label: 'Novo usuário' }]}
        title="Adicionar usuário"
        subtitle="Cadastre uma pessoa na plataforma ACAF."
      />

      <CrudAlerts error={error} />

      <section className="panel">
        <div className="panel-header">
          <h2>Dados do usuário</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={onSubmit}>
            <label>
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome completo"
                autoFocus
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

            <label>
              <span>E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@acaf.com.br"
                required
              />
            </label>

            <label>
              <span>Senha inicial</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
                required
              />
            </label>

            <div className="field-span-full form-actions">
              <CrudFormActions
                busy={busy}
                onCancel={onBack}
                submitLabel="Salvar usuário"
              />
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
