import { useEffect, useState } from 'react';
import { getUnits, updateUnit } from '../api/admin.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { SuccessFlashEffect } from '../components/flash/FlashMessageProvider.jsx';
import { UnitAddressFields } from '../components/UnitAddressFields.jsx';
import { UnitCheckInsField } from '../components/UnitCheckInsField.jsx';
import { UnitPartnerUsersField } from '../components/UnitPartnerUsersField.jsx';
import { UnitPhotosField } from '../components/UnitPhotosField.jsx';
import { UnitWeeklyHoursFields } from '../components/UnitWeeklyHoursFields.jsx';
import { formatUnitLocation, unitToAddressForm } from '../utils/address.js';
import { weeklyScheduleFromUnit } from '../utils/weeklySchedule.js';

const TABS = [
  { id: 'dados', label: 'Dados da unidade' },
  { id: 'endereco', label: 'Endereço' },
  { id: 'horario', label: 'Horário' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'acesso', label: 'Acesso parceiro' },
  { id: 'checkins', label: 'Check-ins' },
  { id: 'diarias', label: 'Diárias' },
];

const FORM_TABS = new Set(['dados', 'endereco', 'horario', 'diarias']);

export function UnitEditScreen({ network, unitId, onBack, onUpdated }) {
  const [unit, setUnit] = useState(null);
  const [form, setForm] = useState(null);
  const [activeTab, setActiveTab] = useState('dados');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getUnits(network.id)
      .then((units) => {
        const found = units.find((item) => item.id === unitId);
        if (!found) {
          throw new Error('Unidade não encontrada.');
        }
        setUnit(found);
        const address = unitToAddressForm(found);
        setForm({
          unitName: found.unitName,
          weeklySchedule: weeklyScheduleFromUnit(found),
          description: found.description ?? '',
          dailyPassActive: found.dailyPassActive ?? false,
          ...address,
        });
      })
      .catch((err) => setError(err.message));
  }, [network.id, unitId]);

  const patchForm = (patch) => {
    setForm((current) => ({
      ...current,
      ...(typeof patch === 'function' ? patch(current) : patch),
    }));
  };

  const saveUnit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await updateUnit(unitId, {
        unitName: form.unitName,
        zip: form.zip,
        address: form.address,
        number: form.number,
        complement: form.complement,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        weeklySchedule: form.weeklySchedule,
        description: form.description,
        dailyPassActive: form.dailyPassActive,
      });
      setMessage('Unidade atualizada.');
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!unit && !error) {
    return (
      <div className="panel">
        <div className="panel-body">Carregando unidade…</div>
      </div>
    );
  }

  if (!unit || !form) {
    return (
      <div className="page-stack">
        <p className="error-text">{error || 'Unidade não encontrada.'}</p>
        <button type="button" className="btn-ghost" onClick={onBack.toNetwork}>
          Voltar para rede
        </button>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        breadcrumbs={[
          { label: 'Parceiros', onClick: onBack.toList },
          { label: network.name, onClick: onBack.toNetwork },
          { label: form.unitName },
        ]}
        title="Editar unidade"
        subtitle={formatUnitLocation(form)}
        actions={
          <button type="button" className="btn-ghost" onClick={onBack.toNetwork}>
            Voltar para rede
          </button>
        }
      />

      <section className="panel">
        <div className="unit-edit-tabs" role="tablist" aria-label="Seções da unidade">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? 'unit-edit-tab active' : 'unit-edit-tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="panel-body">
          {FORM_TABS.has(activeTab) ? (
            <form className="form-grid" onSubmit={saveUnit}>
              {activeTab === 'dados' ? (
                <div className="unit-edit-tab-panel field-span-full" role="tabpanel">
                  <label>
                    <span>Nome da unidade</span>
                    <input
                      value={form.unitName}
                      onChange={(e) => setForm({ ...form, unitName: e.target.value })}
                      required
                    />
                  </label>
                  <label className="field-span-2">
                    <span>Descrição</span>
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </label>
                </div>
              ) : null}

              {activeTab === 'endereco' ? (
                <div className="unit-edit-tab-panel field-span-full" role="tabpanel">
                  <UnitAddressFields
                    value={form}
                    onChange={patchForm}
                    disabled={busy}
                    embedded
                  />
                </div>
              ) : null}

              {activeTab === 'horario' ? (
                <div className="unit-edit-tab-panel field-span-full" role="tabpanel">
                  <UnitWeeklyHoursFields
                    value={form.weeklySchedule}
                    onChange={(weeklySchedule) => setForm({ ...form, weeklySchedule })}
                    disabled={busy}
                    embedded
                  />
                </div>
              ) : null}

              {activeTab === 'diarias' ? (
                <div className="unit-edit-tab-panel field-span-full" role="tabpanel">
                  <label>
                    <span>Diária avulsa</span>
                    <p className="muted unit-tab-help">
                      Define se a unidade aceita venda de diárias avulsas pelo ACAF.
                    </p>
                    <div className="toggle-row">
                      <button
                        type="button"
                        className={form.dailyPassActive ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                        onClick={() => setForm({ ...form, dailyPassActive: true })}
                      >
                        Ativa
                      </button>
                      <button
                        type="button"
                        className={!form.dailyPassActive ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                        onClick={() => setForm({ ...form, dailyPassActive: false })}
                      >
                        Inativa
                      </button>
                    </div>
                  </label>
                </div>
              ) : null}

              <div className="field-span-full form-actions panel-actions">
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          ) : null}

          {activeTab === 'fotos' ? (
            <div className="unit-edit-tab-panel" role="tabpanel">
              <UnitPhotosField
                unitId={unitId}
                heroPhoto={unit.heroPhotoDataUrl}
                galleryPhotos={unit.galleryPhotoDataUrls}
                onChange={(photos) => {
                  setUnit((current) => ({ ...current, ...photos }));
                }}
                disabled={busy}
                embedded
              />
            </div>
          ) : null}

          {activeTab === 'acesso' ? (
            <div className="unit-edit-tab-panel" role="tabpanel">
              <UnitPartnerUsersField unitId={unitId} disabled={busy} embedded />
            </div>
          ) : null}

          {activeTab === 'checkins' ? (
            <div className="unit-edit-tab-panel" role="tabpanel">
              <UnitCheckInsField unitId={unitId} disabled={busy} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel panel-muted">
        <div className="panel-header">
          <h2>Operação</h2>
        </div>
        <div className="panel-body">
          <p className="muted">
            Para cancelar check-ins de teste, use a aba <strong>Check-ins</strong> acima.
            O check-in automático por GPS é exclusivo do portal parceiro (recepção).
          </p>
        </div>
      </section>

      <SuccessFlashEffect message={message} />
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
