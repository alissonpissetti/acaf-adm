import { useState } from 'react';
import { createNetwork, uploadNetworkLogo } from '../api/admin.js';
import { NetworkLogoField } from '../components/NetworkLogoField.jsx';
import { NetworkSocialFields } from '../components/NetworkSocialFields.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { emptyNetworkSocial } from '../utils/networkSocial.js';

export function NetworkCreateScreen({ onBack, onCreated }) {
  const [name, setName] = useState('');
  const [social, setSocial] = useState(emptyNetworkSocial);
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    try {
      const trimmed = name.trim();
      let created = await createNetwork({ name: trimmed, social });
      if (logoFile) {
        created = await uploadNetworkLogo(created.id, logoFile);
      }
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
        breadcrumbs={[{ label: 'Redes', onClick: onBack }, { label: 'Nova rede' }]}
        title="Adicionar rede"
        subtitle="Cadastre uma nova rede parceira de academias."
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
          <form className="form-grid" onSubmit={onSubmit}>
            <div className="field-span-2">
              <NetworkLogoField onChange={setLogoFile} disabled={busy} />
            </div>
            <label className="field-span-2">
              <span>Nome comercial da rede</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Carpe Diem Academia"
                autoFocus
                required
              />
            </label>
            <NetworkSocialFields value={social} onChange={setSocial} disabled={busy} />
            <div className="field-span-2 panel-actions">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Salvando…' : 'Cadastrar rede'}
              </button>
              <button type="button" className="btn-ghost" onClick={onBack}>
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
