import { useState } from 'react';
import { createUnit } from '../api/admin.js';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions } from '../components/crud/CrudFormActions.jsx';
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
          { label: 'Parceiros', onClick: onBack.toList },
          { label: network.name, onClick: onBack.toNetwork },
          { label: 'Nova unidade' },
        ]}
        title="Adicionar unidade"
        subtitle={`Rede ${network.name}`}
      />

      <CrudAlerts error={error} />

      <section className="panel">
        <div className="panel-header">
          <h2>Dados da unidade</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={onSubmit}>
            <label>
              <span>Nome da unidade</span>
              <input
                className="input"
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
                className="input"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <div className="field-span-full form-actions">
              <CrudFormActions
                busy={busy}
                onCancel={onBack.toNetwork}
                submitLabel="Cadastrar unidade"
              />
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
