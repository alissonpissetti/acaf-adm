import { useState } from 'react';
import { createNetwork, uploadNetworkLogo } from '../api/admin.js';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions } from '../components/crud/CrudFormActions.jsx';
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
        breadcrumbs={[{ label: 'Parceiros', onClick: onBack }, { label: 'Nova rede' }]}
        title="Adicionar rede"
        subtitle="Cadastre uma nova rede parceira de academias."
      />

      <CrudAlerts error={error} />

      <section className="panel">
        <div className="panel-header">
          <h2>Dados da rede</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={onSubmit}>
            <section className="form-section field-span-full">
              <h3 className="form-section-title">Identidade</h3>
              <div className="form-grid-inner">
                <div className="field-span-full">
                  <NetworkLogoField onChange={setLogoFile} disabled={busy} />
                </div>
                <label>
                  <span>Nome comercial da rede</span>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Carpe Diem Academia"
                    autoFocus
                    required
                  />
                </label>
              </div>
            </section>

            <NetworkSocialFields value={social} onChange={setSocial} disabled={busy} />

            <div className="field-span-full form-actions">
              <CrudFormActions busy={busy} onCancel={onBack} submitLabel="Cadastrar rede" />
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
