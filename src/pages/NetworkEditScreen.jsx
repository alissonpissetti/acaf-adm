import { useEffect, useState } from 'react';
import { deleteUnit, getUnits, updateNetwork, uploadNetworkLogo } from '../api/admin.js';
import { NetworkLogoField } from '../components/NetworkLogoField.jsx';
import { NetworkSocialFields } from '../components/NetworkSocialFields.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { formatUnitLocation } from '../utils/address.js';
import { formatTodayHours } from '../utils/weeklySchedule.js';
import { networkSocialFromNetwork } from '../utils/networkSocial.js';

export function NetworkEditScreen({ network, onBack, onUpdated, onAddUnit, onEditUnit }) {
  const [units, setUnits] = useState([]);
  const [networkName, setNetworkName] = useState(network.name);
  const [social, setSocial] = useState(networkSocialFromNetwork(network));
  const [logoUrl, setLogoUrl] = useState(network.logoUrl ?? null);
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadUnits = () => {
    getUnits(network.id)
      .then(setUnits)
      .catch((err) => setError(err.message));
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
    const confirmed = window.confirm(
      `Remover a unidade "${unit.unitName}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await deleteUnit(unit.id);
      setMessage(`Unidade "${unit.unitName}" removida.`);
      loadUnits();
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        breadcrumbs={[{ label: 'Redes', onClick: onBack }, { label: networkName }]}
        title="Editar rede"
        subtitle={`${units.length} unidade(s)`}
        actions={
          <button type="button" className="btn-ghost" onClick={onBack}>
            Voltar para lista
          </button>
        }
      />

      <section className="panel">
        <div className="panel-header">
          <h2>Dados da rede</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={saveNetwork}>
            <div className="field-span-2">
              <NetworkLogoField value={logoUrl} onChange={setLogoFile} disabled={busy} />
            </div>
            <label className="field-span-2">
              <span>Nome comercial</span>
              <input
                value={networkName}
                onChange={(e) => setNetworkName(e.target.value)}
                required
              />
            </label>
            <NetworkSocialFields value={social} onChange={setSocial} disabled={busy} />
            <div className="field-span-2 panel-actions">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Unidades da rede</h2>
          <button type="button" className="btn-primary btn-sm" onClick={onAddUnit}>
            Adicionar unidade
          </button>
        </div>
        <div className="panel-body panel-body-flush">
          {units.length === 0 ? (
            <div className="empty-state">
              Nenhuma unidade nesta rede. Clique em Adicionar unidade para começar.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table data-table-enterprise">
                <thead>
                  <tr>
                    <th>Unidade</th>
                    <th>Localização</th>
                    <th>Horário</th>
                    <th>Diária</th>
                    <th className="col-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => (
                    <tr
                      key={unit.id}
                      className="data-table-row-clickable"
                      onClick={() => onEditUnit(unit.id)}
                    >
                      <td>
                        <strong>{unit.unitName}</strong>
                      </td>
                      <td>{formatUnitLocation(unit)}</td>
                      <td className="muted">{formatTodayHours(unit)}</td>
                      <td>
                        <span
                          className={`badge ${unit.dailyPassActive ? 'badge-success' : 'badge-muted'}`}
                        >
                          {unit.dailyPassActive ? 'ativa' : 'inativa'}
                        </span>
                      </td>
                      <td className="table-actions col-actions">
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onEditUnit(unit.id);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm btn-danger"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            removeUnit(unit);
                          }}
                          disabled={busy}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
