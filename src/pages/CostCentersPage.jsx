import { useEffect, useMemo, useState } from 'react';
import { fetchDepartments } from '../api/access-control.js';
import { createCostCenter, fetchCostCenters, updateCostCenter } from '../api/finance.js';
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

const EMPTY = { code: '', name: '', departmentId: '', active: true };

function CostCenterForm({
  title,
  subtitle,
  breadcrumbs,
  initial,
  departments,
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
          <h2>Dados do centro de custo</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span>Código</span>
              <input
                className="input"
                value={form.code}
                onChange={(ev) => setForm({ ...form, code: ev.target.value })}
                required
                disabled={form.readOnly}
              />
            </label>
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
                onChange={(ev) => setForm({ ...form, departmentId: ev.target.value })}
                disabled={form.readOnly}
              >
                <option value="">Sem departamento</option>
                {departments.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.name}
                  </option>
                ))}
              </select>
            </label>
            {!form.readOnly ? (
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(ev) => setForm({ ...form, active: ev.target.checked })}
                />
                Centro de custo ativo
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

export function CostCentersPage() {
  const { hasPermission } = useAuth();
  const router = useCrudRouter();
  const canManage = hasPermission('financeiro.centros-custo.manage');

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
    searchKeys: ['code', 'name', 'departmentName'],
    filterDefinitions,
    defaultSort: { key: 'code', direction: 'asc' },
    storageKey: LIST_PREFERENCE_KEYS.costCenters,
  });

  const selected = useMemo(
    () => rows.find((row) => row.id === router.id) ?? null,
    [rows, router.id],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [centers, deps] = await Promise.all([fetchCostCenters(), fetchDepartments()]);
      setRows(centers);
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
    if (!(await confirmCrudDelete(`${row.code} — ${row.name}`))) return;
    try {
      await updateCostCenter(row.id, { active: false });
      setMessage('Centro de custo inativado.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (router.isCreating) {
    if (!canManage) return <AppLoadingPanel label="Sem permissão." />;
    return (
      <CostCenterForm
        title="Adicionar centro de custo"
        subtitle="Cadastre um centro de custo vinculado a um departamento."
        breadcrumbs={[{ label: 'Centros de Custo', onClick: router.goToList }, { label: 'Novo' }]}
        initial={{ ...EMPTY, submitLabel: 'Salvar centro de custo' }}
        departments={departments}
        onCancel={router.goToList}
        onSubmit={async (form) => {
          await createCostCenter({
            code: form.code,
            name: form.name,
            departmentId: form.departmentId || null,
            active: form.active,
          });
          router.goToList();
          await load();
          setMessage('Centro de custo criado.');
        }}
      />
    );
  }

  if (router.isViewing || router.isEditing) {
    if (!selected && loading) return <AppLoadingPanel label="Carregando centro de custo…" />;
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Centro de custo não encontrado.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    return (
      <CostCenterForm
        title={router.isViewing ? `${selected.code} — ${selected.name}` : 'Editar centro de custo'}
        subtitle={selected.departmentName ?? 'Centro de custo financeiro'}
        breadcrumbs={[
          { label: 'Centros de Custo', onClick: router.goToList },
          { label: selected.code },
        ]}
        initial={{
          code: selected.code,
          name: selected.name,
          departmentId: selected.departmentId ?? '',
          active: selected.active,
          readOnly: router.isViewing,
          onEdit: canManage ? () => router.goToEdit(selected.id) : undefined,
          submitLabel: 'Salvar alterações',
        }}
        departments={departments}
        onCancel={router.goToList}
        onDelete={
          canManage && selected.active
            ? async () => {
                if (!(await confirmCrudDelete(`${selected.code} — ${selected.name}`))) return;
                await updateCostCenter(selected.id, { active: false });
                router.goToList();
                await load();
              }
            : undefined
        }
        onSubmit={async (form) => {
          if (router.isViewing) return;
          await updateCostCenter(selected.id, {
            code: form.code,
            name: form.name,
            departmentId: form.departmentId || null,
            active: form.active,
          });
          setMessage('Centro de custo atualizado.');
          router.goToView(selected.id);
          await load();
        }}
      />
    );
  }

  return (
    <CrudListShell
      title="Centros de Custo"
      subtitle="Centros vinculados aos departamentos da empresa"
      addLabel="Adicionar centro de custo"
      onAdd={canManage ? router.goToCreate : undefined}
      canAdd={canManage}
      loading={loading}
      error={error}
      message={message}
      query={list.query}
      onQueryChange={list.onQueryChange}
      searchPlaceholder="Buscar por código, nome ou departamento"
      sortKey={list.sortKey}
      sortDirection={list.sortDirection}
      onSortChange={list.setSort}
      sortOptions={[
        { key: 'code', direction: 'asc', label: 'Código (A–Z)' },
        { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
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
      panelTitle="Centros de custo cadastrados"
      emptyMessage="Nenhum centro de custo encontrado."
      columns={[
        { key: 'code', label: 'Código', render: (row) => <strong>{row.code}</strong> },
        { key: 'name', label: 'Nome' },
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
