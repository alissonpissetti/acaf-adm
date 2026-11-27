import { useEffect, useMemo, useState } from 'react';
import {
  createModality,
  deleteModality,
  listModalities,
  updateModality,
} from '../api/admin.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { CrudRowMenu } from '../components/crud/CrudRowMenu.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { confirmCrudDelete } from '../crud/crudUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';
import {
  buildCrudCreatePageHeader,
  buildCrudRecordPageHeader,
} from '../crud/crudRecordPageHeader.js';

function ModalityForm({ title, subtitle, breadcrumbs, initial, onSubmit, onCancel, onDelete }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(initial);
    setError('');
  }, [initial]);

  const submit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader breadcrumbs={breadcrumbs} title={title} subtitle={subtitle} />
      <CrudAlerts error={error} />
      <section className="panel">
        <div className="panel-header">
          <h2>Dados da modalidade</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span>Nome</span>
              <input
                className="input"
                value={form.name}
                onChange={(ev) => setForm({ ...form, name: ev.target.value })}
                placeholder="Ex.: Natação"
                required
                disabled={form.readOnly}
              />
            </label>
            <div className="field-span-full form-actions">
              {form.readOnly ? (
                <CrudViewActions onBack={onCancel} onEdit={form.onEdit} />
              ) : (
                <CrudFormActions
                  busy={busy}
                  onCancel={onCancel}
                  onDelete={onDelete}
                  showDelete={Boolean(onDelete)}
                  submitLabel={form.submitLabel ?? 'Salvar'}
                />
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export function ModalitiesPage() {
  const router = useCrudRouter();
  const [modalities, setModalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState(null);

  const list = useCrudList(modalities, {
    searchKeys: ['name'],
    defaultSort: { key: 'sortOrder', direction: 'asc' },
    storageKey: LIST_PREFERENCE_KEYS.modalities,
  });

  const selected = useMemo(
    () => modalities.find((row) => row.id === router.id) ?? null,
    [modalities, router.id],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setModalities(await listModalities());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (row) => {
    if (!(await confirmCrudDelete(row.name))) return;
    setBusy(true);
    setError('');
    try {
      await deleteModality(row.id);
      setMessage('Modalidade removida.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (router.isCreating) {
    const createHeader = buildCrudCreatePageHeader({
      listLabel: 'Modalidades',
      goToList: router.goToList,
      entityLabel: 'modalidade',
      subtitle: 'Informe o nome exibido no app e nos cadastros das academias.',
      createBreadcrumbLabel: 'Nova',
    });
    return (
      <ModalityForm
        title={createHeader.title}
        subtitle={createHeader.subtitle}
        breadcrumbs={createHeader.breadcrumbs}
        initial={{ name: '', submitLabel: 'Salvar modalidade' }}
        onCancel={router.goToList}
        onSubmit={async (form) => {
          await createModality(form.name.trim());
          setMessage('Modalidade cadastrada.');
          router.goToList();
          await load();
        }}
      />
    );
  }

  if (router.isViewing || router.isEditing) {
    if (!selected && loading) return <AppLoadingPanel label="Carregando modalidade…" />;
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Modalidade não encontrada.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    const recordHeader = buildCrudRecordPageHeader({
      listLabel: 'Modalidades',
      goToList: router.goToList,
      entityLabel: 'modalidade',
      recordName: selected.name,
      mode: router.isViewing ? 'view' : 'edit',
    });
    return (
      <ModalityForm
        title={recordHeader.title}
        subtitle={recordHeader.subtitle}
        breadcrumbs={recordHeader.breadcrumbs}
        initial={{
          name: selected.name,
          readOnly: router.isViewing,
          onEdit: () => router.goToEdit(selected.id),
          submitLabel: 'Salvar alterações',
        }}
        onCancel={router.goToList}
        onDelete={router.isEditing ? () => handleDelete(selected) : undefined}
        onSubmit={async (form) => {
          if (router.isViewing) return;
          await updateModality(selected.id, { name: form.name.trim() });
          setMessage('Modalidade atualizada.');
          router.goToView(selected.id);
          await load();
        }}
      />
    );
  }

  return (
    <div className="page-stack crud-list-page operacao-modalidades-page">
      <CrudListShell
        title="Modalidades"
        subtitle="Catálogo global. Parceiros escolhem um subconjunto em unidades, planos, diárias e agenda."
        addLabel="Adicionar modalidade"
        onAdd={router.goToCreate}
        panelClassName="crud-list-panel"
        loading={loading || busy}
        error={error}
        message={message}
        query={list.query}
        onQueryChange={list.onQueryChange}
        searchPlaceholder="Buscar por nome da modalidade"
        toolbarLayout="compact"
        toolbarWrapClassName="crud-list-toolbar"
        sortKey={list.sortKey}
        sortDirection={list.sortDirection}
        onSortChange={list.setSort}
        sortOptions={[
          { key: 'sortOrder', direction: 'asc', label: 'Ordem do catálogo' },
          { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
          { key: 'name', direction: 'desc', label: 'Nome (Z–A)' },
        ]}
        page={list.page}
        pageSize={list.pageSize}
        totalItems={list.totalItems}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onPageSizeChange={list.onPageSizeChange}
        panelTitle="Catálogo cadastrado"
        emptyMessage="Nenhuma modalidade cadastrada. Clique em Adicionar modalidade para começar."
        tableClassName="crud-list-cards-table crud-list-cards-table--simple"
        columns={[
          {
            key: 'name',
            label: 'Modalidade',
            headerHint: 'Nome exibido no app e nos cadastros das academias.',
            className: 'data-table-col-list-identity',
            render: (row) => (
              <div className="crud-list-identity">
                <strong className="crud-list-identity__title">{row.name}</strong>
                <span className="crud-list-identity__meta--mobile crud-list-identity__meta-line">
                  Ordem no catálogo: {String(row.sortOrder ?? 0).padStart(2, '0')}
                </span>
              </div>
            ),
          },
          {
            key: 'sortOrder',
            label: 'Ordem',
            headerAbbr: '#',
            headerHint: 'Posição no catálogo global (ordenação padrão da listagem).',
            className: 'data-table-col-modality-order data-table-cell-numeric crud-col-desktop-only',
            render: (row) => String(row.sortOrder ?? 0).padStart(2, '0'),
          },
          {
            key: 'rowMenu',
            label: '',
            className: 'data-table-col-row-menu crud-col-mobile-only',
            render: (row) => (
              <CrudRowMenu
                isOpen={openRowMenuId === row.id}
                onToggle={() =>
                  setOpenRowMenuId((prev) => (prev === row.id ? null : row.id))
                }
                onClose={() => setOpenRowMenuId(null)}
                onView={() => router.goToView(row.id)}
                onEdit={() => router.goToEdit(row.id)}
                onDelete={async () => {
                  if (await confirmCrudDelete(row.name)) await handleDelete(row);
                }}
              />
            ),
          },
        ]}
        rows={list.rows}
        onRowClick={(row) => router.goToView(row.id)}
        onView={(row) => router.goToView(row.id)}
        onEdit={(row) => router.goToEdit(row.id)}
        onDelete={handleDelete}
      />
    </div>
  );
}
