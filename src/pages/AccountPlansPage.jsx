import { useEffect, useMemo, useState } from 'react';
import {
  createAccountPlan,
  fetchAccountPlans,
  updateAccountPlan,
} from '../api/finance.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CatalogListIdentity } from '../components/crud/CatalogListIdentity.jsx';
import { catalogListRowMenuColumn } from '../components/crud/catalogListRowMenuColumn.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { CATALOG_LIST_SHELL_PROPS } from '../crud/catalogListPattern.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { confirmCrudDelete, inactiveBadgeClass, inactiveLabel } from '../crud/crudUtils.js';
import { activeStatusFilter, selectFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';
import { buildCrudRecordPageHeader } from '../crud/crudRecordPageHeader.js';

const KIND_OPTIONS = [
  { value: 'expense', label: 'Despesa' },
  { value: 'revenue', label: 'Receita' },
];

const EMPTY = {
  code: '',
  name: '',
  description: '',
  kind: 'expense',
  parentId: '',
  active: true,
};

function kindLabel(kind) {
  return KIND_OPTIONS.find((item) => item.value === kind)?.label ?? kind;
}

function buildDuplicateSeed(source, existingCodes) {
  const codes = new Set(existingCodes);
  let code = `${source.code}-COPIA`;
  let counter = 2;
  while (codes.has(code)) {
    code = `${source.code}-COPIA-${counter}`;
    counter += 1;
  }

  return {
    code,
    name: `${source.name} (cópia)`,
    description: source.description ?? '',
    kind: source.kind,
    parentId: source.parentId ?? '',
    active: true,
  };
}

function AccountPlanForm({
  title,
  subtitle,
  breadcrumbs,
  initial,
  parentOptions,
  onSubmit,
  onCancel,
  onDelete,
  onDuplicate,
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(initial);
    setError('');
  }, [initial]);

  const filteredParents = useMemo(
    () =>
      parentOptions.filter(
        (option) => option.kind === form.kind && option.id !== form.id && option.active !== false,
      ),
    [parentOptions, form.kind, form.id],
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
          <h2>Dados do plano de conta</h2>
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
              <span>Tipo</span>
              <select
                className="input"
                value={form.kind}
                onChange={(ev) =>
                  setForm({ ...form, kind: ev.target.value, parentId: '' })
                }
                required
                disabled={form.readOnly}
              >
                {KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Plano pai</span>
              <select
                className="input"
                value={form.parentId}
                onChange={(ev) => setForm({ ...form, parentId: ev.target.value })}
                disabled={form.readOnly}
              >
                <option value="">Sem plano pai</option>
                {filteredParents.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.code} — {option.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-span-2">
              <span>Descrição</span>
              <textarea
                className="input"
                rows={3}
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
                Plano de conta ativo
              </label>
            ) : (
              <div>
                <span className={inactiveBadgeClass(form.active)}>{inactiveLabel(form.active)}</span>
              </div>
            )}
            <div className="field-span-full form-actions">
              {form.readOnly ? (
                <CrudViewActions
                  onBack={onCancel}
                  onEdit={form.onEdit}
                  onDuplicate={onDuplicate}
                />
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

export function AccountPlansPage() {
  const { hasPermission } = useAuth();
  const router = useCrudRouter();
  const canManage = hasPermission('financeiro.planos-conta.manage');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [openRowMenuId, setOpenRowMenuId] = useState(null);

  const filterDefinitions = useMemo(
    () => [
      selectFilter('kind', 'Tipo', 'kind', KIND_OPTIONS),
      activeStatusFilter(),
    ],
    [],
  );

  const list = useCrudList(rows, {
    searchKeys: ['code', 'name', 'description', 'parentName'],
    filterDefinitions,
    defaultSort: { key: 'code', direction: 'asc' },
    storageKey: LIST_PREFERENCE_KEYS.accountPlans,
  });

  const selected = useMemo(
    () => rows.find((row) => row.id === router.id) ?? null,
    [rows, router.id],
  );

  const duplicateSource = useMemo(
    () => rows.find((row) => row.id === router.duplicateId) ?? null,
    [rows, router.duplicateId],
  );

  const existingCodes = useMemo(() => rows.map((row) => row.code), [rows]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await fetchAccountPlans());
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
      await updateAccountPlan(row.id, { active: false });
      setMessage('Plano de conta inativado.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (router.isCreating) {
    if (!canManage) return <AppLoadingPanel label="Sem permissão." />;
    if (router.duplicateId && !duplicateSource && loading) {
      return <AppLoadingPanel label="Carregando plano para duplicar…" />;
    }
    if (router.duplicateId && !duplicateSource) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Plano de conta não encontrado para duplicação.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    const duplicateInitial = duplicateSource
      ? buildDuplicateSeed(duplicateSource, existingCodes)
      : EMPTY;

    return (
      <AccountPlanForm
        title={duplicateSource ? 'Duplicar plano de conta' : 'Adicionar plano de conta'}
        subtitle={
          duplicateSource
            ? `Cópia de ${duplicateSource.code} — ${duplicateSource.name}`
            : 'Cadastre planos para categorizar despesas e receitas.'
        }
        breadcrumbs={[
          { label: 'Planos de Conta', onClick: router.goToList },
          { label: duplicateSource ? 'Duplicar' : 'Novo' },
        ]}
        initial={{
          ...duplicateInitial,
          submitLabel: duplicateSource ? 'Salvar plano duplicado' : 'Salvar plano de conta',
        }}
        parentOptions={rows}
        onCancel={router.goToList}
        onSubmit={async (form) => {
          await createAccountPlan({
            code: form.code,
            name: form.name,
            description: form.description || null,
            kind: form.kind,
            parentId: form.parentId || null,
            active: form.active,
          });
          router.goToList();
          await load();
          setMessage(duplicateSource ? 'Plano de conta duplicado.' : 'Plano de conta criado.');
        }}
      />
    );
  }

  if (router.isViewing || router.isEditing) {
    if (!selected && loading) return <AppLoadingPanel label="Carregando plano de conta…" />;
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Plano de conta não encontrado.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    const recordLabel = `${selected.code} — ${selected.name}`;
    const recordHeader = buildCrudRecordPageHeader({
      listLabel: 'Planos de Conta',
      goToList: router.goToList,
      entityLabel: 'plano de conta',
      recordName: recordLabel,
      mode: router.isViewing ? 'view' : 'edit',
      subtitle: `${recordLabel} · ${kindLabel(selected.kind)}`,
    });
    return (
      <AccountPlanForm
        title={recordHeader.title}
        subtitle={recordHeader.subtitle}
        breadcrumbs={recordHeader.breadcrumbs}
        initial={{
          id: selected.id,
          code: selected.code,
          name: selected.name,
          description: selected.description ?? '',
          kind: selected.kind,
          parentId: selected.parentId ?? '',
          active: selected.active,
          readOnly: router.isViewing,
          onEdit: canManage ? () => router.goToEdit(selected.id) : undefined,
          submitLabel: 'Salvar alterações',
        }}
        parentOptions={rows}
        onCancel={router.goToList}
        onDuplicate={canManage ? () => router.goToDuplicate(selected.id) : undefined}
        onDelete={
          canManage && selected.active
            ? async () => {
                if (!(await confirmCrudDelete(`${selected.code} — ${selected.name}`))) return;
                await updateAccountPlan(selected.id, { active: false });
                router.goToList();
                await load();
              }
            : undefined
        }
        onSubmit={async (form) => {
          if (router.isViewing) return;
          await updateAccountPlan(selected.id, {
            code: form.code,
            name: form.name,
            description: form.description || null,
            kind: form.kind,
            parentId: form.parentId || null,
            active: form.active,
          });
          setMessage('Plano de conta atualizado.');
          router.goToView(selected.id);
          await load();
        }}
      />
    );
  }

  return (
    <div className="page-stack crud-list-page financeiro-planos-conta-page">
      <CrudListShell
        {...CATALOG_LIST_SHELL_PROPS}
        title="Planos de Conta"
        subtitle="Categorias contábeis para contas a pagar e a receber"
        addLabel="Adicionar plano de conta"
        onAdd={canManage ? router.goToCreate : undefined}
        canAdd={canManage}
        loading={loading}
        error={error}
        message={message}
        query={list.query}
        onQueryChange={list.onQueryChange}
        searchPlaceholder="Buscar por código, nome ou descrição"
        sortKey={list.sortKey}
        sortDirection={list.sortDirection}
        onSortChange={list.setSort}
        sortOptions={[
          { key: 'code', direction: 'asc', label: 'Código (A–Z)' },
          { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
          { key: 'kind', direction: 'asc', label: 'Tipo (A–Z)' },
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
        panelTitle="Planos de conta cadastrados"
        emptyMessage="Nenhum plano de conta encontrado. Clique em Adicionar plano de conta para começar."
        columns={[
          {
            key: 'name',
            label: 'Plano de conta',
            headerHint: 'Código contábil e nome da categoria.',
            className: 'data-table-col-list-identity',
            render: (row) => (
              <CatalogListIdentity
                title={`${row.code} — ${row.name}`}
                meta={`${kindLabel(row.kind)} · ${row.parentName || 'Raiz'} · ${inactiveLabel(row.active)}`}
              />
            ),
          },
          {
            key: 'code',
            label: 'Código',
            className: 'crud-col-desktop-only data-table-cell-numeric',
            render: (row) => <strong>{row.code}</strong>,
          },
          {
            key: 'name',
            label: 'Nome',
            className: 'crud-col-desktop-only',
          },
          {
            key: 'kind',
            label: 'Tipo',
            className: 'crud-col-desktop-only',
            render: (row) => kindLabel(row.kind),
          },
          {
            key: 'parentName',
            label: 'Plano pai',
            className: 'crud-col-desktop-only',
            render: (row) => row.parentName || '—',
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
            onDelete: canManage ? handleDelete : undefined,
            canManage,
          }),
        ]}
        rows={list.rows}
        onRowClick={(row) => router.goToView(row.id)}
        onView={(row) => router.goToView(row.id)}
        onEdit={canManage ? (row) => router.goToEdit(row.id) : undefined}
        onDuplicate={canManage ? (row) => router.goToDuplicate(row.id) : undefined}
        onDelete={canManage ? handleDelete : undefined}
        canManage={canManage}
      />
    </div>
  );
}
