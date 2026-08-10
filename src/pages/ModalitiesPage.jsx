import { useEffect, useState } from 'react';
import {
  createModality,
  deleteModality,
  listModalities,
  reorderModalities,
  updateModality,
} from '../api/admin.js';
import { PageHeader } from '../components/PageHeader.jsx';

function sortModalitiesAlphabetically(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
}

export function ModalitiesPage() {
  const [modalities, setModalities] = useState([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const load = () => {
    setLoading(true);
    listModalities()
      .then((items) => {
        setModalities(items);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const persistReorder = async (nextItems) => {
    setBusy(true);
    setError('');
    try {
      const items = await reorderModalities(nextItems.map((item) => item.id));
      setModalities(items);
    } catch (err) {
      setError(err.message);
      load();
    } finally {
      setBusy(false);
    }
  };

  const addModality = async () => {
    const name = newName.trim();
    if (!name) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const created = await createModality(name);
      setModalities((prev) => [...prev, created]);
      setNewName('');
      setMessage('Modalidade cadastrada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveModalityName = async (item, value) => {
    const name = value.trim();
    if (!name || name === item.name) return;

    setSavingId(item.id);
    setError('');
    setMessage('');
    try {
      const updated = await updateModality(item.id, { name });
      setModalities((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
      setMessage('Modalidade atualizada.');
    } catch (err) {
      setError(err.message);
      load();
    } finally {
      setSavingId(null);
    }
  };

  const removeModality = async (item) => {
    if (!window.confirm(`Remover "${item.name}" do catálogo?`)) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await deleteModality(item.id);
      setModalities((prev) => prev.filter((row) => row.id !== item.id));
      setMessage('Modalidade removida.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const moveModality = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= modalities.length) return;

    const next = [...modalities];
    [next[index], next[target]] = [next[target], next[index]];
    setModalities(next);
    await persistReorder(next);
  };

  const sortAlphabetically = async () => {
    const sorted = sortModalitiesAlphabetically(modalities);
    setModalities(sorted);
    setMessage('');
    await persistReorder(sorted);
    setMessage('Catálogo reorganizado em ordem alfabética.');
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-body">Carregando modalidades…</div>
      </div>
    );
  }

  return (
    <div className="page-stack modality-page">
      <PageHeader
        title="Modalidades"
        subtitle="Catálogo global persistido no banco. As academias escolhem um subconjunto ao configurar unidades, planos, diárias e agenda."
      />

      {message ? <div className="alert-banner alert-banner-success">{message}</div> : null}
      {error ? <div className="alert-banner alert-banner-error">{error}</div> : null}

      <div className="modality-layout">
        <aside className="panel modality-sidebar">
          <div className="panel-header">
            <h2>Nova modalidade</h2>
          </div>
          <div className="panel-body modality-sidebar-body">
            <p className="modality-sidebar-lead">
              Cada inclusão é salva imediatamente no banco. Unidades escolhem um subconjunto; planos e
              diárias podem restringir ainda mais.
            </p>

            <label className="field-block">
              <span>Nome</span>
              <input
                value={newName}
                placeholder="Ex.: Natação"
                disabled={busy}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addModality();
                  }
                }}
              />
            </label>

            <button
              type="button"
              className="btn-primary modality-add-btn"
              disabled={busy || !newName.trim()}
              onClick={addModality}
            >
              {busy ? 'Salvando…' : 'Adicionar ao catálogo'}
            </button>

            <div className="modality-sidebar-divider" />

            <div className="modality-sidebar-stats">
              <strong>{modalities.length}</strong>
              <span>{modalities.length === 1 ? 'modalidade' : 'modalidades'}</span>
            </div>

            <button
              type="button"
              className="btn-secondary modality-sort-btn"
              disabled={busy || modalities.length < 2}
              onClick={sortAlphabetically}
            >
              Ordenar A–Z
            </button>

            <p className="modality-sidebar-hint">
              A ordem dos cards define a exibição no portal parceiro. Reorganize com as setas ou ordene
              alfabeticamente — cada mudança é persistida na hora.
            </p>
          </div>
        </aside>

        <section className="panel modality-main">
          <div className="panel-header">
            <h2>Catálogo cadastrado</h2>
            <span className="panel-meta">Edite o nome e saia do campo para salvar</span>
          </div>

          {modalities.length === 0 ? (
            <div className="empty-state modality-empty">
              <strong>Nenhuma modalidade ainda</strong>
              <p>Use o painel ao lado para adicionar a primeira modalidade do catálogo.</p>
            </div>
          ) : (
            <div className="modality-cards-grid">
              {modalities.map((item, index) => (
                <article key={item.id} className="modality-card">
                  <header className="modality-card-head">
                    <span className="modality-card-index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="modality-card-toolbar">
                      <button
                        type="button"
                        className="modality-icon-btn"
                        disabled={busy || index === 0}
                        onClick={() => moveModality(index, -1)}
                        aria-label="Subir"
                        title="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="modality-icon-btn"
                        disabled={busy || index === modalities.length - 1}
                        onClick={() => moveModality(index, 1)}
                        aria-label="Descer"
                        title="Descer"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="modality-icon-btn modality-icon-btn-danger"
                        disabled={busy}
                        onClick={() => removeModality(item)}
                        aria-label="Remover"
                        title="Remover"
                      >
                        ×
                      </button>
                    </div>
                  </header>
                  <label className="modality-card-field">
                    <span className="sr-only">Nome da modalidade {index + 1}</span>
                    <input
                      key={`${item.id}-${item.name}`}
                      defaultValue={item.name}
                      disabled={busy || savingId === item.id}
                      placeholder="Nome da modalidade"
                      onBlur={(e) => saveModalityName(item, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  </label>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
