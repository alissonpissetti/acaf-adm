import { useEffect, useMemo, useState } from 'react';
import { deleteUnit, getPlatformFeeDefaults, getUnits, updateUnit } from '../api/admin.js';
import { CrudFormActions } from '../components/crud/CrudFormActions.jsx';
import { confirmCrudDelete } from '../crud/crudUtils.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { SuccessFlashEffect } from '../components/flash/FlashMessageProvider.jsx';
import { UnitAddressFields } from '../components/UnitAddressFields.jsx';
import { UnitCheckInsField } from '../components/UnitCheckInsField.jsx';
import { UnitPartnerUsersField } from '../components/UnitPartnerUsersField.jsx';
import { UnitPhotosField } from '../components/UnitPhotosField.jsx';
import { UnitWeeklyHoursFields } from '../components/UnitWeeklyHoursFields.jsx';
import { formatUnitLocation, unitToAddressForm } from '../utils/address.js';
import { weeklyScheduleFromUnit } from '../utils/weeklySchedule.js';
import { formatCnpjFromDigits } from '../utils/cnpj.js';
import { acafAssociateFormFromUnit, payloadFromAcafForm } from '../utils/acafAssociateForm.js';
import { formatPercentPtBr, parseOptionalPercent } from '../utils/parsePercentInput.js';

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
  const [platformDefaults, setPlatformDefaults] = useState({ connectFeePercent: 20, dailyFeePercent: 20 });
  const [connectOverrideInput, setConnectOverrideInput] = useState('');
  const [dailyOverrideInput, setDailyOverrideInput] = useState('');
  const [cadastralExpanded, setCadastralExpanded] = useState(false);

  const acafCadastralSummary = useMemo(() => {
    if (!form?.acafAssociate) return '';
    const bits = [];
    if (form.acafAssociate.legalName) bits.push(form.acafAssociate.legalName);
    if (unit?.acafAssociate?.cnpj) bits.push(formatCnpjFromDigits(unit.acafAssociate.cnpj));
    return bits.join(' · ') || 'Importação movly.';
  }, [form?.acafAssociate, unit?.acafAssociate?.cnpj]);

  useEffect(() => {
    getPlatformFeeDefaults()
      .then(setPlatformDefaults)
      .catch(() => {});
  }, []);

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
          acafAssociate: acafAssociateFormFromUnit(found),
        });
        setConnectOverrideInput(
          found.connectFeePercentOverride != null ? String(found.connectFeePercentOverride) : '',
        );
        setDailyOverrideInput(
          found.dailyFeePercentOverride != null ? String(found.dailyFeePercentOverride) : '',
        );
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
      const connectParsed = parseOptionalPercent(connectOverrideInput);
      const dailyParsed = parseOptionalPercent(dailyOverrideInput);
      if (connectParsed === undefined || dailyParsed === undefined) {
        setError(
          'Informe percentuais válidos (0–100), com vírgula ou ponto nas decimais, ou deixe em branco para usar rede/padrão global.',
        );
        setBusy(false);
        return;
      }
      const patch = {
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
        connectFeePercentOverride: connectParsed,
        dailyFeePercentOverride: dailyParsed,
      };
      if (form.acafAssociate) {
        patch.acafAssociate = payloadFromAcafForm(form.acafAssociate);
      }
      const units = await updateUnit(unitId, patch);
      const refreshed = Array.isArray(units) ? units.find((u) => u.id === unitId) : null;
      if (refreshed) {
        setUnit(refreshed);
        const address = unitToAddressForm(refreshed);
        setForm({
          unitName: refreshed.unitName,
          weeklySchedule: weeklyScheduleFromUnit(refreshed),
          description: refreshed.description ?? '',
          dailyPassActive: refreshed.dailyPassActive ?? false,
          ...address,
          acafAssociate: acafAssociateFormFromUnit(refreshed),
        });
        setConnectOverrideInput(
          refreshed.connectFeePercentOverride != null ? String(refreshed.connectFeePercentOverride) : '',
        );
        setDailyOverrideInput(
          refreshed.dailyFeePercentOverride != null ? String(refreshed.dailyFeePercentOverride) : '',
        );
      }
      setMessage('Unidade atualizada.');
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeUnit = async () => {
    if (!unit) return;
    if (!(await confirmCrudDelete(form?.unitName ?? unit.unitName))) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await deleteUnit(unitId);
      onUpdated?.();
      onBack.toNetwork();
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
                  {form.acafAssociate && unit.acafAssociate?.importSource === 'acaf_associates_xlsx' ? (
                    <div
                      className={`field-span-2 acaf-associate-readonly address-fields-collapsible ${
                        cadastralExpanded ? 'is-expanded' : 'is-collapsed'
                      }`}
                    >
                      <button
                        type="button"
                        className="collapsible-header"
                        onClick={() => setCadastralExpanded((open) => !open)}
                        aria-expanded={cadastralExpanded}
                      >
                        <span className="collapsible-header-main">
                          <strong>Dados cadastrais</strong>
                          {!cadastralExpanded ? (
                            <span className="collapsible-summary">{acafCadastralSummary}</span>
                          ) : null}
                        </span>
                        <span className="collapsible-chevron" aria-hidden>
                          {cadastralExpanded ? '▾' : '▸'}
                        </span>
                      </button>
                      {cadastralExpanded ? (
                        <>
                      <h3 className="section-subtitle">Dados da importação movly.</h3>
                      <p className="muted">
                        Edite os dados abaixo quando precisar corrigir a base; o{' '}
                        <strong>CNPJ</strong> não pode ser alterado aqui (veio da planilha). Uma nova
                        importação pode sobrescrever estes campos, exceto quando você só ajustar o que a
                        planilha não traz.
                      </p>
                      <div className="acaf-meta-form-grid">
                        <label>
                          <span>CNPJ</span>
                          <input
                            value={formatCnpjFromDigits(unit.acafAssociate.cnpj)}
                            disabled
                            readOnly
                            className="input-disabled"
                          />
                        </label>
                        <label className="field-span-2">
                          <span>Razão social</span>
                          <input
                            value={form.acafAssociate.legalName}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                acafAssociate: { ...form.acafAssociate, legalName: e.target.value },
                              })
                            }
                            disabled={busy}
                          />
                        </label>
                        <label>
                          <span>Associação</span>
                          <input
                            value={form.acafAssociate.association}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                acafAssociate: { ...form.acafAssociate, association: e.target.value },
                              })
                            }
                            disabled={busy}
                          />
                        </label>
                        <label>
                          <span>Data de assinatura</span>
                          <input
                            type="date"
                            value={form.acafAssociate.signedAt}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                acafAssociate: { ...form.acafAssociate, signedAt: e.target.value },
                              })
                            }
                            disabled={busy}
                          />
                        </label>
                        <label>
                          <span>E-mail (planilha)</span>
                          <input
                            type="email"
                            value={form.acafAssociate.contactEmail}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                acafAssociate: { ...form.acafAssociate, contactEmail: e.target.value },
                              })
                            }
                            disabled={busy}
                          />
                        </label>
                        <label>
                          <span>Telefone (planilha)</span>
                          <input
                            inputMode="numeric"
                            autoComplete="tel"
                            placeholder="(00) 00000-0000"
                            value={form.acafAssociate.contactPhone}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                acafAssociate: { ...form.acafAssociate, contactPhone: e.target.value },
                              })
                            }
                            disabled={busy}
                          />
                        </label>
                        <label className="field-span-2">
                          <span>Complemento (cadastro fiscal)</span>
                          <input
                            value={form.acafAssociate.complement ?? ''}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                acafAssociate: { ...form.acafAssociate, complement: e.target.value },
                              })
                            }
                            disabled={busy}
                          />
                        </label>
                        <div className="field-span-2">
                          <span className="field-label-block">Catálogo do app</span>
                          <p className="muted unit-tab-help">
                            Desligar só oculta no app; o cadastro interno permanece (útil após remoção na
                            planilha).
                          </p>
                          <div className="toggle-row">
                            <button
                              type="button"
                              className={form.acafAssociate.listed ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                              onClick={() =>
                                setForm({
                                  ...form,
                                  acafAssociate: { ...form.acafAssociate, listed: true },
                                })
                              }
                              disabled={busy}
                            >
                              No app
                            </button>
                            <button
                              type="button"
                              className={!form.acafAssociate.listed ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                              onClick={() =>
                                setForm({
                                  ...form,
                                  acafAssociate: { ...form.acafAssociate, listed: false },
                                })
                              }
                              disabled={busy}
                            >
                              Fora do app
                            </button>
                          </div>
                        </div>
                        <p className="muted field-span-2 acaf-import-foot">
                          Última importação do arquivo:{' '}
                          {unit.acafAssociate.importedAt
                            ? new Date(unit.acafAssociate.importedAt).toLocaleString('pt-BR')
                            : '—'}
                        </p>
                      </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
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
                      Define se a unidade aceita venda de diárias avulsas pelo app.
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
                  <div className="field-span-full network-platform-fees" style={{ marginTop: 16 }}>
                    <h3 className="section-subtitle">Taxa da plataforma (unidade)</h3>
                    <div className="network-platform-fees-layout">
                      <p className="network-platform-fees-intro muted unit-tab-help">
                        Ordem de aplicação: <strong>unidade</strong> → <strong>rede</strong> → padrão global (
                        <strong>Sistema → Configurações</strong>: planos {formatPercentPtBr(platformDefaults.connectFeePercent)}{' '}
                        · diárias {formatPercentPtBr(platformDefaults.dailyFeePercent)}). Deixe em branco para herdar da
                        rede / global. Use vírgula ou ponto nas decimais.
                      </p>
                      <div className="network-platform-fees-cards">
                        <div className="network-platform-fee-card">
                          <div className="network-platform-fee-card-head">
                            <span className="network-platform-fee-card-title">Planos de assinatura</span>
                            <span
                              className={`network-platform-fee-badge ${
                                String(connectOverrideInput).trim() ? 'network-platform-fee-badge--fixed' : ''
                              }`}
                            >
                              {String(connectOverrideInput).trim() ? 'Só esta unidade' : 'Herdando'}
                            </span>
                          </div>
                          <label className="network-platform-fee-field">
                            <span>Percentual (opcional)</span>
                            <input
                              className="input"
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              spellCheck={false}
                              placeholder={`Rede / padrão ${formatPercentPtBr(platformDefaults.connectFeePercent)}`}
                              value={connectOverrideInput}
                              onChange={(e) => setConnectOverrideInput(e.target.value)}
                              disabled={busy}
                            />
                          </label>
                        </div>
                        <div className="network-platform-fee-card">
                          <div className="network-platform-fee-card-head">
                            <span className="network-platform-fee-card-title">Diárias avulsas</span>
                            <span
                              className={`network-platform-fee-badge ${
                                String(dailyOverrideInput).trim() ? 'network-platform-fee-badge--fixed' : ''
                              }`}
                            >
                              {String(dailyOverrideInput).trim() ? 'Só esta unidade' : 'Herdando'}
                            </span>
                          </div>
                          <label className="network-platform-fee-field">
                            <span>Percentual (opcional)</span>
                            <input
                              className="input"
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              spellCheck={false}
                              placeholder={`Rede / padrão ${formatPercentPtBr(platformDefaults.dailyFeePercent)}`}
                              value={dailyOverrideInput}
                              onChange={(e) => setDailyOverrideInput(e.target.value)}
                              disabled={busy}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="field-span-full form-actions panel-actions">
                <CrudFormActions
                  busy={busy}
                  onCancel={onBack.toNetwork}
                  submitLabel="Salvar alterações"
                  onDelete={removeUnit}
                  showDelete
                  deleteLabel="Excluir unidade"
                />
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
