import { useEffect, useMemo, useState } from 'react';
import { createAssociation, fetchAssociations, updateAssociation } from '../api/admin.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CatalogListIdentity } from '../components/crud/CatalogListIdentity.jsx';
import { catalogListRowMenuColumn } from '../components/crud/catalogListRowMenuColumn.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { CATALOG_LIST_SHELL_PROPS } from '../crud/catalogListPattern.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { inactiveBadgeClass, inactiveLabel } from '../crud/crudUtils.js';
import { activeStatusFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';
import { buildCrudRecordPageHeader } from '../crud/crudRecordPageHeader.js';
import { AssociationPortalUsersField } from '../components/AssociationPortalUsersField.jsx';

const EMPTY = {
  slug: '',
  name: '',
  description: '',
  portalPublicUrl: '',
  sortOrder: 0,
  active: true,
};

function AssociationForm({
  title,
  subtitle,
  breadcrumbs,
  initial,
  onSubmit,
  onCancel,
  onEdit,
  associationId,
  portalUsersEditable = false,
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
          <h2>Dados da associação</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span>Slug (identificador)</span>
              <input
                className="input"
                value={form.slug}
                onChange={(ev) => setForm({ ...form, slug: ev.target.value })}
                required
                disabled={form.readOnly || form.slugLocked}
                pattern="[a-z][a-z0-9-]*"
                title="Letras minúsculas, números e hífens"
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
            <label className="field-span-2">
              <span>Descrição</span>
              <input
                className="input"
                value={form.description}
                onChange={(ev) => setForm({ ...form, description: ev.target.value })}
                disabled={form.readOnly}
              />
            </label>
            <label className="field-span-2">
              <span>URL pública do portal</span>
              <input
                className="input"
                type="url"
                placeholder="https://…"
                value={form.portalPublicUrl}
                onChange={(ev) => setForm({ ...form, portalPublicUrl: ev.target.value })}
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
                Associação ativa
              </label>
            ) : (
              <div>
                <span className={inactiveBadgeClass(form.active)}>{inactiveLabel(form.active)}</span>
              </div>
            )}
            {form.partnersPermissionKey ? (
              <p className="field-span-2 form-hint">
                Permissão do portal: <code>{form.partnersPermissionKey}</code>
              </p>
            ) : null}
            <div className="field-span-full form-actions">
              {form.readOnly ? (
                <CrudViewActions onBack={onCancel} onEdit={onEdit} />
              ) : (
                <CrudFormActions busy={busy} onCancel={onCancel} submitLabel={form.submitLabel ?? 'Salvar'} />
              )}
            </div>
          </form>
        </div>
      </section>
      {associationId ? (
        <AssociationPortalUsersField
          associationId={associationId}
          associationName={initial.name}
          partnersPermissionKey={initial.partnersPermissionKey}
          readOnly={!portalUsersEditable}
        />
      ) : null}
    </div>
  );
}

export default function AssociationsPage() {
  const { hasPermission } = useAuth();
  const router = useCrudRouter();
  const canManage = hasPermission('sistema.associacoes.manage');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [openRowMenuId, setOpenRowMenuId] = useState(null);

  const filterDefinitions = useMemo(() => [activeStatusFilter()], []);

  const list = useCrudList(rows, {
    searchKeys: ['name', 'slug', 'description'],
    filterDefinitions,
    defaultSort: { key: 'sortOrder', direction: 'asc' },
    storageKey: 'sistema.associacoes',
  });

  const selected = useMemo(() => rows.find((row) => row.id === router.id) ?? null, [rows, router.id]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await fetchAssociations());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (router.isCreating) {
    return (
      <PermissionGate permission="sistema.associacoes.manage" fallback={<AppLoadingPanel />}>
        <AssociationForm
          title="Nova associação"
          subtitle="Cadastre um agrupador comercial. A permissão associacao.{slug}.parceiros é criada automaticamente."
          breadcrumbs={[{ label: 'Associações', onClick: router.goToList }, { label: 'Nova' }]}
          initial={{ ...EMPTY, submitLabel: 'Criar associação' }}
          onCancel={router.goToList}
          onSubmit={async (form) => {
            await createAssociation({
              slug: form.slug.trim(),
              name: form.name.trim(),
              description: form.description?.trim() || undefined,
              portalPublicUrl: form.portalPublicUrl?.trim() || undefined,
              sortOrder: form.sortOrder,
              active: form.active,
            });
            setMessage('Associação criada.');
            router.goToList();
            await load();
          }}
        />
      </PermissionGate>
    );
  }

  if (router.isViewing || router.isEditing) {
    if (!selected && loading) return <AppLoadingPanel label="Carregando associação…" />;
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Associação não encontrada.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    const recordHeader = buildCrudRecordPageHeader({
      listLabel: 'Associações',
      goToList: router.goToList,
      entityLabel: 'associação',
      recordName: selected.name,
      mode: router.isViewing ? 'view' : 'edit',
      subtitle: `${selected.name} · slug ${selected.slug}`,
    });
    return (
      <AssociationForm
        associationId={selected.id}
        portalUsersEditable={canManage}
        title={recordHeader.title}
        subtitle={recordHeader.subtitle}
        breadcrumbs={recordHeader.breadcrumbs}
        initial={{
          slug: selected.slug,
          slugLocked: true,
          name: selected.name,
          description: selected.description ?? '',
          portalPublicUrl: selected.portalPublicUrl ?? '',
          sortOrder: selected.sortOrder ?? 0,
          active: selected.active,
          partnersPermissionKey: selected.partnersPermissionKey,
          readOnly: router.isViewing,
          onEdit: canManage ? () => router.goToEdit(selected.id) : undefined,
          submitLabel: 'Salvar alterações',
        }}
        onCancel={router.isViewing ? router.goToList : () => router.goToView(selected.id)}
        onEdit={canManage ? () => router.goToEdit(selected.id) : undefined}
        onSubmit={async (form) => {
          if (!canManage) return;
          await updateAssociation(selected.id, {
            name: form.name.trim(),
            description: form.description?.trim() || null,
            portalPublicUrl: form.portalPublicUrl?.trim() || null,
            sortOrder: form.sortOrder,
            active: form.active,
          });
          setMessage('Associação atualizada.');
          router.goToView(selected.id);
          await load();
        }}
      />
    );
  }

  return (
    <PermissionGate permission="sistema.associacoes">
      <div className="page-stack crud-list-page sistema-associacoes-page">
        <CrudListShell
          {...CATALOG_LIST_SHELL_PROPS}
          title="Associações"
          subtitle="Agrupadores comerciais e portais de parceiros."
          breadcrumbs={[{ label: 'Associações' }, { label: 'Cadastro' }]}
          loading={loading}
          error={error}
          message={message}
          query={list.query}
          onQueryChange={list.onQueryChange}
          searchPlaceholder="Buscar por nome, slug ou descrição"
          filterDefinitions={filterDefinitions}
          fieldFilters={list.fieldFilters}
          onApplyFieldFilter={list.applyFieldFilter}
          onRemoveFieldFilter={list.removeFieldFilter}
          onClearFieldFilters={list.clearFieldFilters}
          sortKey={list.sortKey}
          sortDirection={list.sortDirection}
          onSortChange={list.setSort}
          sortOptions={[
            { key: 'sortOrder', direction: 'asc', label: 'Ordem do catálogo' },
            { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
            { key: 'name', direction: 'desc', label: 'Nome (Z–A)' },
            { key: 'slug', direction: 'asc', label: 'Slug (A–Z)' },
          ]}
          page={list.page}
          pageSize={list.pageSize}
          totalItems={list.totalItems}
          totalPages={list.totalPages}
          onPageChange={list.setPage}
          onPageSizeChange={list.onPageSizeChange}
          addLabel="Nova associação"
          onAdd={canManage ? () => router.goToCreate() : undefined}
          canAdd={canManage}
          panelTitle="Associações cadastradas"
          emptyMessage="Nenhuma associação encontrada. Clique em Nova associação para começar."
          rows={list.rows}
          columns={[
            {
              key: 'name',
              label: 'Associação',
              headerHint: 'Nome público e slug do agrupador.',
              className: 'data-table-col-list-identity',
              render: (row) => (
                <CatalogListIdentity
                  title={row.name}
                  meta={`${row.slug} · ${inactiveLabel(row.active)}`}
                />
              ),
            },
            {
              key: 'slug',
              label: 'Slug',
              className: 'crud-col-desktop-only',
            },
            {
              key: 'portalPublicUrl',
              label: 'Portal',
              className: 'crud-col-desktop-only',
              render: (row) => row.portalPublicUrl || '—',
            },
            {
              key: 'active',
              label: 'Status',
              className: 'crud-col-desktop-only',
              render: (row) => (
                <span className={inactiveBadgeClass(row.active)}>{inactiveLabel(row.active)}</span>
              ),
            },
            catalogListRowMenuColumn({
              openRowMenuId,
              setOpenRowMenuId,
              onView: (row) => router.goToView(row.id),
              onEdit: canManage ? (row) => router.goToEdit(row.id) : undefined,
              canManage,
            }),
          ]}
          onRowClick={(row) => router.goToView(row.id)}
          onView={(row) => router.goToView(row.id)}
          onEdit={canManage ? (row) => router.goToEdit(row.id) : undefined}
          canManage={canManage}
        />
      </div>
    </PermissionGate>
  );
}
