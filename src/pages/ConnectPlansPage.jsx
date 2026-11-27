import { useEffect, useMemo, useState } from 'react';
import { CrudRowMenu } from '../components/crud/CrudRowMenu.jsx';
import { getConnectDomain, updateConnectDomain } from '../api/admin.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { CurrencyBrlInput } from '../components/CurrencyBrlInput.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { confirmCrudDelete } from '../crud/crudUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';
import {
  buildCrudCreatePageHeader,
  buildCrudRecordPageHeader,
} from '../crud/crudRecordPageHeader.js';
import { formatBRL } from '../utils/currency.js';

function slugifyPlanId(name, existingIds) {
  let base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  if (!base) base = 'novo';

  let id = `plan-${base}`;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `plan-${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

async function persistPlans(plans) {
  return updateConnectDomain({
    connectPlans: plans.map((plan, index) => ({
      id: plan.id,
      name: plan.name,
      pricePerMonth: Number(plan.pricePerMonth),
      tierIndex: index,
    })),
  });
}

function ConnectPlanForm({
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
          <h2>Dados do plano</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span>Nome do plano</span>
              <input
                className="input"
                value={form.name}
                onChange={(ev) => setForm({ ...form, name: ev.target.value })}
                required
                disabled={form.readOnly}
              />
            </label>
            <CurrencyBrlInput
              id="plan-price"
              label="Preço mensal (R$)"
              value={Number(form.pricePerMonth) || 0}
              min={0}
              max={99_999.99}
              disabled={form.readOnly}
              onChange={(value) => setForm({ ...form, pricePerMonth: value })}
            />
            {form.id ? (
              <label>
                <span>ID</span>
                <input className="input" value={form.id} disabled readOnly />
              </label>
            ) : null}
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

export function ConnectPlansPage() {
  const router = useCrudRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [openRowMenuId, setOpenRowMenuId] = useState(null);

  const list = useCrudList(
    useMemo(
      () =>
        plans.map((plan) => ({
          ...plan,
          priceLabel: formatBRL(Number(plan.pricePerMonth) || 0),
        })),
      [plans],
    ),
    {
      searchKeys: ['name', 'id'],
      defaultSort: { key: 'name', direction: 'asc' },
      storageKey: LIST_PREFERENCE_KEYS.connectPlans,
    },
  );

  const selected = useMemo(
    () => plans.find((plan) => plan.id === router.id) ?? null,
    [plans, router.id],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getConnectDomain();
      setPlans(data.connectPlans ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const savePlans = async (nextPlans) => {
    const updated = await persistPlans(nextPlans);
    setPlans(updated.connectPlans ?? []);
    return updated;
  };

  const handleDelete = async (row) => {
    if (plans.length <= 1) {
      setError('Deve existir ao menos um plano.');
      return;
    }
    if (!(await confirmCrudDelete(row.name))) return;
    setBusy(true);
    setError('');
    try {
      await savePlans(plans.filter((plan) => plan.id !== row.id));
      setMessage('Plano removido.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (router.isCreating) {
    const createHeader = buildCrudCreatePageHeader({
      listLabel: 'Planos',
      goToList: router.goToList,
      entityLabel: 'plano',
      subtitle: 'Defina nome e preço mensal da assinatura.',
    });
    return (
      <ConnectPlanForm
        title={createHeader.title}
        subtitle={createHeader.subtitle}
        breadcrumbs={createHeader.breadcrumbs}
        initial={{
          name: '',
          pricePerMonth: 99.9,
          submitLabel: 'Salvar plano',
        }}
        onCancel={router.goToList}
        onSubmit={async (form) => {
          const ids = new Set(plans.map((plan) => plan.id));
          const next = [
            ...plans,
            {
              id: slugifyPlanId(form.name, ids),
              name: form.name.trim(),
              pricePerMonth: Number(form.pricePerMonth),
            },
          ];
          await savePlans(next);
          setMessage('Plano criado.');
          router.goToList();
        }}
      />
    );
  }

  if (router.isViewing || router.isEditing) {
    if (!selected && loading) return <AppLoadingPanel label="Carregando plano…" />;
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Plano não encontrado.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    const priceLine = `${formatBRL(Number(selected.pricePerMonth) || 0)}/mês`;
    const recordHeader = buildCrudRecordPageHeader({
      listLabel: 'Planos',
      goToList: router.goToList,
      entityLabel: 'plano',
      recordName: selected.name,
      mode: router.isViewing ? 'view' : 'edit',
      subtitle: `${selected.name} · ${priceLine}`,
    });
    return (
      <ConnectPlanForm
        title={recordHeader.title}
        subtitle={recordHeader.subtitle}
        breadcrumbs={recordHeader.breadcrumbs}
        initial={{
          id: selected.id,
          name: selected.name,
          pricePerMonth: selected.pricePerMonth,
          readOnly: router.isViewing,
          onEdit: () => router.goToEdit(selected.id),
          submitLabel: 'Salvar alterações',
        }}
        onCancel={router.goToList}
        onDelete={
          plans.length > 1 && !router.isViewing
            ? async () => {
                await handleDelete(selected);
                router.goToList();
              }
            : undefined
        }
        onSubmit={async (form) => {
          const next = plans.map((plan) =>
            plan.id === selected.id
              ? {
                  ...plan,
                  name: form.name.trim(),
                  pricePerMonth: Number(form.pricePerMonth),
                }
              : plan,
          );
          await savePlans(next);
          setMessage('Plano atualizado.');
          router.goToView(selected.id);
        }}
      />
    );
  }

  return (
    <PermissionGate permission="plataforma.connect">
      <div className="page-stack crud-list-page operacao-planos-page">
        <CrudListShell
          title="Planos"
          subtitle="Assinaturas Movly oferecidas aos parceiros e colaboradores."
          addLabel="Adicionar plano"
          onAdd={router.goToCreate}
          panelClassName="crud-list-panel"
          loading={loading || busy}
          error={error}
          message={message}
          query={list.query}
          onQueryChange={list.onQueryChange}
          searchPlaceholder="Buscar por nome do plano ou ID"
          toolbarLayout="compact"
          toolbarWrapClassName="crud-list-toolbar"
          sortKey={list.sortKey}
          sortDirection={list.sortDirection}
          onSortChange={list.setSort}
          sortOptions={[
            { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
            { key: 'name', direction: 'desc', label: 'Nome (Z–A)' },
            { key: 'pricePerMonth', direction: 'desc', label: 'Preço (maior)' },
            { key: 'pricePerMonth', direction: 'asc', label: 'Preço (menor)' },
          ]}
          page={list.page}
          pageSize={list.pageSize}
          totalItems={list.totalItems}
          totalPages={list.totalPages}
          onPageChange={list.setPage}
          onPageSizeChange={list.onPageSizeChange}
          panelTitle="Planos de assinatura"
          emptyMessage="Nenhum plano cadastrado. Clique em Adicionar plano para começar."
          tableClassName="crud-list-cards-table crud-list-cards-table--simple"
          columns={[
            {
              key: 'name',
              label: 'Plano',
              headerHint: 'Nome comercial exibido no app e nas cobranças.',
              className: 'data-table-col-list-identity data-table-col-plan-name',
              render: (row) => (
                <div className="crud-list-identity">
                  <strong className="crud-list-identity__title">{row.name}</strong>
                  <span className="crud-list-identity__meta--mobile crud-list-identity__meta-line">
                    <code className="subscription-plan-id">{row.id}</code>
                  </span>
                  <span className="crud-list-identity__meta--mobile crud-list-identity__price">
                    {row.priceLabel}/mês
                  </span>
                </div>
              ),
            },
            {
              key: 'priceLabel',
              label: 'Preço/mês',
              headerAbbr: 'Preço',
              headerHint: 'Valor mensal em reais (BRL).',
              className: 'data-table-col-plan-price data-table-cell-numeric crud-col-desktop-only',
            },
            {
              key: 'id',
              label: 'ID',
              headerHint: 'Identificador técnico — usado em integrações e cadastros.',
              className: 'data-table-col-plan-id crud-col-desktop-only',
              render: (row) => <code className="subscription-plan-id">{row.id}</code>,
            },
            {
              key: 'rowMenu',
              label: '',
              className: 'data-table-col-row-menu crud-col-mobile-only',
              render: (row) => (
                <CrudRowMenu
                  isOpen={openRowMenuId === row.id}
                  onToggle={() =>
                    setOpenRowMenuId((prev) => (prev === row.id ? null : row.id))
                  }
                  onClose={() => setOpenRowMenuId(null)}
                  onView={() => router.goToView(row.id)}
                  onEdit={() => router.goToEdit(row.id)}
                  onDelete={async () => {
                    if (await confirmCrudDelete(row.name)) await handleDelete(row);
                  }}
                />
              ),
            },
          ]}
          rows={list.rows}
          onRowClick={(row) => router.goToView(row.id)}
          onView={(row) => router.goToView(row.id)}
          onEdit={(row) => router.goToEdit(row.id)}
          onDelete={handleDelete}
        />
      </div>
    </PermissionGate>
  );
}
