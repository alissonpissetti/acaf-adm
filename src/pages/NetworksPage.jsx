import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deleteNetwork, getNetworks, getUnits, purgeAcafImportedNetworks } from '../api/admin.js';
import { listCityOptions, networkIdsInCity } from '../utils/networksMapGeo.js';
import { confirmCrudDelete } from '../crud/crudUtils.js';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { appConfirm, appAlert } from '../components/confirm/appConfirm.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { NetworkCreateScreen } from './NetworkCreateScreen.jsx';
import { NetworkEditScreen } from './NetworkEditScreen.jsx';
import { NetworksList } from './NetworksList.jsx';
import { AcafAssociatesImportPanel } from '../components/AcafAssociatesImportPanel.jsx';
import { NetworksUnitsMap } from '../components/networks/NetworksUnitsMap.jsx';
import {
  filterNetworksByPartnerAccess,
  PARTNER_ACCESS_FILTER_OPTIONS,
} from '../utils/networkPartnerAccessFilter.js';
import { UnitCreateScreen } from './UnitCreateScreen.jsx';
import { UnitEditScreen } from './UnitEditScreen.jsx';
import { useFlashMessage } from '../components/flash/FlashMessageProvider.jsx';
import {
  readNetworksViewMode,
  writeNetworksViewMode,
} from '../utils/networksPageStorage.js';
import { showDangerTools } from '../config.js';

export function NetworksPage() {
  const flash = useFlashMessage();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id');
  const mode = searchParams.get('mode');
  const unitParam = searchParams.get('unit');
  const isCreatingNetwork = searchParams.get('new') === '1';
  const isCreatingUnit = unitParam === 'new';
  const unitId = unitParam && unitParam !== 'new' ? unitParam : null;
  const isViewingNetwork = Boolean(selectedId) && mode === 'view' && !unitParam;
  const dangerToolsVisible = showDangerTools(searchParams.get('danger'));

  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purgeBusy, setPurgeBusy] = useState(false);
  /** @type {'both' | 'list' | 'map'} */
  const [listLayout, setListLayout] = useState(() => readNetworksViewMode());
  /** @type {import('../utils/networkPartnerAccessFilter.js').NetworkPartnerAccessFilter} */
  const [partnerAccessFilter, setPartnerAccessFilter] = useState('all');
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [mapCityFilter, setMapCityFilter] = useState('');
  const [mapLayerMode, setMapLayerMode] = useState('units');

  const selectedNetwork = useMemo(
    () => networks.find((network) => network.id === selectedId) ?? null,
    [networks, selectedId],
  );

  const filteredNetworks = useMemo(
    () => filterNetworksByPartnerAccess(partnerAccessFilter, networks),
    [networks, partnerAccessFilter],
  );

  const filteredNetworkIds = useMemo(
    () => (partnerAccessFilter === 'all' ? null : new Set(filteredNetworks.map((n) => n.id))),
    [filteredNetworks, partnerAccessFilter],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setNetworks(await getNetworks());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    setUnitsLoading(true);
    try {
      const rows = await getUnits();
      setUnits(Array.isArray(rows) ? rows : []);
    } catch {
      setUnits([]);
    } finally {
      setUnitsLoading(false);
    }
  };

  useEffect(() => {
    load();
    void loadUnits();
  }, []);

  useEffect(() => {
    writeNetworksViewMode(listLayout);
  }, [listLayout]);

  const mapCityOptions = useMemo(() => listCityOptions(units), [units]);
  const mapCityLabel = useMemo(
    () => mapCityOptions.find((c) => c.key === mapCityFilter)?.label ?? '',
    [mapCityOptions, mapCityFilter],
  );

  const networksForList = useMemo(() => {
    let rows = filterNetworksByPartnerAccess(partnerAccessFilter, networks);
    const ids = networkIdsInCity(units, mapCityFilter);
    if (ids) {
      rows = rows.filter((n) => ids.has(n.id));
    }
    return rows;
  }, [networks, units, mapCityFilter, partnerAccessFilter]);

  const goToList = () => {
    setSearchParams({});
    load();
  };

  const goToCreateNetwork = () => {
    setSearchParams({ new: '1' });
  };

  const goToEditNetwork = (networkId) => {
    setSearchParams({ id: networkId });
  };

  const goToViewNetwork = (networkId) => {
    setSearchParams({ id: networkId, mode: 'view' });
  };

  const goToCreateUnit = () => {
    if (!selectedId) return;
    setSearchParams({ id: selectedId, unit: 'new' });
  };

  const goToEditUnit = (id) => {
    if (!selectedId) return;
    setSearchParams({ id: selectedId, unit: id });
  };

  const goToUnitFromMap = (networkId, unitId) => {
    setSearchParams({ id: networkId, unit: unitId });
  };

  const goToNetworkFromUnit = () => {
    if (!selectedId) return;
    setSearchParams({ id: selectedId });
  };

  const onNetworkCreated = (network) => {
    load();
    setSearchParams({ id: network.id });
  };

  const onUnitCreated = (unit) => {
    load();
    setSearchParams({ id: selectedId, unit: unit.id });
  };

  const handlePurgeAcafNetworks = async () => {
    const ok = await appConfirm({
      title: 'Remover parceiros movly. importados',
      message:
        'Serão excluídas todas as redes criadas pela importação da planilha movly. (identificadores net_acaf_*, inclusive net_acaf_grp_*), ' +
        'unidades e dados vinculados. Redes com usuários do app tendo esta academia como principal ou com ' +
        'equipe parceira vinculada serão ignoradas (lista no resultado). Confirma?',
      confirmLabel: 'Remover em lote',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!ok) return;
    setPurgeBusy(true);
    setError('');
    try {
      const res = await purgeAcafImportedNetworks();
      await load();
      const skipped = res.skipped?.length ?? 0;
      flash.success(
        `movly.: ${res.removed ?? 0} de ${res.candidates ?? 0} rede(s) removida(s)` +
          (skipped ? `; ${skipped} ignorada(s).` : '.'),
        8000,
      );
      if (skipped) {
        const preview = res.skipped
          .slice(0, 4)
          .map((s) => `${s.name}: ${s.reason}`)
          .join('\n');
        const more = skipped > 4 ? `\n… e mais ${skipped - 4}.` : '';
        flash.warning(`${preview}${more}`, 14000);
        const lines = res.skipped
          .slice(0, 20)
          .map((s) => `• ${s.name} (${s.id}): ${s.reason}`)
          .join('\n');
        const moreModal =
          skipped > 20 ? `\n… e mais ${skipped - 20} rede(s).` : '';
        await appAlert({
          title: 'Algumas redes não foram removidas',
          message: `${lines}${moreModal}`,
        });
      }
    } catch (err) {
      const msg = err.message;
      setError('');
      flash.error(msg);
    } finally {
      setPurgeBusy(false);
    }
  };

  const handleDeleteNetwork = async (row) => {
    if (!(await confirmCrudDelete(row.name))) return;
    setError('');
    try {
      await deleteNetwork(row.id);
      await load();
      flash.success(`Rede "${row.name}" removida.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const unitBack = {
    toList: goToList,
    toNetwork: goToNetworkFromUnit,
  };

  if (isCreatingNetwork) {
    return (
      <>
        <NetworkCreateScreen onBack={goToList} onCreated={onNetworkCreated} />
        {error ? <p className="error-text">{error}</p> : null}
      </>
    );
  }

  if (selectedId) {
    if (!selectedNetwork && loading) {
      return <AppLoadingPanel label="Carregando rede…" />;
    }

    if (!selectedNetwork) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Rede não encontrada.'} />
          <button type="button" className="btn-ghost" onClick={goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    if (isCreatingUnit) {
      return (
        <>
          <UnitCreateScreen
            network={selectedNetwork}
            onBack={unitBack}
            onCreated={onUnitCreated}
          />
          {error ? <p className="error-text">{error}</p> : null}
        </>
      );
    }

    if (unitId) {
      return (
        <>
          <UnitEditScreen
            key={unitId}
            network={selectedNetwork}
            unitId={unitId}
            onBack={unitBack}
            onUpdated={load}
          />
          {error ? <p className="error-text">{error}</p> : null}
        </>
      );
    }

    return (
      <>
        <NetworkEditScreen
          key={selectedNetwork.id}
          network={selectedNetwork}
          readOnly={isViewingNetwork}
          onBack={goToList}
          onEdit={() => goToEditNetwork(selectedNetwork.id)}
          onUpdated={load}
          onDeleted={goToList}
          onAddUnit={goToCreateUnit}
          onEditUnit={goToEditUnit}
        />
        {error ? <p className="error-text">{error}</p> : null}
      </>
    );
  }

  return (
    <div className="page-stack">
      <CrudAlerts error={error} />
      {dangerToolsVisible ? (
        <section className="panel acaf-purge-panel">
          <div className="panel-body acaf-purge-panel-body">
            <div>
              <h2 className="acaf-purge-title">Limpeza — importação movly.</h2>
              <p className="muted">
                Remove <strong>todas as redes importadas pela planilha</strong> (IDs{' '}
                <code>net_acaf_*</code>, p.ex. agrupadores <code>net_acaf_grp_*</code>), incluindo unidades. Não remove
                rede se ainda houver usuários do app
                com academia principal na base ou equipe parceira vinculada — nesses casos a rede permanece e
                aparece no relatório após a ação.
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost btn-sm acaf-purge-btn"
              disabled={purgeBusy || loading}
              onClick={() => void handlePurgeAcafNetworks()}
            >
              {purgeBusy ? 'Removendo…' : 'Remover todos os parceiros movly.'}
            </button>
          </div>
        </section>
      ) : null}
      <div className="networks-list-layout-header">
        {listLayout !== 'list' ? (
          <div className="networks-page-filters-card" role="region" aria-label="Filtros da página">
            <p className="crud-list-toolbar-title">Filtros</p>
            <label className="crud-toolbar-field">
              <span className="crud-toolbar-label">Acesso portal parceiro</span>
              <select
                className="crud-toolbar-select"
                value={partnerAccessFilter}
                onChange={(e) => setPartnerAccessFilter(e.target.value)}
                aria-label="Filtrar por onboarding do portal parceiro"
              >
                {PARTNER_ACCESS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        <div className="networks-view-toggle" role="group" aria-label="Visualização da lista de redes">
          <button
            type="button"
            className={`btn-ghost btn-sm${listLayout === 'both' ? ' is-active' : ''}`}
            aria-pressed={listLayout === 'both'}
            onClick={() => setListLayout('both')}
          >
            Lista + mapa
          </button>
          <button
            type="button"
            className={`btn-ghost btn-sm${listLayout === 'list' ? ' is-active' : ''}`}
            aria-pressed={listLayout === 'list'}
            onClick={() => setListLayout('list')}
          >
            Só lista
          </button>
          <button
            type="button"
            className={`btn-ghost btn-sm${listLayout === 'map' ? ' is-active' : ''}`}
            aria-pressed={listLayout === 'map'}
            onClick={() => setListLayout('map')}
          >
            Só mapa
          </button>
        </div>
      </div>
      {listLayout !== 'list' ? (
        <NetworksUnitsMap
          onOpenUnit={goToUnitFromMap}
          units={units}
          unitsLoading={unitsLoading}
          onReloadUnits={loadUnits}
          cityFilter={mapCityFilter}
          onCityFilterChange={setMapCityFilter}
          layerMode={mapLayerMode}
          onLayerModeChange={setMapLayerMode}
          networkIdsFilter={filteredNetworkIds}
        />
      ) : null}
      {listLayout !== 'map' ? (
        <NetworksList
          networks={networksForList}
          loading={loading}
          error={error}
          onAdd={goToCreateNetwork}
          onView={goToViewNetwork}
          onEdit={goToEditNetwork}
          onDelete={handleDeleteNetwork}
          onMerged={() => {
            void load();
            void loadUnits();
          }}
          mapCityFilter={mapCityFilter}
          mapCityLabel={mapCityLabel}
          mapCityOptions={mapCityOptions}
          onMapCityFilterChange={setMapCityFilter}
          partnerAccessFilter={partnerAccessFilter}
          onPartnerAccessFilterChange={listLayout === 'list' ? setPartnerAccessFilter : undefined}
        />
      ) : null}
      <AcafAssociatesImportPanel onImported={load} />
    </div>
  );
}
