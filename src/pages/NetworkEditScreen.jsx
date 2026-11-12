import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteUnit,
  deleteNetwork,
  detachUnitsToOwnNetworks,
  getUnits,
  getPlatformFeeDefaults,
  updateNetwork,
  uploadNetworkLogo,
  createPartnerOnboardingInvite,
} from '../api/admin.js';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { NetworkLogoField } from '../components/NetworkLogoField.jsx';
import { NetworkSocialFields } from '../components/NetworkSocialFields.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { confirmCrudDelete } from '../crud/crudUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { formatUnitLocation } from '../utils/address.js';
import { formatTodayHours } from '../utils/weeklySchedule.js';
import { networkSocialFromNetwork } from '../utils/networkSocial.js';
import { formatCnpjFromDigits } from '../utils/cnpj.js';
import { appConfirm } from '../components/confirm/appConfirm.js';
import { useFlashMessage } from '../components/flash/FlashMessageProvider.jsx';
import { formatPercentPtBr, parseOptionalPercent } from '../utils/parsePercentInput.js';

function acafCatalogLabel(unit) {
  const meta = unit?.acafAssociate;
  if (!meta || meta.importSource !== 'acaf_associates_xlsx') return null;
  if (meta.listed === false) {
    if (meta.spreadsheetStatus === 'remocao') {
      return { text: 'Fora do app (status)', tone: 'warning' };
    }
    return { text: 'Fora do app (sync)', tone: 'muted' };
  }
  return { text: 'No app', tone: 'success' };
}

function NetworkUnitsPanel({
  networkId,
  units,
  loading,
  readOnly,
  busy,
  onAddUnit,
  onEditUnit,
  onDeleteUnit,
  onUnitsDetached,
  onSourceNetworkRemoved,
}) {
  const flash = useFlashMessage();
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [detachBusy, setDetachBusy] = useState(false);
  const canRemoveUnits = Boolean(onDeleteUnit);
  const list = useCrudList(units, {
    searchKeys: ['unitName', 'city', 'neighborhood', 'address'],
    matchesSearch: (row, query) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const cnpj = row.acafAssociate?.cnpj ?? '';
      const hay = [
        row.unitName,
        row.city,
        row.neighborhood,
        row.address,
        cnpj,
        formatCnpjFromDigits(cnpj),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    },
    defaultSort: { key: 'unitName', direction: 'asc' },
    storageKey: networkId ? `${LIST_PREFERENCE_KEYS.networkUnits}.${networkId}` : null,
  });

  useEffect(() => {
    setSelectedIds(new Set());
  }, [networkId]);

  const toggleRow = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePage = useCallback(() => {
    const pageIds = list.rows.map((r) => r.id).filter(Boolean);
    setSelectedIds((prev) => {
      const allSelected = pageIds.length > 0 && pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }, [list.rows]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleDetachSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length < 1 || !networkId) return;

    const ok = await appConfirm({
      title: 'Tornar unidades independentes',
      message:
        `Será criada uma rede separada para cada unidade selecionada (${ids.length}), usando o nome da unidade ` +
        'e copiando logo e links desta rede. Na lista de parceiros passarão a aparecer como cadastros distintos, ' +
        'como antes de agrupar. Continuar?',
      confirmLabel: 'Criar redes',
      cancelLabel: 'Cancelar',
      tone: 'default',
    });
    if (!ok) return;

    setDetachBusy(true);
    try {
      const res = await detachUnitsToOwnNetworks(networkId, ids);
      const n = res.created?.length ?? 0;
      flash.success(
        n === 1
          ? 'Unidade movida para a própria rede.'
          : `${n} unidades movidas para redes próprias.` +
              (res.removedSourceNetwork ? ' Esta rede foi removida (ficou sem unidades).' : ''),
        10000,
      );
      clearSelection();
      if (res.removedSourceNetwork) {
        onSourceNetworkRemoved?.();
      } else {
        await onUnitsDetached?.();
      }
    } catch (err) {
      flash.error(err.message ?? 'Não foi possível desvincular as unidades.');
    } finally {
      setDetachBusy(false);
    }
  };

  const handleDelete = async (row) => {
    if (!(await confirmCrudDelete(row.unitName))) return;
    await onDeleteUnit(row);
  };

  const detachBar =
    !readOnly && selectedIds.size >= 1 ? (
      <div className="networks-merge-bar" role="region" aria-label="Desagrupar unidades">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={busy || detachBusy || loading}
          onClick={() => void handleDetachSelected()}
        >
          {detachBusy ? 'Processando…' : 'Tornar rede(s) independente(s)'}
        </button>
        <span className="networks-merge-bar-meta">
          {selectedIds.size} unidade(s) — uma nova rede por unidade (mesmo nome e identidade visual)
        </span>
        <button type="button" className="btn-ghost btn-sm" disabled={detachBusy} onClick={clearSelection}>
          Limpar seleção
        </button>
      </div>
    ) : null;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Unidades da rede</h2>
        <span className="panel-meta">{list.totalItems} registro(s)</span>
        {!readOnly && onAddUnit ? (
          <button type="button" className="btn-primary btn-sm" onClick={onAddUnit} disabled={busy}>
            Adicionar unidade
          </button>
        ) : null}
      </div>
      <CrudListShell
        embedded
        loading={loading || busy}
        query={list.query}
        onQueryChange={list.onQueryChange}
        searchPlaceholder="Buscar unidade por nome ou endereço"
        sortKey={list.sortKey}
        sortDirection={list.sortDirection}
        onSortChange={list.setSort}
        sortOptions={[
          { key: 'unitName', direction: 'asc', label: 'Nome (A–Z)' },
          { key: 'unitName', direction: 'desc', label: 'Nome (Z–A)' },
          { key: 'city', direction: 'asc', label: 'Cidade (A–Z)' },
        ]}
        page={list.page}
        pageSize={list.pageSize}
        totalItems={list.totalItems}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onPageSizeChange={list.onPageSizeChange}
        tableFooter={detachBar}
        selection={
          readOnly || !networkId
            ? null
            : {
                selectedIds,
                onToggleRow: toggleRow,
                onTogglePage: togglePage,
              }
        }
        emptyMessage="Nenhuma unidade nesta rede. Clique em Adicionar unidade para começar."
        columns={[
          {
            key: 'unitName',
            label: 'Unidade',
            render: (row) => <strong>{row.unitName}</strong>,
          },
          {
            key: 'acafAssociateCnpj',
            label: 'CNPJ',
            className: 'data-table-cell-numeric',
            render: (row) => {
              const d = row.acafAssociate?.cnpj;
              return d ? formatCnpjFromDigits(d) : '—';
            },
          },
          {
            key: 'acafCatalog',
            label: 'Catálogo app',
            render: (row) => {
              const lbl = acafCatalogLabel(row);
              if (!lbl) return '—';
              const cls =
                lbl.tone === 'success'
                  ? 'badge-success'
                  : lbl.tone === 'warning'
                    ? 'badge-warning'
                    : 'badge-muted';
              return <span className={`badge ${cls}`}>{lbl.text}</span>;
            },
          },
          {
            key: 'location',
            label: 'Localização',
            render: (row) => formatUnitLocation(row),
          },
          {
            key: 'hours',
            label: 'Horário',
            render: (row) => formatTodayHours(row),
          },
          {
            key: 'primaryMemberCount',
            label: 'Academia principal',
            render: (row) => (
              <span className="badge badge-muted" title="Usuários do app com esta unidade como principal">
                {row.primaryMemberCount ?? 0}
              </span>
            ),
          },
          {
            key: 'dailyPassActive',
            label: 'Diária',
            render: (row) => (
              <span className={`badge ${row.dailyPassActive ? 'badge-success' : 'badge-muted'}`}>
                {row.dailyPassActive ? 'Ativa' : 'Inativa'}
              </span>
            ),
          },
        ]}
        rows={list.rows}
        onView={(row) => onEditUnit(row.id)}
        onEdit={!readOnly ? (row) => onEditUnit(row.id) : undefined}
        onDelete={canRemoveUnits ? handleDelete : undefined}
        canManage
      />
    </section>
  );
}

export function NetworkEditScreen({
  network,
  readOnly = false,
  onBack,
  onEdit,
  onUpdated,
  onDeleted,
  onAddUnit,
  onEditUnit,
}) {
  const flash = useFlashMessage();
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [networkName, setNetworkName] = useState(network.name);
  const [social, setSocial] = useState(networkSocialFromNetwork(network));
  const [logoUrl, setLogoUrl] = useState(network.logoUrl ?? null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoRemovePending, setLogoRemovePending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState('');
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [platformDefaults, setPlatformDefaults] = useState({ connectFeePercent: 20, dailyFeePercent: 20 });
  const [connectOverrideInput, setConnectOverrideInput] = useState('');
  const [dailyOverrideInput, setDailyOverrideInput] = useState('');
  const [cadastralExpanded, setCadastralExpanded] = useState(false);

  const unitCountLabel = useMemo(() => `${units.length} unidade(s)`, [units.length]);

  const cadastralSummary = useMemo(() => {
    const bits = [networkName.trim() || network.name];
    const withAssociate = units.filter((u) => u.acafAssociate?.cnpj || u.acafAssociate?.legalName);
    if (withAssociate.length === 1) {
      const { legalName, cnpj } = withAssociate[0].acafAssociate ?? {};
      if (legalName) bits.push(legalName);
      if (cnpj) bits.push(formatCnpjFromDigits(cnpj));
    } else if (withAssociate.length > 1) {
      bits.push(`${withAssociate.length} unidades com cadastro fiscal`);
    }
    return bits.join(' · ');
  }, [units, networkName, network.name]);

  const loadUnits = () => {
    setUnitsLoading(true);
    return getUnits(network.id)
      .then(setUnits)
      .catch((err) => setError(err.message))
      .finally(() => setUnitsLoading(false));
  };

  /* Sincroniza nome/redes quando a API devolve novo objeto; logo só reinicia ao mudar de rede (id),
   * senão um load() com o mesmo id desfazia "Remover logo" antes de salvar. */
  useEffect(() => {
    setNetworkName(network.name);
    setSocial(networkSocialFromNetwork(network));
    setConnectOverrideInput(
      network.connectFeePercentOverride != null ? String(network.connectFeePercentOverride) : '',
    );
    setDailyOverrideInput(
      network.dailyFeePercentOverride != null ? String(network.dailyFeePercentOverride) : '',
    );
    setError('');
    setMessage('');
    setOnboardingUrl('');
    loadUnits();
  }, [network]);

  useEffect(() => {
    setLogoUrl(network.logoUrl ?? null);
    setLogoFile(null);
    setLogoRemovePending(false);
    setOnboardingUrl('');
  }, [network.id]);

  useEffect(() => {
    getPlatformFeeDefaults()
      .then(setPlatformDefaults)
      .catch(() => {});
  }, []);

  const saveNetwork = async (ev) => {
    ev.preventDefault();
    if (readOnly) return;
    if (!networkName.trim()) {
      setError('Informe o nome comercial da rede.');
      setCadastralExpanded(true);
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const connectParsed = parseOptionalPercent(connectOverrideInput);
      const dailyParsed = parseOptionalPercent(dailyOverrideInput);
      if (connectParsed === undefined || dailyParsed === undefined) {
        setError(
          'Informe percentuais válidos (0–100), com vírgula ou ponto nas decimais, ou deixe em branco para herdar o padrão global.',
        );
        setBusy(false);
        return;
      }
      const patch = {
        name: networkName,
        social,
        connectFeePercentOverride: connectParsed,
        dailyFeePercentOverride: dailyParsed,
      };
      if (logoRemovePending && !logoFile) {
        patch.logoUrl = null;
      }
      let next = await updateNetwork(network.id, patch);
      if (logoFile) {
        next = await uploadNetworkLogo(network.id, logoFile);
      }
      setLogoFile(null);
      setLogoRemovePending(false);
      setLogoUrl(next.logoUrl ?? null);
      setSocial(networkSocialFromNetwork(next));
      setMessage('Rede atualizada.');
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeUnit = async (unit) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await deleteUnit(unit.id);
      setMessage(`Unidade "${unit.unitName}" removida.`);
      await loadUnits();
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnitsDetached = async () => {
    await loadUnits();
    onUpdated?.();
  };

  const generateOnboardingLink = async () => {
    setOnboardingBusy(true);
    setError('');
    try {
      const res = await createPartnerOnboardingInvite(network.id);
      setOnboardingUrl(res.inviteUrl ?? '');
      flash.success('Link de onboarding gerado. Copie e envie ao parceiro (válido por 14 dias).', 8000);
    } catch (err) {
      setError(err.message);
    } finally {
      setOnboardingBusy(false);
    }
  };

  const copyOnboardingLink = async () => {
    if (!onboardingUrl) return;
    try {
      await navigator.clipboard.writeText(onboardingUrl);
      flash.success('Link copiado para a área de transferência.', 4000);
    } catch {
      flash.error('Não foi possível copiar. Selecione o campo e copie manualmente.');
    }
  };

  const connectPreview = parseOptionalPercent(connectOverrideInput);
  const dailyPreview = parseOptionalPercent(dailyOverrideInput);
  const connectEffectiveLabel =
    String(connectOverrideInput ?? '').trim() === ''
      ? formatPercentPtBr(platformDefaults.connectFeePercent)
      : connectPreview !== undefined
        ? formatPercentPtBr(connectPreview)
        : '…';
  const dailyEffectiveLabel =
    String(dailyOverrideInput ?? '').trim() === ''
      ? formatPercentPtBr(platformDefaults.dailyFeePercent)
      : dailyPreview !== undefined
        ? formatPercentPtBr(dailyPreview)
        : '…';

  const removeNetwork = async () => {
    if (!(await confirmCrudDelete(networkName))) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await deleteNetwork(network.id);
      onDeleted?.();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        breadcrumbs={[{ label: 'Parceiros', onClick: onBack }, { label: networkName }]}
        title={readOnly ? networkName : 'Editar rede'}
        subtitle={unitCountLabel}
      />

      <CrudAlerts error={error} message={message} />

      <section className="panel">
        <div className="panel-header">
          <h2>Dados da rede</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={saveNetwork}>
            <section
              className={`form-section field-span-full address-fields-collapsible ${
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
                    <span className="collapsible-summary">{cadastralSummary}</span>
                  ) : null}
                </span>
                <span className="collapsible-chevron" aria-hidden>
                  {cadastralExpanded ? '▾' : '▸'}
                </span>
              </button>
              {cadastralExpanded ? (
                <>
                  <section className="form-section field-span-full">
                    <h3 className="form-section-title">Identidade</h3>
                    <div className="form-grid-inner">
                      <div className="field-span-full">
                        <NetworkLogoField
                          value={logoUrl}
                          onChange={(file) => {
                            setLogoFile(file);
                            if (file) setLogoRemovePending(false);
                          }}
                          onRemoveLogo={
                            readOnly
                              ? undefined
                              : () => {
                                  setLogoRemovePending(true);
                                  setLogoUrl(null);
                                  setLogoFile(null);
                                }
                          }
                          disabled={busy || readOnly}
                        />
                      </div>
                      <label>
                        <span>Nome comercial</span>
                        <input
                          className="input"
                          value={networkName}
                          onChange={(e) => setNetworkName(e.target.value)}
                          placeholder="Ex.: Academia H2O"
                          required
                          disabled={readOnly}
                        />
                      </label>
                      <label>
                        <span>Responsável comercial</span>
                        <input
                          className="input"
                          value={network.commercialOwnerName ?? '—'}
                          readOnly
                          disabled
                        />
                      </label>
                    </div>
                  </section>

                  <NetworkSocialFields value={social} onChange={setSocial} disabled={busy || readOnly} />
                </>
              ) : null}
            </section>

            <section className="form-section field-span-full network-platform-fees">
              <h3 className="form-section-title">Taxa da plataforma (rede)</h3>
              <div className="network-platform-fees-layout">
                <p className="network-platform-fees-intro muted">
                  Ajuste por <strong>cliente (rede)</strong>: valores valem para todas as unidades deste parceiro, salvo
                  quando a própria unidade definir um valor próprio. Padrão global em{' '}
                  <strong>Sistema → Configurações</strong>: planos {formatPercentPtBr(platformDefaults.connectFeePercent)}{' '}
                  · diárias {formatPercentPtBr(platformDefaults.dailyFeePercent)}. Deixe os campos em branco para{' '}
                  <strong>herdar</strong> esse padrão; use vírgula ou ponto nas decimais (ex.: 22,01).
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
                        {String(connectOverrideInput).trim() ? 'Fixado na rede' : 'Herdando global'}
                      </span>
                    </div>
                    <p className="network-platform-fee-effective muted">
                      Efeito nesta rede: <strong>{connectEffectiveLabel}</strong>
                    </p>
                    <label className="network-platform-fee-field">
                      <span>Percentual personalizado (opcional)</span>
                      <input
                        className="input"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={`Padrão ${formatPercentPtBr(platformDefaults.connectFeePercent)}`}
                        value={connectOverrideInput}
                        onChange={(e) => setConnectOverrideInput(e.target.value)}
                        disabled={readOnly || busy}
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
                        {String(dailyOverrideInput).trim() ? 'Fixado na rede' : 'Herdando global'}
                      </span>
                    </div>
                    <p className="network-platform-fee-effective muted">
                      Efeito nesta rede: <strong>{dailyEffectiveLabel}</strong>
                    </p>
                    <label className="network-platform-fee-field">
                      <span>Percentual personalizado (opcional)</span>
                      <input
                        className="input"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={`Padrão ${formatPercentPtBr(platformDefaults.dailyFeePercent)}`}
                        value={dailyOverrideInput}
                        onChange={(e) => setDailyOverrideInput(e.target.value)}
                        disabled={readOnly || busy}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section className="form-section field-span-full">
              <h3 className="form-section-title">Onboarding — portal do parceiro</h3>
              <p className="muted" style={{ marginTop: 0 }}>
                Gere um link único para o parceiro criar o primeiro usuário com acesso a{' '}
                <strong>todas as unidades desta rede</strong>. Cada geração cria um novo convite (válido 14 dias).
              </p>
              <div className="form-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={readOnly || busy || onboardingBusy || units.length === 0}
                  onClick={() => void generateOnboardingLink()}
                >
                  {onboardingBusy ? 'Gerando…' : 'Gerar link de cadastro'}
                </button>
              </div>
              {units.length === 0 ? (
                <p className="muted" style={{ marginBottom: 0 }}>
                  Cadastre ao menos uma unidade para habilitar o onboarding.
                </p>
              ) : null}
              {onboardingUrl ? (
                <label className="field-span-full" style={{ marginTop: '0.75rem' }}>
                  <span>Link para enviar ao parceiro</span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input className="input" readOnly value={onboardingUrl} style={{ flex: '1 1 240px' }} />
                    <button type="button" className="btn-ghost btn-sm" onClick={() => void copyOnboardingLink()}>
                      Copiar
                    </button>
                  </div>
                </label>
              ) : null}
            </section>

            <div className="field-span-full form-actions">
              {readOnly ? (
                <CrudViewActions onBack={onBack} onEdit={onEdit} />
              ) : (
                <CrudFormActions
                  busy={busy}
                  onCancel={onBack}
                  submitLabel="Salvar alterações"
                  onDelete={removeNetwork}
                  showDelete
                  deleteLabel="Excluir parceiro"
                />
              )}
            </div>
          </form>
        </div>
      </section>

      <NetworkUnitsPanel
        networkId={network.id}
        units={units}
        loading={unitsLoading}
        readOnly={readOnly}
        busy={busy}
        onAddUnit={onAddUnit}
        onEditUnit={onEditUnit}
        onDeleteUnit={removeUnit}
        onUnitsDetached={handleUnitsDetached}
        onSourceNetworkRemoved={onDeleted}
      />
    </div>
  );
}
