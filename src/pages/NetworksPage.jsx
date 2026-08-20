import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getNetworks } from '../api/admin.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { NetworkCreateScreen } from './NetworkCreateScreen.jsx';
import { NetworkEditScreen } from './NetworkEditScreen.jsx';
import { NetworksList } from './NetworksList.jsx';
import { UnitCreateScreen } from './UnitCreateScreen.jsx';
import { UnitEditScreen } from './UnitEditScreen.jsx';

export function NetworksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id');
  const mode = searchParams.get('mode');
  const unitParam = searchParams.get('unit');
  const isCreatingNetwork = searchParams.get('new') === '1';
  const isCreatingUnit = unitParam === 'new';
  const unitId = unitParam && unitParam !== 'new' ? unitParam : null;
  const isViewingNetwork = Boolean(selectedId) && mode === 'view' && !unitParam;

  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedNetwork = useMemo(
    () => networks.find((network) => network.id === selectedId) ?? null,
    [networks, selectedId],
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

  useEffect(() => {
    load();
  }, []);

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
    <NetworksList
      networks={networks}
      loading={loading}
      error={error}
      onAdd={goToCreateNetwork}
      onView={goToViewNetwork}
      onEdit={goToEditNetwork}
    />
  );
}
