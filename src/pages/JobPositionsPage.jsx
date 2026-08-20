import { useEffect, useMemo, useState } from 'react';
import {
  createJobPosition,
  fetchDepartments,
  fetchJobPositions,
  updateJobPosition,
} from '../api/access-control.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { confirmCrudDelete, inactiveBadgeClass, inactiveLabel } from '../crud/crudUtils.js';
import { activeStatusFilter, selectFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';

const EMPTY = { name: '', description: '', departmentId: '', parentPositionId: '', active: true };

function JobPositionForm({
  title,
  subtitle,
  breadcrumbs,
  initial,
  departments,
  positions,
  onSubmit,
  onCancel,
  onDelete,
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(initial);
    setError('');
  }, [initial]);

  const parentOptions = positions.filter(
    (row) => row.id !== form.id && (!form.departmentId || row.departmentId === form.departmentId),
  );

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
          <h2>Dados do cargo</h2>
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
            <label>
              <span>Departamento</span>
              <select
                className="input"
                value={form.departmentId}
                onChange={(ev) =>
                  setForm({ ...form, departmentId: ev.target.value, parentPositionId: '' })
                }
                required
                disabled={form.readOnly}
              >
                <option value="">Selecione…</option>
                {departments.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Superior imediato</span>
              <select
                className="input"
                value={form.parentPositionId}
                onChange={(ev) => setForm({ ...form, parentPositionId: ev.target.value })}
                disabled={form.readOnly}
              >
                <option value="">Nenhum</option>
                {parentOptions.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                    {row.departmentName ? ` (${row.departmentName})` : ''}
                  </option>
                ))}
              </select>
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
            {!form.readOnly ? (
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(ev) => setForm({ ...form, active: ev.target.checked })}
                />
                Cargo ativo
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

export function JobPositionsPage() {
  const { hasPermission } = useAuth();
  const router = useCrudRouter();
  const canManage = hasPermission('sistema.cargos.manage');

  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const filterDefinitions = useMemo(
    () => [
      selectFilter(
        'departmentId',
        'Departamento',
        'departmentId',
        departments.map((dep) => ({ value: dep.id, label: dep.name })),
      ),
      activeStatusFilter(),
    ],
    [departments],
  );

  const list = useCrudList(rows, {
    searchKeys: ['name', 'description', 'departmentName'],
    filterDefinitions,
    defaultSort: { key: 'name', direction: 'asc' },
    storageKey: LIST_PREFERENCE_KEYS.jobPositions,
  });

  const selected = useMemo(
    () => rows.find((row) => row.id === router.id) ?? null,
    [rows, router.id],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [positions, deps] = await Promise.all([fetchJobPositions(), fetchDepartments()]);
      setRows(positions);
      setDepartments(deps.filter((dep) => dep.active));
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
      await updateJobPosition(row.id, { active: false });
      setMessage('Cargo inativado.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (router.isCreating) {
    if (!canManage) return <AppLoadingPanel label="Sem permissão." />;
    return (
      <JobPositionForm
        title="Adicionar cargo"
        subtitle="Cadastre um cargo vinculado a um departamento."
        breadcrumbs={[{ label: 'Cargos', onClick: router.goToList }, { label: 'Novo' }]}
        initial={{
          ...EMPTY,
          departmentId: departments[0]?.id ?? '',
          submitLabel: 'Salvar cargo',
        }}
        departments={departments}
        positions={rows}
        onCancel={router.goToList}
        onSubmit={async (form) => {
          await createJobPosition({
            name: form.name,
            description: form.description,
            departmentId: form.departmentId,
            parentPositionId: form.parentPositionId || null,
            active: form.active,
          });
          router.goToList();
          await load();
          setMessage('Cargo criado.');
        }}
      />
    );
  }

  if (router.isViewing || router.isEditing) {
    if (!selected && loading) return <AppLoadingPanel label="Carregando cargo…" />;
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Cargo não encontrado.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    return (
      <JobPositionForm
        title={router.isViewing ? selected.name : 'Editar cargo'}
        subtitle={selected.departmentName ?? 'Cargo organizacional'}
        breadcrumbs={[{ label: 'Cargos', onClick: router.goToList }, { label: selected.name }]}
        initial={{
          id: selected.id,
          name: selected.name,
          description: selected.description ?? '',
          departmentId: selected.departmentId ?? '',
          parentPositionId: selected.parentPositionId ?? '',
          active: selected.active,
          readOnly: router.isViewing,
          onEdit: canManage ? () => router.goToEdit(selected.id) : undefined,
          submitLabel: 'Salvar alterações',
        }}
        departments={departments}
        positions={rows}
        onCancel={router.goToList}
        onDelete={
          canManage && selected.active
            ? async () => {
                if (!(await confirmCrudDelete(selected.name))) return;
                await updateJobPosition(selected.id, { active: false });
                router.goToList();
                await load();
              }
            : undefined
        }
        onSubmit={async (form) => {
          if (router.isViewing) return;
          await updateJobPosition(selected.id, {
            name: form.name,
            description: form.description,
            departmentId: form.departmentId,
            parentPositionId: form.parentPositionId || null,
            active: form.active,
          });
          setMessage('Cargo atualizado.');
          router.goToView(selected.id);
          await load();
        }}
      />
    );
  }

  return (
    <CrudListShell
      title="Cargos"
      subtitle="Cargos vinculados a departamentos, base para organograma futuro"
      addLabel="Adicionar cargo"
      onAdd={canManage ? router.goToCreate : undefined}
      canAdd={canManage}
      loading={loading}
      error={error}
      message={message}
      query={list.query}
      onQueryChange={list.onQueryChange}
      searchPlaceholder="Buscar por cargo, departamento ou descrição"
      sortKey={list.sortKey}
      sortDirection={list.sortDirection}
      onSortChange={list.setSort}
      sortOptions={[
        { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
        { key: 'name', direction: 'desc', label: 'Nome (Z–A)' },
        { key: 'departmentName', direction: 'asc', label: 'Departamento (A–Z)' },
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
      panelTitle="Cargos cadastrados"
      emptyMessage="Nenhum cargo encontrado."
      columns={[
        { key: 'name', label: 'Cargo', render: (row) => <strong>{row.name}</strong> },
        { key: 'departmentName', label: 'Departamento' },
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
