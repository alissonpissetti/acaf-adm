import { useEffect, useMemo, useState } from 'react';
import { createAssociation, fetchAssociations, updateAssociation } from '../api/admin.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { inactiveBadgeClass, inactiveLabel } from '../crud/crudUtils.js';
import { activeStatusFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';

const EMPTY = {
  slug: '',
  name: '',
  description: '',
  portalPublicUrl: '',
  sortOrder: 0,
  active: true,
};

function AssociationForm({ title, subtitle, breadcrumbs, initial, onSubmit, onCancel, onEdit }) {
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

    return (
      <AssociationForm
        title={router.isViewing ? selected.name : `Editar · ${selected.name}`}
        subtitle={`Slug: ${selected.slug}`}
        breadcrumbs={[{ label: 'Associações', onClick: router.goToList }, { label: selected.name }]}
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
      <CrudListShell
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
        panelTitle="Cadastro"
        rows={list.rows}
        columns={[
          { key: 'name', label: 'Nome', sortable: true },
          { key: 'slug', label: 'Slug', sortable: true },
          {
            key: 'portalPublicUrl',
            label: 'Portal',
            render: (r) => r.portalPublicUrl || '—',
          },
          {
            key: 'active',
            label: 'Status',
            render: (r) => <span className={inactiveBadgeClass(r.active)}>{inactiveLabel(r.active)}</span>,
          },
        ]}
        onRowClick={(row) => router.goToView(row.id)}
      />
    </PermissionGate>
  );
}
