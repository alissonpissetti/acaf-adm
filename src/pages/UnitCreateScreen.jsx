import { useState } from 'react';
import { createUnit } from '../api/admin.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { UnitAddressFields } from '../components/UnitAddressFields.jsx';
import { UnitWeeklyHoursFields } from '../components/UnitWeeklyHoursFields.jsx';
import { emptyUnitAddress } from '../utils/address.js';
import { defaultWeeklySchedule } from '../utils/weeklySchedule.js';

const emptyForm = {
  unitName: '',
  description: '',
  weeklySchedule: defaultWeeklySchedule(),
  ...emptyUnitAddress,
};

export function UnitCreateScreen({ network, onBack, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    try {
      const units = await createUnit({ ...form, networkId: network.id });
      const created =
        units.find((unit) => unit.unitName === form.unitName.trim()) ??
        units[units.length - 1];
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
        breadcrumbs={[
          { label: 'Redes', onClick: onBack.toList },
          { label: network.name, onClick: onBack.toNetwork },
          { label: 'Nova unidade' },
        ]}
        title="Adicionar unidade"
        subtitle={`Rede ${network.name}`}
        actions={
          <button type="button" className="btn-ghost" onClick={onBack.toNetwork}>
            Voltar para rede
          </button>
        }
      />

      <section className="panel">
        <div className="panel-header">
          <h2>Dados da unidade</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={onSubmit}>
            <label className="field-span-2">
              <span>Nome da unidade</span>
              <input
                value={form.unitName}
                onChange={(e) => setForm({ ...form, unitName: e.target.value })}
                placeholder="Unidade Portão"
                autoFocus
                required
              />
            </label>

            <UnitAddressFields
              value={form}
              onChange={(patch) =>
                setForm((current) => ({
                  ...current,
                  ...(typeof patch === 'function' ? patch(current) : patch),
                }))
              }
              disabled={busy}
            />

            <UnitWeeklyHoursFields
              value={form.weeklySchedule}
              onChange={(weeklySchedule) => setForm({ ...form, weeklySchedule })}
              disabled={busy}
            />

            <label className="field-span-2">
              <span>Descrição</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <div className="field-span-2 panel-actions">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Salvando…' : 'Cadastrar unidade'}
              </button>
              <button type="button" className="btn-ghost" onClick={onBack.toNetwork}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
