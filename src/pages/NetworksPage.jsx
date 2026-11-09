import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deleteNetwork, getNetworks, purgeAcafImportedNetworks } from '../api/admin.js';
import { confirmCrudDelete } from '../crud/crudUtils.js';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { appConfirm, appAlert } from '../components/confirm/appConfirm.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { NetworkCreateScreen } from './NetworkCreateScreen.jsx';
import { NetworkEditScreen } from './NetworkEditScreen.jsx';
import { NetworksList } from './NetworksList.jsx';
import { AcafAssociatesImportPanel } from '../components/AcafAssociatesImportPanel.jsx';
import { UnitCreateScreen } from './UnitCreateScreen.jsx';
import { UnitEditScreen } from './UnitEditScreen.jsx';
import { useFlashMessage } from '../components/flash/FlashMessageProvider.jsx';

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

  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purgeBusy, setPurgeBusy] = useState(false);

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
      <NetworksList
        networks={networks}
        loading={loading}
        error={error}
        onAdd={goToCreateNetwork}
        onView={goToViewNetwork}
        onEdit={goToEditNetwork}
        onDelete={handleDeleteNetwork}
        onMerged={load}
      />
      <AcafAssociatesImportPanel onImported={load} />
    </div>
  );
}
