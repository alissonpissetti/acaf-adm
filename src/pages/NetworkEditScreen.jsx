import { useEffect, useMemo, useState } from 'react';
import { deleteUnit, deleteNetwork, getUnits, updateNetwork, uploadNetworkLogo } from '../api/admin.js';
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

function NetworkUnitsPanel({
  networkId,
  units,
  loading,
  readOnly,
  busy,
  onAddUnit,
  onEditUnit,
  onDeleteUnit,
}) {
  const list = useCrudList(units, {
    searchKeys: ['unitName', 'city', 'neighborhood', 'address'],
    defaultSort: { key: 'unitName', direction: 'asc' },
    storageKey: networkId ? `${LIST_PREFERENCE_KEYS.networkUnits}.${networkId}` : null,
  });

  const handleDelete = async (row) => {
    if (!(await confirmCrudDelete(row.unitName))) return;
    await onDeleteUnit(row);
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Unidades da rede</h2>
        <span className="panel-meta">{list.totalItems} registro(s)</span>
        {!readOnly ? (
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
        emptyMessage="Nenhuma unidade nesta rede. Clique em Adicionar unidade para começar."
        columns={[
          {
            key: 'unitName',
            label: 'Unidade',
            render: (row) => <strong>{row.unitName}</strong>,
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
        onDelete={!readOnly ? handleDelete : undefined}
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
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [networkName, setNetworkName] = useState(network.name);
  const [social, setSocial] = useState(networkSocialFromNetwork(network));
  const [logoUrl, setLogoUrl] = useState(network.logoUrl ?? null);
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const unitCountLabel = useMemo(() => `${units.length} unidade(s)`, [units.length]);

  const loadUnits = () => {
    setUnitsLoading(true);
    return getUnits(network.id)
      .then(setUnits)
      .catch((err) => setError(err.message))
      .finally(() => setUnitsLoading(false));
  };

  useEffect(() => {
    setNetworkName(network.name);
    setSocial(networkSocialFromNetwork(network));
    setLogoUrl(network.logoUrl ?? null);
    setLogoFile(null);
    setError('');
    setMessage('');
    loadUnits();
  }, [network]);

  const saveNetwork = async (ev) => {
    ev.preventDefault();
    if (readOnly) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateNetwork(network.id, { name: networkName, social });
      let next = updated;
      if (logoFile) {
        next = await uploadNetworkLogo(network.id, logoFile);
        setLogoFile(null);
      }
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
            <section className="form-section field-span-full">
              <h3 className="form-section-title">Identidade</h3>
              <div className="form-grid-inner">
                <div className="field-span-full">
                  <NetworkLogoField
                    value={logoUrl}
                    onChange={setLogoFile}
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
      />
    </div>
  );
}
