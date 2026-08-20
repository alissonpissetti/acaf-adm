import { useEffect, useMemo, useState } from 'react';
import {
  createDepartment,
  fetchDepartments,
  updateDepartment,
} from '../api/access-control.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { confirmCrudDelete, inactiveBadgeClass, inactiveLabel } from '../crud/crudUtils.js';
import { activeStatusFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';

const EMPTY = { name: '', description: '', createCostCenter: true, active: true };

function DepartmentForm({ title, subtitle, breadcrumbs, initial, onSubmit, onCancel, onDelete }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm(initial);
    setError('');
    setMessage('');
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
      <CrudAlerts error={error} message={message} />
      <section className="panel">
        <div className="panel-header">
          <h2>Dados do departamento</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span>Nome</span>
              <input
                className="input"
                value={form.name}
                onChange={(ev) => setForm({ ...form, name: ev.target.value })}
                required
                disabled={form.readOnly}
              />
            </label>
            <label className="field-span-2">
              <span>Descrição</span>
              <input
                className="input"
                value={form.description}
                onChange={(ev) => setForm({ ...form, description: ev.target.value })}
                disabled={form.readOnly}
              />
            </label>
            {form.showCreateCostCenter ? (
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={form.createCostCenter}
                  onChange={(ev) => setForm({ ...form, createCostCenter: ev.target.checked })}
                />
                Criar centro de custo vinculado
              </label>
            ) : null}
            {!form.readOnly ? (
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(ev) => setForm({ ...form, active: ev.target.checked })}
                />
                Departamento ativo
              </label>
            ) : (
              <div>
                <span className={inactiveBadgeClass(form.active)}>{inactiveLabel(form.active)}</span>
              </div>
            )}
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

export function DepartmentsPage() {
  const { hasPermission } = useAuth();
  const router = useCrudRouter();
  const canManage = hasPermission('sistema.departamentos.manage');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const filterDefinitions = useMemo(() => [activeStatusFilter()], []);

  const list = useCrudList(rows, {
    searchKeys: ['name', 'description'],
    filterDefinitions,
    defaultSort: { key: 'name', direction: 'asc' },
    storageKey: LIST_PREFERENCE_KEYS.departments,
  });

  const selected = useMemo(
    () => rows.find((row) => row.id === router.id) ?? null,
    [rows, router.id],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await fetchDepartments());
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
    if (!canManage) return;
    if (!(await confirmCrudDelete(row.name))) return;
    try {
      await updateDepartment(row.id, { active: false });
      setMessage('Departamento inativado.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (router.isCreating) {
    return (
      <PermissionGate permission="sistema.departamentos.manage" fallback={<AppLoadingPanel />}>
        <DepartmentForm
          title="Adicionar departamento"
          subtitle="Cadastre um departamento da estrutura organizacional."
          breadcrumbs={[{ label: 'Departamentos', onClick: router.goToList }, { label: 'Novo' }]}
          initial={{ ...EMPTY, showCreateCostCenter: true, submitLabel: 'Salvar departamento' }}
          onCancel={router.goToList}
          onSubmit={async (form) => {
            await createDepartment(form);
            setMessage('Departamento criado.');
            router.goToList();
            await load();
          }}
        />
      </PermissionGate>
    );
  }

  if (router.isViewing || router.isEditing) {
    if (!selected && loading) return <AppLoadingPanel label="Carregando departamento…" />;
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Departamento não encontrado.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    return (
      <DepartmentForm
        title={router.isViewing ? selected.name : 'Editar departamento'}
        subtitle={selected.description || 'Departamento organizacional'}
        breadcrumbs={[
          { label: 'Departamentos', onClick: router.goToList },
          { label: selected.name },
        ]}
        initial={{
          name: selected.name,
          description: selected.description ?? '',
          active: selected.active,
          readOnly: router.isViewing,
          onEdit: canManage ? () => router.goToEdit(selected.id) : undefined,
          submitLabel: 'Salvar alterações',
        }}
        onCancel={router.goToList}
        onDelete={
          canManage && selected.active
            ? async () => {
                if (!(await confirmCrudDelete(selected.name))) return;
                await updateDepartment(selected.id, { active: false });
                router.goToList();
                await load();
              }
            : undefined
        }
        onSubmit={async (form) => {
          if (router.isViewing) return;
          await updateDepartment(selected.id, {
            name: form.name,
            description: form.description,
            active: form.active,
          });
          setMessage('Departamento atualizado.');
          router.goToView(selected.id);
          await load();
        }}
      />
    );
  }

  return (
    <CrudListShell
      title="Departamentos"
      subtitle="Estrutura organizacional global da ACAF"
      addLabel="Adicionar departamento"
      onAdd={canManage ? router.goToCreate : undefined}
      canAdd={canManage}
      loading={loading}
      error={error}
      message={message}
      query={list.query}
      onQueryChange={list.onQueryChange}
      searchPlaceholder="Buscar por nome ou descrição"
      sortKey={list.sortKey}
      sortDirection={list.sortDirection}
      onSortChange={list.setSort}
      sortOptions={[
        { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
        { key: 'name', direction: 'desc', label: 'Nome (Z–A)' },
        { key: 'sortOrder', direction: 'asc', label: 'Ordem' },
      ]}
      filterDefinitions={filterDefinitions}
      fieldFilters={list.fieldFilters}
      onApplyFieldFilter={list.applyFieldFilter}
      onRemoveFieldFilter={list.removeFieldFilter}
      onClearFieldFilters={list.clearFieldFilters}
      page={list.page}
      pageSize={list.pageSize}
      totalItems={list.totalItems}
      totalPages={list.totalPages}
      onPageChange={list.setPage}
      onPageSizeChange={list.onPageSizeChange}
      panelTitle="Departamentos cadastrados"
      emptyMessage="Nenhum departamento encontrado."
      columns={[
        { key: 'name', label: 'Nome', render: (row) => <strong>{row.name}</strong> },
        { key: 'description', label: 'Descrição' },
        {
          key: 'active',
          label: 'Status',
          render: (row) => (
            <span className={inactiveBadgeClass(row.active)}>{inactiveLabel(row.active)}</span>
          ),
        },
      ]}
      rows={list.rows}
      onView={(row) => router.goToView(row.id)}
      onEdit={canManage ? (row) => router.goToEdit(row.id) : undefined}
      onDelete={canManage ? handleDelete : undefined}
      canManage={canManage}
    />
  );
}
