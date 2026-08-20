import { useState } from 'react';
import { createCompany } from '../api/admin.js';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions } from '../components/crud/CrudFormActions.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

function normalizeCnpjInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 14);
}

function formatCnpjDisplay(digits) {
  const value = normalizeCnpjInput(digits);
  if (value.length <= 2) return value;
  if (value.length <= 5) return `${value.slice(0, 2)}.${value.slice(2)}`;
  if (value.length <= 8) return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5)}`;
  if (value.length <= 12) {
    return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8)}`;
  }
  return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`;
}

function normalizePhoneInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11);
}

function formatPhoneDisplay(digits) {
  const value = normalizePhoneInput(digits);
  if (value.length <= 2) return value;
  if (value.length <= 7) return `(${value.slice(0, 2)}) ${value.slice(2)}`;
  return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
}

const emptyForm = {
  legalName: '',
  tradeName: '',
  cnpj: '',
  email: '',
  phone: '',
};

export function CompanyCreateScreen({ onBack, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    try {
      const cnpj = normalizeCnpjInput(form.cnpj);
      const email = form.email.trim();
      const phone = normalizePhoneInput(form.phone);
      const created = await createCompany({
        legalName: form.legalName.trim(),
        ...(form.tradeName.trim() ? { tradeName: form.tradeName.trim() } : {}),
        ...(cnpj ? { cnpj } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
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
        breadcrumbs={[{ label: 'Empresas', onClick: onBack }, { label: 'Nova empresa' }]}
        title="Adicionar empresa"
        subtitle="Cadastre a empresa para vincular gestores de RH e iniciar a operação corporativa."
      />

      <CrudAlerts error={error} />

      <section className="panel">
        <div className="panel-header">
          <h2>Dados da empresa</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={onSubmit}>
            <label>
              <span>Razão social</span>
              <input
                className="input"
                value={form.legalName}
                onChange={(ev) => setForm({ ...form, legalName: ev.target.value })}
                placeholder="Empresa Exemplo Ltda."
                autoFocus
                required
              />
            </label>
            <label>
              <span>Nome fantasia</span>
              <input
                className="input"
                value={form.tradeName}
                onChange={(ev) => setForm({ ...form, tradeName: ev.target.value })}
                placeholder="Empresa Exemplo"
              />
            </label>
            <label>
              <span>CNPJ</span>
              <input
                className="input"
                inputMode="numeric"
                value={formatCnpjDisplay(form.cnpj)}
                onChange={(ev) => setForm({ ...form, cnpj: normalizeCnpjInput(ev.target.value) })}
                placeholder="00.000.000/0000-00"
              />
            </label>
            <label>
              <span>E-mail da empresa</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(ev) => setForm({ ...form, email: ev.target.value })}
                placeholder="contato@empresa.com.br"
                autoComplete="email"
              />
            </label>
            <label>
              <span>Telefone</span>
              <input
                className="input"
                type="tel"
                inputMode="numeric"
                value={formatPhoneDisplay(form.phone)}
                onChange={(ev) => setForm({ ...form, phone: normalizePhoneInput(ev.target.value) })}
                placeholder="(11) 99999-9999"
              />
            </label>
            <p className="field-hint field-span-full">
              Após salvar, você poderá vincular gestores de RH na ficha da empresa antes da aprovação
              final.
            </p>
            <div className="field-span-full form-actions">
              <CrudFormActions busy={busy} onCancel={onBack} submitLabel="Cadastrar empresa" />
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
