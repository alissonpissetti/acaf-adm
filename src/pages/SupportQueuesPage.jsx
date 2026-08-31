import { useEffect, useMemo, useState } from 'react';
import {
  createSupportQueue,
  fetchSupportQueueCategories,
  fetchSupportQueues,
  updateSupportQueue,
} from '../api/supportQueues.js';
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

const EMPTY = {
  name: '',
  slug: '',
  description: '',
  color: '#64748b',
  sortOrder: 0,
  active: true,
  isDefault: false,
  routeCategories: [],
};

function categoryLabels(values, options) {
  if (!values?.length) return '—';
  const map = new Map((options ?? []).map((item) => [item.value, item.label]));
  return values.map((value) => map.get(value) ?? value).join(', ');
}

function QueueForm({
  title,
  subtitle,
  breadcrumbs,
  initial,
  categoryOptions,
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

  const toggleCategory = (value) => {
    setForm((prev) => {
      const current = new Set(prev.routeCategories ?? []);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, routeCategories: [...current] };
    });
  };

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
          <h2>Configuração da fila</h2>
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
              <span>Slug</span>
              <input
                className="input"
                value={form.slug}
                onChange={(ev) => setForm({ ...form, slug: ev.target.value })}
                placeholder="Gerado automaticamente se vazio"
                disabled={form.readOnly}
              />
              <p className="field-hint">Identificador usado na URL e nos chamados.</p>
            </label>

            <label className="field-span-2">
              <span>Descrição</span>
              <textarea
                className="input"
                rows={2}
                value={form.description}
                onChange={(ev) => setForm({ ...form, description: ev.target.value })}
                disabled={form.readOnly}
              />
            </label>

            <label>
              <span>Cor do badge</span>
              <div className="marketing-color-input">
                <input
                  type="color"
                  value={form.color || '#64748b'}
                  onChange={(ev) => setForm({ ...form, color: ev.target.value })}
                  disabled={form.readOnly}
                />
                <input
                  className="input"
                  value={form.color || ''}
                  onChange={(ev) => setForm({ ...form, color: ev.target.value })}
                  disabled={form.readOnly}
                />
              </div>
            </label>

            <label>
              <span>Ordem</span>
              <input
                className="input"
                type="number"
                value={form.sortOrder}
                onChange={(ev) => setForm({ ...form, sortOrder: Number(ev.target.value) || 0 })}
                disabled={form.readOnly}
              />
            </label>

            <div className="field-span-2 form-section">
              <h3 className="form-section-title">Roteamento automático</h3>
              <p className="field-hint">
                Categorias direcionadas automaticamente para esta fila ao abrir chamado.
              </p>
              <div className="support-queue-category-grid">
                {(categoryOptions ?? []).map((item) => (
                  <label key={item.value} className="permission-checkbox">
                    <input
                      type="checkbox"
                      checked={(form.routeCategories ?? []).includes(item.value)}
                      onChange={() => toggleCategory(item.value)}
                      disabled={form.readOnly}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {!form.readOnly ? (
              <>
                <label className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(ev) => setForm({ ...form, isDefault: ev.target.checked })}
                  />
                  <span>Fila padrão (quando nenhuma categoria corresponder)</span>
                </label>
                <label className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(ev) => setForm({ ...form, active: ev.target.checked })}
                  />
                  <span>Fila ativa</span>
                </label>
              </>
            ) : (
              <div className="field-span-2 support-queue-form-badges">
                <span className={inactiveBadgeClass(form.active)}>{inactiveLabel(form.active)}</span>
                {form.isDefault ? <span className="badge badge-muted">Fila padrão</span> : null}
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
                  submitLabel={form.submitLabel ?? 'Salvar fila'}
                />
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function queueToForm(row) {
  return {
    name: row?.name ?? '',
    slug: row?.slug ?? '',
    description: row?.description ?? '',
    color: row?.color ?? '#64748b',
    sortOrder: row?.sortOrder ?? 0,
    active: row?.active ?? true,
    isDefault: row?.isDefault ?? false,
    routeCategories: row?.routeCategories ?? [],
  };
}

export function SupportQueuesPage() {
  const { hasPermission } = useAuth();
  const router = useCrudRouter();
  const canManage = hasPermission('atendimento.filas.manage');

  const [rows, setRows] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const filterDefinitions = useMemo(() => [activeStatusFilter()], []);

  const list = useCrudList(rows, {
    searchKeys: ['name', 'slug', 'description'],
    filterDefinitions,
    defaultSort: { key: 'sortOrder', direction: 'asc' },
    storageKey: LIST_PREFERENCE_KEYS.supportQueues,
  });

  const selected = useMemo(
    () => rows.find((row) => row.id === router.id) ?? null,
    [rows, router.id],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [queueRows, categories] = await Promise.all([
        fetchSupportQueues({ all: true }),
        fetchSupportQueueCategories(),
      ]);
      setRows(Array.isArray(queueRows) ? queueRows : []);
      setCategoryOptions(Array.isArray(categories) ? categories : []);
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
      await updateSupportQueue(row.id, { active: false, isDefault: false });
      setMessage('Fila inativada.');
      await load();
      router.goToList();
    } catch (err) {
      setError(err.message);
    }
  };

  if (router.isCreating) {
    return (
      <PermissionGate permission="atendimento.filas.manage" fallback={<AppLoadingPanel />}>
        <QueueForm
          title="Nova fila de chamados"
          subtitle="Configure nome, roteamento por categoria e aparência na fila."
          breadcrumbs={[{ label: 'Filas de chamados', onClick: router.goToList }, { label: 'Nova' }]}
          initial={{ ...EMPTY, submitLabel: 'Criar fila' }}
          categoryOptions={categoryOptions}
          onCancel={router.goToList}
          onSubmit={async (form) => {
            await createSupportQueue(form);
            setMessage('Fila criada.');
            await load();
            router.goToList();
          }}
        />
      </PermissionGate>
    );
  }

  if ((router.isEditing || router.isViewing) && selected) {
    return (
      <PermissionGate permission="atendimento.filas" fallback={<AppLoadingPanel />}>
        <QueueForm
          title={selected.name}
          subtitle={`Slug: ${selected.slug}`}
          breadcrumbs={[
            { label: 'Filas de chamados', onClick: router.goToList },
            { label: selected.name },
          ]}
          initial={{
            ...queueToForm(selected),
            readOnly: router.isViewing,
            onEdit: canManage ? () => router.goToEdit(selected.id) : undefined,
          }}
          categoryOptions={categoryOptions}
          onCancel={router.goToList}
          onDelete={canManage && router.isEditing ? () => handleDelete(selected) : undefined}
          onSubmit={async (form) => {
            await updateSupportQueue(selected.id, form);
            setMessage('Fila atualizada.');
            await load();
            router.goToView(selected.id);
          }}
        />
      </PermissionGate>
    );
  }

  return (
    <PermissionGate permission="atendimento.filas">
      <CrudListShell
        title="Filas de chamados"
        subtitle="Organize filas de atendimento, roteamento por categoria e apresentação na central de chamados."
        addLabel="Nova fila"
        onAdd={canManage ? router.goToCreate : undefined}
        canAdd={canManage}
        loading={loading}
        error={error}
        message={message}
        query={list.query}
        onQueryChange={list.onQueryChange}
        searchPlaceholder="Buscar por nome, slug ou descrição"
        sortKey={list.sortKey}
        sortDirection={list.sortDirection}
        onSortChange={list.setSort}
        sortOptions={[
          { key: 'sortOrder', direction: 'asc', label: 'Ordem' },
          { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
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
        columns={[
          { key: 'name', label: 'Fila' },
          { key: 'slug', label: 'Slug' },
          {
            key: 'routeCategories',
            label: 'Categorias',
            render: (row) => categoryLabels(row.routeCategories, categoryOptions),
          },
          { key: 'sortOrder', label: 'Ordem' },
          {
            key: 'active',
            label: 'Situação',
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
        renderCell={(row, key) => {
          if (key === 'name') {
            return (
              <span className="support-queue-name-cell">
                <span
                  className="support-queue-color-dot"
                  style={{ backgroundColor: row.color || '#64748b' }}
                  aria-hidden="true"
                />
                {row.name}
                {row.isDefault ? <span className="badge badge-muted">Padrão</span> : null}
              </span>
            );
          }
          return row[key] ?? '—';
        }}
      />
    </PermissionGate>
  );
}
