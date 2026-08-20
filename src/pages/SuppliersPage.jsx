import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createSupplier, fetchSuppliers, updateSupplier } from '../api/finance.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { SupplierPixKeysEditor } from '../components/SupplierPixKeysEditor.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { confirmCrudDelete, inactiveBadgeClass, inactiveLabel } from '../crud/crudUtils.js';
import { activeStatusFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';
import {
  emptyPixKey,
  formatSupplierDocument,
  validatePixKeys,
  validateSupplierDocument,
} from '../utils/pix.js';

const EMPTY = {
  name: '',
  legalName: '',
  document: '',
  email: '',
  phone: '',
  notes: '',
  active: true,
  pixKeys: [emptyPixKey(true)],
};

function supplierToForm(supplier) {
  return {
    name: supplier?.name ?? '',
    legalName: supplier?.legalName ?? '',
    document: supplier?.documentFormatted ?? supplier?.document ?? '',
    email: supplier?.email ?? '',
    phone: supplier?.phone ?? '',
    notes: supplier?.notes ?? '',
    active: supplier?.active ?? true,
    pixKeys:
      supplier?.pixKeys?.length > 0
        ? supplier.pixKeys.map((key) => ({
            id: key.id,
            type: key.type,
            keyValue: key.keyDisplay ?? key.keyValue,
            label: key.label ?? '',
            isPrimary: key.isPrimary,
            active: key.active,
          }))
        : [emptyPixKey(true)],
  };
}

function SupplierForm({ title, subtitle, breadcrumbs, initial, onSubmit, onCancel, onDelete }) {
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

    const documentValidation = validateSupplierDocument(form.document);
    if (!documentValidation.valid) {
      setError(documentValidation.message);
      return;
    }

    const pixValidation = validatePixKeys(form.pixKeys);
    if (!pixValidation.valid) {
      setError(pixValidation.message);
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        document: documentValidation.normalized || null,
      });
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
          <h2>Dados do fornecedor</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label className="field-span-2">
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
              <span>Razão social</span>
              <input
                className="input"
                value={form.legalName}
                onChange={(ev) => setForm({ ...form, legalName: ev.target.value })}
                disabled={form.readOnly}
              />
            </label>
            <label>
              <span>CPF / CNPJ</span>
              <input
                className="input"
                value={form.document}
                onChange={(ev) => setForm({ ...form, document: ev.target.value })}
                placeholder="Opcional"
                disabled={form.readOnly}
              />
            </label>
            <label>
              <span>E-mail</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(ev) => setForm({ ...form, email: ev.target.value })}
                disabled={form.readOnly}
              />
            </label>
            <label>
              <span>Telefone</span>
              <input
                className="input"
                value={form.phone}
                onChange={(ev) => setForm({ ...form, phone: ev.target.value })}
                disabled={form.readOnly}
              />
            </label>
            <label className="field-span-2">
              <span>Observações</span>
              <textarea
                className="input"
                rows={3}
                value={form.notes}
                onChange={(ev) => setForm({ ...form, notes: ev.target.value })}
                disabled={form.readOnly}
              />
            </label>

            <SupplierPixKeysEditor
              value={form.pixKeys}
              onChange={(pixKeys) => setForm({ ...form, pixKeys })}
              readOnly={form.readOnly}
              disabled={busy}
            />

            {!form.readOnly ? (
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(ev) => setForm({ ...form, active: ev.target.checked })}
                />
                Fornecedor ativo
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

export function SuppliersPage() {
  const { hasPermission } = useAuth();
  const router = useCrudRouter();
  const [searchParams] = useSearchParams();
  const canManage = hasPermission('financeiro.fornecedores.manage');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const filterDefinitions = useMemo(() => [activeStatusFilter()], []);

  const list = useCrudList(
    useMemo(
      () =>
        rows.map((row) => ({
          ...row,
          primaryPixLabel: row.primaryPixKey?.keyDisplay ?? row.primaryPixKey?.keyValue ?? '',
        })),
      [rows],
    ),
    {
      searchKeys: ['name', 'legalName', 'documentFormatted', 'email', 'primaryPixLabel'],
      filterDefinitions,
      defaultSort: { key: 'name', direction: 'asc' },
      storageKey: LIST_PREFERENCE_KEYS.suppliers,
    },
  );

  const selected = useMemo(
    () => rows.find((row) => row.id === router.id) ?? null,
    [rows, router.id],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await fetchSuppliers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const savePayload = (form) => ({
    name: form.name,
    legalName: form.legalName || null,
    document: form.document || null,
    email: form.email || null,
    phone: form.phone || null,
    notes: form.notes || null,
    active: form.active,
    pixKeys: form.pixKeys.map((key) => ({
      id: key.id || undefined,
      type: key.type,
      keyValue: key.keyValue,
      label: key.label || null,
      isPrimary: key.isPrimary,
      active: key.active,
    })),
  });

  const handleDelete = async (row) => {
    if (!canManage) return;
    if (!(await confirmCrudDelete(row.name))) return;
    try {
      await updateSupplier(row.id, { active: false });
      setMessage('Fornecedor inativado.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (router.isCreating) {
    if (!canManage) return <AppLoadingPanel label="Sem permissão." />;
    const prefilledName = searchParams.get('name') ?? '';
    return (
      <SupplierForm
        title="Adicionar fornecedor"
        subtitle="Cadastre fornecedores com chaves PIX validadas para pagamentos."
        breadcrumbs={[{ label: 'Fornecedores', onClick: router.goToList }, { label: 'Novo' }]}
        initial={{ ...EMPTY, name: prefilledName, submitLabel: 'Salvar fornecedor' }}
        onCancel={router.goToList}
        onSubmit={async (form) => {
          await createSupplier(savePayload(form));
          setMessage('Fornecedor criado.');
          router.goToList();
          await load();
        }}
      />
    );
  }

  if (router.isViewing || router.isEditing) {
    if (!selected && loading) return <AppLoadingPanel label="Carregando fornecedor…" />;
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Fornecedor não encontrado.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    return (
      <SupplierForm
        title={router.isViewing ? selected.name : 'Editar fornecedor'}
        subtitle={selected.legalName || selected.documentFormatted || 'Fornecedor cadastrado'}
        breadcrumbs={[{ label: 'Fornecedores', onClick: router.goToList }, { label: selected.name }]}
        initial={{
          ...supplierToForm(selected),
          readOnly: router.isViewing,
          onEdit: canManage ? () => router.goToEdit(selected.id) : undefined,
          submitLabel: 'Salvar alterações',
        }}
        onCancel={router.goToList}
        onDelete={
          canManage && selected.active
            ? async () => {
                if (!(await confirmCrudDelete(selected.name))) return;
                await updateSupplier(selected.id, { active: false });
                router.goToList();
                await load();
              }
            : undefined
        }
        onSubmit={async (form) => {
          if (router.isViewing) return;
          await updateSupplier(selected.id, savePayload(form));
          setMessage('Fornecedor atualizado.');
          router.goToView(selected.id);
          await load();
        }}
      />
    );
  }

  return (
    <CrudListShell
      title="Fornecedores"
      subtitle="Cadastro de fornecedores e chaves PIX para contas a pagar"
      addLabel="Adicionar fornecedor"
      onAdd={canManage ? router.goToCreate : undefined}
      canAdd={canManage}
      loading={loading}
      error={error}
      message={message}
      query={list.query}
      onQueryChange={list.onQueryChange}
      searchPlaceholder="Buscar por nome, documento ou chave PIX"
      sortKey={list.sortKey}
      sortDirection={list.sortDirection}
      onSortChange={list.setSort}
      sortOptions={[
        { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
        { key: 'name', direction: 'desc', label: 'Nome (Z–A)' },
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
      panelTitle="Fornecedores cadastrados"
      emptyMessage="Nenhum fornecedor encontrado."
      columns={[
        { key: 'name', label: 'Fornecedor', render: (row) => <strong>{row.name}</strong> },
        {
          key: 'documentFormatted',
          label: 'Documento',
          render: (row) => formatSupplierDocument(row.document) || '—',
        },
        {
          key: 'primaryPixLabel',
          label: 'PIX principal',
          render: (row) => row.primaryPixLabel || '—',
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
