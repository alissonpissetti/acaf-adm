import { useEffect, useMemo, useState } from 'react';
import {
  createUserGroup,
  fetchGroupPermissions,
  fetchModules,
  fetchPermissions,
  fetchUserGroups,
  saveGroupPermissions,
  updateUserGroup,
} from '../api/access-control.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { GroupPermissionsEditor } from '../components/crud/GroupPermissionsEditor.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { confirmCrudDelete, inactiveBadgeClass, inactiveLabel } from '../crud/crudUtils.js';
import { activeStatusFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';

const EMPTY = { name: '', description: '', active: true };

function UserGroupForm({
  title,
  subtitle,
  breadcrumbs,
  initial,
  permissions,
  modules,
  permissionIds,
  onPermissionChange,
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
      await onSubmit(form, permissionIds);
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
          <h2>Dados do grupo</h2>
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
              <textarea
                className="input"
                rows={2}
                value={form.description}
                onChange={(ev) => setForm({ ...form, description: ev.target.value })}
                disabled={form.readOnly}
              />
            </label>
            {form.userCount != null ? (
              <div>
                <span className="muted">Usuários vinculados</span>
                <div>
                  <span className="badge badge-muted">{form.userCount}</span>
                </div>
              </div>
            ) : null}
            {!form.readOnly ? (
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(ev) => setForm({ ...form, active: ev.target.checked })}
                />
                Grupo ativo
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

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Permissões do grupo</h2>
            <p className="panel-subtitle">
              Organize o acesso por módulo e tela. Marcar &quot;Gerenciar&quot; inclui automaticamente
              a permissão de visualização.
            </p>
          </div>
          <span className="panel-meta">{permissionIds.length} selecionada(s)</span>
        </div>
        <div className="panel-body panel-body-flush">
          <GroupPermissionsEditor
            modules={modules}
            permissions={permissions}
            selectedIds={permissionIds}
            onChange={onPermissionChange}
            readOnly={form.readOnly}
          />
        </div>
      </section>
    </div>
  );
}

export function UserGroupsPage() {
  const { hasPermission } = useAuth();
  const router = useCrudRouter();
  const canManage = hasPermission('sistema.grupos.manage');

  const [rows, setRows] = useState([]);
  const [modules, setModules] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [permissionIds, setPermissionIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const filterDefinitions = useMemo(() => [activeStatusFilter()], []);

  const list = useCrudList(rows, {
    searchKeys: ['name', 'description'],
    filterDefinitions,
    defaultSort: { key: 'name', direction: 'asc' },
    storageKey: LIST_PREFERENCE_KEYS.userGroups,
  });

  const selected = useMemo(
    () => rows.find((row) => row.id === router.id) ?? null,
    [rows, router.id],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [groupRows, permissionRows, moduleRows] = await Promise.all([
        fetchUserGroups(),
        fetchPermissions(),
        fetchModules(),
      ]);
      setRows(groupRows);
      setPermissions(permissionRows);
      setModules(moduleRows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!router.id || router.isCreating) {
      setPermissionIds([]);
      return;
    }

    setLoadingPermissions(true);
    fetchGroupPermissions(router.id)
      .then(setPermissionIds)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingPermissions(false));
  }, [router.id, router.isCreating]);

  const saveGroup = async (form, ids) => {
    if (router.isCreating) {
      const created = await createUserGroup({
        name: form.name,
        description: form.description,
        active: form.active,
      });
      await saveGroupPermissions(created.id, ids);
      setMessage('Grupo criado.');
      router.goToView(created.id);
      await load();
      return;
    }

    await updateUserGroup(router.id, {
      name: form.name,
      description: form.description,
      active: form.active,
    });
    await saveGroupPermissions(router.id, ids);
    setMessage('Grupo atualizado.');
    router.goToView(selected.id);
    await load();
  };

  const handleDelete = async (row) => {
    if (!canManage) return;
    if (!(await confirmCrudDelete(row.name))) return;
    try {
      await updateUserGroup(row.id, { active: false });
      setMessage('Grupo inativado.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (router.isCreating) {
    if (!canManage) return <AppLoadingPanel label="Sem permissão." />;
    return (
      <UserGroupForm
        title="Adicionar grupo"
        subtitle="Cada usuário admin pertence a um único grupo com permissões por módulo."
        breadcrumbs={[{ label: 'Grupos', onClick: router.goToList }, { label: 'Novo' }]}
        initial={{ ...EMPTY, submitLabel: 'Salvar grupo' }}
        modules={modules}
        permissions={permissions}
        permissionIds={permissionIds}
        onPermissionChange={setPermissionIds}
        onCancel={router.goToList}
        onSubmit={saveGroup}
      />
    );
  }

  if (router.isViewing || router.isEditing) {
    if ((!selected && loading) || loadingPermissions) {
      return <AppLoadingPanel label="Carregando grupo…" />;
    }
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Grupo não encontrado.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    return (
      <UserGroupForm
        title={router.isViewing ? selected.name : 'Editar grupo'}
        subtitle={selected.description || 'Grupo de permissões de acesso'}
        breadcrumbs={[{ label: 'Grupos', onClick: router.goToList }, { label: selected.name }]}
        initial={{
          name: selected.name,
          description: selected.description ?? '',
          active: selected.active,
          userCount: selected.userCount,
          readOnly: router.isViewing,
          onEdit: canManage ? () => router.goToEdit(selected.id) : undefined,
          submitLabel: 'Salvar alterações',
        }}
        modules={modules}
        permissions={permissions}
        permissionIds={permissionIds}
        onPermissionChange={setPermissionIds}
        onCancel={router.goToList}
        onDelete={
          canManage && selected.active
            ? async () => {
                if (!(await confirmCrudDelete(selected.name))) return;
                await updateUserGroup(selected.id, { active: false });
                router.goToList();
                await load();
              }
            : undefined
        }
        onSubmit={saveGroup}
      />
    );
  }

  return (
    <CrudListShell
      title="Grupos de Usuários"
      subtitle="Cada usuário admin pertence a um único grupo com permissões por módulo"
      addLabel="Adicionar grupo"
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
        { key: 'userCount', direction: 'desc', label: 'Mais usuários' },
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
      panelTitle="Grupos cadastrados"
      emptyMessage="Nenhum grupo encontrado."
      columns={[
        { key: 'name', label: 'Grupo', render: (row) => <strong>{row.name}</strong> },
        { key: 'description', label: 'Descrição' },
        {
          key: 'userCount',
          label: 'Usuários',
          render: (row) => <span className="badge badge-muted">{row.userCount ?? 0}</span>,
        },
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
