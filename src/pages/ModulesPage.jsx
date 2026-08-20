import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createModule,
  createModuleItem,
  fetchModules,
  updateModule,
  updateModuleItem,
  updatePermission,
} from '../api/access-control.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { IconPicker } from '../components/IconPicker.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { confirmCrudDelete, inactiveBadgeClass, inactiveLabel } from '../crud/crudUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { ModuleIcon } from '../utils/icons.jsx';

const EMPTY_MODULE = {
  slug: '',
  name: '',
  description: '',
  icon: 'LayoutGrid',
  sortOrder: 0,
  active: true,
};

const EMPTY_ITEM = {
  slug: '',
  label: '',
  route: '',
  sortOrder: 0,
  active: true,
  permissionKey: '',
};

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function PermissionEditor({ permission, onSave, busy, readOnly }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('sistema.modulos.manage') && !readOnly;
  const [label, setLabel] = useState(permission?.label ?? '');
  const [key, setKey] = useState(permission?.key ?? '');

  useEffect(() => {
    setLabel(permission?.label ?? '');
    setKey(permission?.key ?? '');
  }, [permission]);

  if (!permission) return null;

  return (
    <div className="permission-editor">
      <strong>{permission.key.endsWith('.manage') ? 'Gerenciar' : 'Visualizar'}</strong>
      <label>
        Chave
        <input className="input" value={key} onChange={(ev) => setKey(ev.target.value)} disabled={!canManage} />
      </label>
      <label>
        Rótulo
        <input className="input" value={label} onChange={(ev) => setLabel(ev.target.value)} disabled={!canManage} />
      </label>
      {canManage ? (
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={busy}
          onClick={() => onSave(permission.id, { key, label })}
        >
          Salvar permissão
        </button>
      ) : null}
    </div>
  );
}

function ModuleFormScreen({
  title,
  subtitle,
  breadcrumbs,
  initial,
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
    if (form.readOnly) return;
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
          <h2>Dados do módulo</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span>Nome</span>
              <input
                className="input"
                value={form.name}
                onChange={(ev) => {
                  const name = ev.target.value;
                  setForm((current) => ({
                    ...current,
                    name,
                    slug: current.slug ? current.slug : slugify(name),
                  }));
                }}
                required
                disabled={form.readOnly}
              />
            </label>
            <label>
              <span>Slug</span>
              <input
                className="input"
                value={form.slug}
                onChange={(ev) => setForm({ ...form, slug: slugify(ev.target.value) })}
                required
                disabled={form.readOnly}
              />
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
              <span>Ordem</span>
              <input
                className="input"
                type="number"
                value={form.sortOrder}
                onChange={(ev) => setForm({ ...form, sortOrder: Number(ev.target.value) || 0 })}
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
                Módulo ativo
              </label>
            ) : (
              <div>
                <span className={inactiveBadgeClass(form.active)}>{inactiveLabel(form.active)}</span>
              </div>
            )}
            <div className="field-span-full icon-picker-field">
              <span className="field-label">Ícone do módulo</span>
              {form.readOnly ? (
                <div className="icon-picker-readonly">
                  <span className="icon-picker-selected-preview" aria-hidden="true">
                    <ModuleIcon name={form.icon} size={26} />
                  </span>
                  <div>
                    <strong>{form.icon}</strong>
                    <span>Visualização do ícone atual</span>
                  </div>
                </div>
              ) : (
                <IconPicker value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
              )}
            </div>
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

function ItemFormScreen({
  title,
  subtitle,
  breadcrumbs,
  moduleSlug,
  initial,
  item,
  onSubmit,
  onCancel,
  onDelete,
  onSavePermission,
  busy,
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(initial);
    setError('');
  }, [initial]);

  const submit = async (ev) => {
    ev.preventDefault();
    if (form.readOnly) return;
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader breadcrumbs={breadcrumbs} title={title} subtitle={subtitle} />
      <CrudAlerts error={error} />
      <section className="panel">
        <div className="panel-header">
          <h2>Dados do item</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span>Label</span>
              <input
                className="input"
                value={form.label}
                onChange={(ev) => {
                  const label = ev.target.value;
                  setForm((current) => ({
                    ...current,
                    label,
                    slug: current.slug ? current.slug : slugify(label),
                    route: current.route ? current.route : `/m/${moduleSlug}/${slugify(label)}`,
                    permissionKey: current.permissionKey
                      ? current.permissionKey
                      : `${moduleSlug}.${slugify(label)}`,
                  }));
                }}
                required
                disabled={form.readOnly}
              />
            </label>
            <label>
              <span>Slug</span>
              <input
                className="input"
                value={form.slug}
                onChange={(ev) => {
                  const slug = slugify(ev.target.value);
                  setForm((current) => ({
                    ...current,
                    slug,
                    route: `/m/${moduleSlug}/${slug}`,
                    permissionKey: current.permissionKey || `${moduleSlug}.${slug}`,
                  }));
                }}
                required
                disabled={form.readOnly}
              />
            </label>
            <label className="field-span-2">
              <span>Rota</span>
              <input
                className="input"
                value={form.route}
                onChange={(ev) => setForm({ ...form, route: ev.target.value })}
                required
                disabled={form.readOnly}
              />
            </label>
            <label className="field-span-2">
              <span>Chave base da permissão</span>
              <input
                className="input"
                value={form.permissionKey}
                onChange={(ev) => setForm({ ...form, permissionKey: ev.target.value })}
                disabled={form.readOnly}
              />
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
            {!form.readOnly ? (
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(ev) => setForm({ ...form, active: ev.target.checked })}
                />
                Item ativo
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

      {item ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Permissões do item</h2>
          </div>
          <div className="panel-body">
            <div className="permission-stack">
              {item.permissions?.view ? (
                <PermissionEditor
                  permission={item.permissions.view}
                  onSave={onSavePermission}
                  busy={busy}
                  readOnly={form.readOnly}
                />
              ) : null}
              {item.permissions?.manage ? (
                <PermissionEditor
                  permission={item.permissions.manage}
                  onSave={onSavePermission}
                  busy={busy}
                  readOnly={form.readOnly}
                />
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ModuleItemsPanel({
  module,
  readOnly,
  canManage,
  onAddItem,
  onViewItem,
  onEditItem,
  onDeleteItem,
}) {
  const items = module.items ?? [];
  const list = useCrudList(items, {
    searchKeys: ['label', 'slug', 'route'],
    defaultSort: { key: 'sortOrder', direction: 'asc' },
    storageKey: module?.id ? `${LIST_PREFERENCE_KEYS.moduleItems}.${module.id}` : null,
  });

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Itens do módulo</h2>
        <span className="panel-meta">{items.length} item(ns)</span>
        {canManage && !readOnly ? (
          <button type="button" className="btn-primary btn-sm" onClick={onAddItem}>
            Adicionar item
          </button>
        ) : null}
      </div>
      <CrudListShell
        embedded
        query={list.query}
        onQueryChange={list.onQueryChange}
        searchPlaceholder="Buscar item por label, slug ou rota"
        sortKey={list.sortKey}
        sortDirection={list.sortDirection}
        onSortChange={list.setSort}
        sortOptions={[
          { key: 'sortOrder', direction: 'asc', label: 'Ordem' },
          { key: 'label', direction: 'asc', label: 'Label (A–Z)' },
        ]}
        page={list.page}
        pageSize={list.pageSize}
        totalItems={list.totalItems}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onPageSizeChange={list.onPageSizeChange}
        emptyMessage="Nenhum item cadastrado neste módulo."
        columns={[
          { key: 'label', label: 'Item', render: (row) => <strong>{row.label}</strong> },
          { key: 'route', label: 'Rota' },
          {
            key: 'active',
            label: 'Status',
            render: (row) => (
              <span className={inactiveBadgeClass(row.active)}>{inactiveLabel(row.active)}</span>
            ),
          },
        ]}
        rows={list.rows}
        onView={(row) => onViewItem(row.id)}
        onEdit={canManage && !readOnly ? (row) => onEditItem(row.id) : undefined}
        onDelete={canManage && !readOnly ? onDeleteItem : undefined}
        canManage={canManage}
      />
    </section>
  );
}

export function ModulesPage() {
  const { hasPermission } = useAuth();
  const { reloadNavigation } = useNavigation();
  const router = useCrudRouter();
  const [searchParams, setSearchParams] = useSearchParams();
  const itemParam = searchParams.get('item');
  const canManage = hasPermission('sistema.modulos.manage');

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const list = useCrudList(
    useMemo(
      () =>
        modules.map((module) => ({
          ...module,
          itemCount: module.items?.length ?? 0,
        })),
      [modules],
    ),
    {
      searchKeys: ['name', 'slug', 'description'],
      defaultSort: { key: 'sortOrder', direction: 'asc' },
      storageKey: LIST_PREFERENCE_KEYS.modules,
    },
  );

  const selectedModule = useMemo(
    () => modules.find((module) => module.id === router.id) ?? null,
    [modules, router.id],
  );

  const selectedItem = useMemo(() => {
    if (!selectedModule || !itemParam || itemParam === 'new') return null;
    return selectedModule.items?.find((item) => item.id === itemParam) ?? null;
  }, [selectedModule, itemParam]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setModules(await fetchModules());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refreshNavigation = async () => {
    try {
      await reloadNavigation();
    } catch {
      /* ignore */
    }
  };

  const goToModule = (moduleId, view = false) => {
    setSearchParams(view ? { id: moduleId, mode: 'view' } : { id: moduleId });
  };

  const goToCreateItem = () => {
    setSearchParams({ id: router.id, item: 'new' });
  };

  const goToEditItem = (itemId) => {
    setSearchParams({ id: router.id, item: itemId });
  };

  const goToViewItem = (itemId) => {
    setSearchParams({ id: router.id, item: itemId, mode: 'view' });
  };

  const goBackFromItem = () => {
    goToModule(router.id, router.isViewing);
  };

  const handleDeleteModule = async (row) => {
    if (!canManage) return;
    if (!(await confirmCrudDelete(row.name))) return;
    try {
      await updateModule(row.id, { active: false });
      setMessage('Módulo inativado.');
      await load();
      await refreshNavigation();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!canManage) return;
    if (!(await confirmCrudDelete(item.label))) return;
    setBusy(true);
    try {
      await updateModuleItem(item.id, { active: false });
      setMessage('Item inativado.');
      await load();
      await refreshNavigation();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const savePermission = async (permissionId, body) => {
    setBusy(true);
    setError('');
    try {
      await updatePermission(permissionId, body);
      setMessage('Permissão atualizada.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (router.isCreating) {
    if (!canManage) return <AppLoadingPanel label="Sem permissão." />;
    return (
      <ModuleFormScreen
        title="Adicionar módulo"
        subtitle="Gerencie módulos da sidebar, itens do menu superior, ícones e permissões"
        breadcrumbs={[{ label: 'Módulos', onClick: router.goToList }, { label: 'Novo' }]}
        initial={{ ...EMPTY_MODULE, submitLabel: 'Salvar módulo' }}
        onCancel={router.goToList}
        onSubmit={async (form) => {
          const created = await createModule(form);
          setMessage('Módulo criado.');
          await load();
          await refreshNavigation();
          router.goToView(created.id);
        }}
      />
    );
  }

  if (itemParam && router.id) {
    if (!selectedModule && loading) return <AppLoadingPanel label="Carregando módulo…" />;

    const isCreatingItem = itemParam === 'new';
    const isViewingItem = !isCreatingItem && router.isViewing;

    if (!isCreatingItem && !selectedItem && !loading) {
      return (
        <div className="page-stack">
          <CrudAlerts error="Item não encontrado." />
          <button type="button" className="btn-ghost" onClick={goBackFromItem}>
            Voltar para módulo
          </button>
        </div>
      );
    }

    return (
      <ItemFormScreen
        title={
          isCreatingItem
            ? 'Adicionar item'
            : isViewingItem
              ? selectedItem.label
              : 'Editar item'
        }
        subtitle={`Módulo ${selectedModule.name}`}
        breadcrumbs={[
          { label: 'Módulos', onClick: router.goToList },
          { label: selectedModule.name, onClick: goBackFromItem },
          { label: isCreatingItem ? 'Novo item' : selectedItem?.label ?? 'Item' },
        ]}
        moduleSlug={selectedModule.slug}
        item={isCreatingItem ? null : selectedItem}
        initial={
          isCreatingItem
            ? {
                ...EMPTY_ITEM,
                route: `/m/${selectedModule.slug}/`,
                permissionKey: `${selectedModule.slug}.`,
                submitLabel: 'Salvar item',
              }
            : {
                slug: selectedItem.slug,
                label: selectedItem.label,
                route: selectedItem.route,
                sortOrder: selectedItem.sortOrder,
                active: selectedItem.active,
                permissionKey: selectedItem.permissions?.view?.key ?? `${selectedModule.slug}.${selectedItem.slug}`,
                readOnly: isViewingItem,
                onEdit: canManage ? () => goToEditItem(selectedItem.id) : undefined,
                submitLabel: 'Salvar alterações',
              }
        }
        busy={busy}
        onCancel={goBackFromItem}
        onSavePermission={savePermission}
        onDelete={
          canManage && selectedItem?.active && !isViewingItem
            ? async () => {
                await handleDeleteItem(selectedItem);
                goBackFromItem();
              }
            : undefined
        }
        onSubmit={async (form) => {
          if (isCreatingItem) {
            await createModuleItem(selectedModule.id, form);
            setMessage('Item criado.');
          } else {
            await updateModuleItem(selectedItem.id, form);
            setMessage('Item atualizado.');
          }
          await load();
          await refreshNavigation();
          if (isCreatingItem) {
            goBackFromItem();
          } else {
            goToViewItem(selectedItem.id);
          }
        }}
      />
    );
  }

  if (router.isViewing || router.isEditing) {
    if (!selectedModule && loading) return <AppLoadingPanel label="Carregando módulo…" />;
    if (!selectedModule) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Módulo não encontrado.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    return (
      <div className="page-stack">
        <CrudAlerts error={error} message={message} />
        <ModuleFormScreen
          title={router.isViewing ? selectedModule.name : 'Editar módulo'}
          subtitle={selectedModule.description || 'Módulo de navegação'}
          breadcrumbs={[
            { label: 'Módulos', onClick: router.goToList },
            { label: selectedModule.name },
          ]}
          initial={{
            slug: selectedModule.slug,
            name: selectedModule.name,
            description: selectedModule.description ?? '',
            icon: selectedModule.icon,
            sortOrder: selectedModule.sortOrder,
            active: selectedModule.active,
            readOnly: router.isViewing,
            onEdit: canManage ? () => router.goToEdit(selectedModule.id) : undefined,
            submitLabel: 'Salvar alterações',
          }}
          onCancel={router.goToList}
          onDelete={
            canManage && selectedModule.active && !router.isViewing
              ? async () => {
                  if (!(await confirmCrudDelete(selectedModule.name))) return;
                  await updateModule(selectedModule.id, { active: false });
                  router.goToList();
                  await load();
                  await refreshNavigation();
                }
              : undefined
          }
          onSubmit={async (form) => {
            await updateModule(selectedModule.id, form);
            setMessage('Módulo atualizado.');
            await load();
            await refreshNavigation();
            router.goToView(selectedModule.id);
          }}
        />
        <ModuleItemsPanel
          module={selectedModule}
          readOnly={router.isViewing}
          canManage={canManage}
          onAddItem={goToCreateItem}
          onViewItem={goToViewItem}
          onEditItem={goToEditItem}
          onDeleteItem={handleDeleteItem}
        />
      </div>
    );
  }

  return (
    <CrudListShell
      title="Módulos"
      subtitle="Gerencie módulos da sidebar, itens do menu superior, ícones e permissões"
      addLabel="Adicionar módulo"
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
      page={list.page}
      pageSize={list.pageSize}
      totalItems={list.totalItems}
      totalPages={list.totalPages}
      onPageChange={list.setPage}
      onPageSizeChange={list.onPageSizeChange}
      panelTitle="Módulos cadastrados"
      emptyMessage="Nenhum módulo encontrado."
      columns={[
        {
          key: 'name',
          label: 'Módulo',
          render: (row) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ModuleIcon name={row.icon} size={18} />
              <strong>{row.name}</strong>
            </div>
          ),
        },
        { key: 'slug', label: 'Slug' },
        { key: 'itemCount', label: 'Itens' },
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
      onDelete={canManage ? handleDeleteModule : undefined}
      canManage={canManage}
    />
  );
}
