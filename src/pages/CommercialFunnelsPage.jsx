import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createCommercialFunnel,
  deactivateCommercialFunnel,
  getCommercialFunnel,
  getCommercialFunnelOptions,
  getCommercialFunnels,
  updateCommercialFunnel,
} from '../api/commercial.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { confirmCrudDelete, inactiveBadgeClass, inactiveLabel } from '../crud/crudUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import '../styles/commercial-funnels.css';

const OUTCOME_OPTIONS = [
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'won', label: 'Ganho' },
  { value: 'lost', label: 'Perda' },
];

const ACTION_OPTIONS = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'transfer_funnel', label: 'Mover para outro funil' },
  { value: 'convert', label: 'Converter em cadastro' },
];

const LOSS_ACTION_OPTIONS = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'transfer_funnel', label: 'Mover para outro funil' },
];

function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function emptyStage(sortOrder = 1) {
  return {
    id: '',
    name: '',
    slug: '',
    sortOrder,
    outcome: 'pipeline',
    active: true,
    maxDaysInStage: '',
  };
}

function funnelToForm(funnel, readOnly = false) {
  return {
    readOnly,
    name: funnel?.name ?? '',
    slug: funnel?.slug ?? '',
    description: funnel?.description ?? '',
    sortOrder: funnel?.sortOrder ?? 0,
    isDefault: Boolean(funnel?.isDefault),
    active: funnel?.active ?? true,
    winAction: funnel?.winAction ?? 'none',
    winTargetFunnelId: funnel?.winTargetFunnelId ?? '',
    winTargetStageId: funnel?.winTargetStageId ?? '',
    lossAction: funnel?.lossAction ?? 'none',
    lossTargetFunnelId: funnel?.lossTargetFunnelId ?? '',
    lossTargetStageId: funnel?.lossTargetStageId ?? '',
    stages:
      funnel?.stages?.length > 0
        ? funnel.stages.map((stage, index) => ({
            id: stage.id,
            name: stage.name,
            slug: stage.slug,
            sortOrder: stage.sortOrder ?? index + 1,
            outcome: stage.outcome,
            active: stage.active ?? true,
            maxDaysInStage: stage.maxDaysInStage ?? '',
          }))
        : [emptyStage(1), { ...emptyStage(2), outcome: 'won', name: 'Ganho' }, { ...emptyStage(3), outcome: 'lost', name: 'Perdido' }],
    submitLabel: funnel ? 'Salvar funil' : 'Cadastrar funil',
  };
}

function FunnelFormScreen({
  title,
  subtitle,
  breadcrumbs,
  initial,
  currentFunnelId,
  funnelOptions,
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

  const targetFunnelOptions = funnelOptions.filter((item) => item.id !== currentFunnelId);
  const winTargetFunnel = funnelOptions.find((item) => item.id === form.winTargetFunnelId);
  const lossTargetFunnel = funnelOptions.find((item) => item.id === form.lossTargetFunnelId);

  const updateStage = (index, patch) => {
    setForm((current) => ({
      ...current,
      stages: current.stages.map((stage, stageIndex) =>
        stageIndex === index ? { ...stage, ...patch } : stage,
      ),
    }));
  };

  const addStage = () => {
    setForm((current) => ({
      ...current,
      stages: [...current.stages, emptyStage(current.stages.length + 1)],
    }));
  };

  const removeStage = (index) => {
    setForm((current) => ({
      ...current,
      stages: current.stages.filter((_, stageIndex) => stageIndex !== index),
    }));
  };

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

      <form className="page-stack" onSubmit={submit}>
      <section className="panel">
        <div className="panel-header">
          <h2>Dados do funil</h2>
        </div>
        <div className="panel-body">
          <div className="form-grid">
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
                onChange={(ev) => setForm((current) => ({ ...current, slug: slugify(ev.target.value) }))}
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
                onChange={(ev) => setForm((current) => ({ ...current, description: ev.target.value }))}
                disabled={form.readOnly}
              />
            </label>
            <label>
              <span>Ordem</span>
              <input
                className="input"
                type="number"
                value={form.sortOrder}
                onChange={(ev) =>
                  setForm((current) => ({ ...current, sortOrder: Number(ev.target.value) || 0 }))
                }
                disabled={form.readOnly}
              />
            </label>
            {!form.readOnly ? (
              <>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(ev) => setForm((current) => ({ ...current, isDefault: ev.target.checked }))}
                  />
                  Funil padrão para novos leads
                </label>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(ev) => setForm((current) => ({ ...current, active: ev.target.checked }))}
                  />
                  Funil ativo
                </label>
              </>
            ) : (
              <div className="field-span-2 commercial-funnel-readonly-badges">
                <span className={inactiveBadgeClass(form.active)}>{inactiveLabel(form.active)}</span>
                {form.isDefault ? <span className="badge badge-success">Padrão</span> : null}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Regras de ganho e perda</h2>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <label>
              <span>Ação ao ganhar</span>
              <select
                className="input"
                value={form.winAction}
                onChange={(ev) =>
                  setForm((current) => ({
                    ...current,
                    winAction: ev.target.value,
                    winTargetFunnelId: '',
                    winTargetStageId: '',
                  }))
                }
                disabled={form.readOnly}
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {form.winAction === 'transfer_funnel' ? (
              <>
                <label>
                  <span>Funil destino (ganho)</span>
                  <select
                    className="input"
                    value={form.winTargetFunnelId}
                    onChange={(ev) =>
                      setForm((current) => ({
                        ...current,
                        winTargetFunnelId: ev.target.value,
                        winTargetStageId: '',
                      }))
                    }
                    disabled={form.readOnly}
                  >
                    <option value="">Selecione</option>
                    {targetFunnelOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Etapa destino (ganho)</span>
                  <select
                    className="input"
                    value={form.winTargetStageId}
                    onChange={(ev) =>
                      setForm((current) => ({ ...current, winTargetStageId: ev.target.value }))
                    }
                    disabled={form.readOnly || !form.winTargetFunnelId}
                  >
                    <option value="">Selecione</option>
                    {(winTargetFunnel?.stages ?? []).map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            <label>
              <span>Ação ao perder</span>
              <select
                className="input"
                value={form.lossAction}
                onChange={(ev) =>
                  setForm((current) => ({
                    ...current,
                    lossAction: ev.target.value,
                    lossTargetFunnelId: '',
                    lossTargetStageId: '',
                  }))
                }
                disabled={form.readOnly}
              >
                {LOSS_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {form.lossAction === 'transfer_funnel' ? (
              <>
                <label>
                  <span>Funil destino (perda)</span>
                  <select
                    className="input"
                    value={form.lossTargetFunnelId}
                    onChange={(ev) =>
                      setForm((current) => ({
                        ...current,
                        lossTargetFunnelId: ev.target.value,
                        lossTargetStageId: '',
                      }))
                    }
                    disabled={form.readOnly}
                  >
                    <option value="">Selecione</option>
                    {targetFunnelOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Etapa destino (perda)</span>
                  <select
                    className="input"
                    value={form.lossTargetStageId}
                    onChange={(ev) =>
                      setForm((current) => ({ ...current, lossTargetStageId: ev.target.value }))
                    }
                    disabled={form.readOnly || !form.lossTargetFunnelId}
                  >
                    <option value="">Selecione</option>
                    {(lossTargetFunnel?.stages ?? []).map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Etapas do funil</h2>
          {!form.readOnly ? (
            <button type="button" className="btn-ghost btn-sm" onClick={addStage}>
              Adicionar etapa
            </button>
          ) : null}
        </div>
        <div className="panel-body commercial-funnel-stages">
          {form.stages.map((stage, index) => (
            <article key={stage.id || `stage-${index}`} className="commercial-funnel-stage-row">
              <label>
                <span>Nome</span>
                <input
                  className="input"
                  value={stage.name}
                  onChange={(ev) => updateStage(index, { name: ev.target.value })}
                  required
                  disabled={form.readOnly}
                />
              </label>
              <label>
                <span>Tipo</span>
                <select
                  className="input"
                  value={stage.outcome}
                  onChange={(ev) => updateStage(index, { outcome: ev.target.value })}
                  disabled={form.readOnly}
                >
                  {OUTCOME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Ordem</span>
                <input
                  className="input"
                  type="number"
                  value={stage.sortOrder}
                  onChange={(ev) =>
                    updateStage(index, { sortOrder: Number(ev.target.value) || index + 1 })
                  }
                  disabled={form.readOnly}
                />
              </label>
              <label>
                <span>Prazo da etapa (dias)</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="Sem limite"
                  value={stage.maxDaysInStage}
                  onChange={(ev) => updateStage(index, { maxDaysInStage: ev.target.value })}
                  disabled={form.readOnly || stage.outcome !== 'pipeline'}
                />
              </label>
              {!form.readOnly && form.stages.length > 3 ? (
                <button type="button" className="btn-ghost btn-sm" onClick={() => removeStage(index)}>
                  Remover
                </button>
              ) : null}
            </article>
          ))}
          <p className="field-hint">
            Cada funil precisa de etapas de pipeline, exatamente uma de ganho e uma de perda. O prazo
            em dias define quando o lead expira na etapa.
          </p>
        </div>
      </section>

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
  );
}

export function CommercialFunnelsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('comercial.funis.manage');
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id');
  const mode = searchParams.get('mode');
  const isCreating = searchParams.get('new') === '1';
  const isViewing = Boolean(selectedId) && mode === 'view';

  const [funnels, setFunnels] = useState([]);
  const [funnelOptions, setFunnelOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const list = useCrudList(funnels, {
    searchKeys: ['name', 'slug', 'description'],
    defaultPageSize: 20,
    storageKey: LIST_PREFERENCE_KEYS.commercialFunnels,
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, options] = await Promise.all([
        getCommercialFunnels(true),
        getCommercialFunnelOptions(),
      ]);
      setFunnels(Array.isArray(rows) ? rows : []);
      setFunnelOptions(Array.isArray(options) ? options : []);
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
    if (!selectedId) {
      setSelected(null);
      return;
    }
    setLoading(true);
    getCommercialFunnel(selectedId)
      .then((row) => setSelected(row))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const goToList = () => setSearchParams({});
  const goToCreate = () => setSearchParams({ new: '1' });
  const goToView = (id) => setSearchParams({ id, mode: 'view' });
  const goToEdit = (id) => setSearchParams({ id });

  const buildPayload = (form) => ({
    name: form.name.trim(),
    slug: slugify(form.slug || form.name),
    description: form.description.trim() || null,
    sortOrder: Number(form.sortOrder) || 0,
    isDefault: Boolean(form.isDefault),
    active: Boolean(form.active),
    winAction: form.winAction,
    winTargetFunnelId: form.winAction === 'transfer_funnel' ? form.winTargetFunnelId || null : null,
    winTargetStageId: form.winAction === 'transfer_funnel' ? form.winTargetStageId || null : null,
    lossAction: form.lossAction,
    lossTargetFunnelId: form.lossAction === 'transfer_funnel' ? form.lossTargetFunnelId || null : null,
    lossTargetStageId: form.lossAction === 'transfer_funnel' ? form.lossTargetStageId || null : null,
    stages: form.stages.map((stage, index) => ({
      id: stage.id || undefined,
      name: stage.name.trim(),
      slug: slugify(stage.slug || stage.name),
      sortOrder: Number(stage.sortOrder) || index + 1,
      outcome: stage.outcome,
      active: stage.active ?? true,
      maxDaysInStage:
        stage.outcome === 'pipeline' && stage.maxDaysInStage !== '' && stage.maxDaysInStage != null
          ? Number(stage.maxDaysInStage) || null
          : null,
    })),
  });

  if (isCreating) {
    return (
      <PermissionGate permission="comercial.funis.manage">
        <FunnelFormScreen
          title="Novo funil"
          subtitle="Configure etapas e regras de ganho/perda."
          breadcrumbs={[{ label: 'Funis', onClick: goToList }, { label: 'Novo' }]}
          initial={funnelToForm(null)}
          currentFunnelId={null}
          funnelOptions={funnelOptions}
          onCancel={goToList}
          onSubmit={async (form) => {
            await createCommercialFunnel(buildPayload(form));
            setMessage('Funil cadastrado.');
            await load();
            goToList();
          }}
        />
      </PermissionGate>
    );
  }

  if (selectedId) {
    if (!selected && loading) return <AppLoadingPanel label="Carregando funil…" />;
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Funil não encontrado.'} />
        </div>
      );
    }

    return (
      <PermissionGate permission="comercial.funis">
        <FunnelFormScreen
          title={isViewing ? selected.name : 'Editar funil'}
          subtitle={selected.description || 'Configure etapas e automações do funil.'}
          breadcrumbs={[{ label: 'Funis', onClick: goToList }, { label: selected.name }]}
          initial={{
            ...funnelToForm(selected, isViewing || !canManage),
            funnelId: selected.id,
            onEdit: canManage ? () => goToEdit(selected.id) : undefined,
          }}
          currentFunnelId={selected.id}
          funnelOptions={funnelOptions}
          onCancel={goToList}
          onDelete={
            canManage
              ? async () => {
                  if (!(await confirmCrudDelete(selected.name))) return;
                  await deactivateCommercialFunnel(selected.id);
                  setMessage('Funil removido.');
                  await load();
                  goToList();
                }
              : undefined
          }
          onSubmit={async (form) => {
            await updateCommercialFunnel(selected.id, buildPayload(form));
            setMessage('Funil atualizado.');
            await load();
            goToView(selected.id);
          }}
        />
      </PermissionGate>
    );
  }

  return (
    <PermissionGate permission="comercial.funis">
      <CrudListShell
        title="Funis comerciais"
        subtitle="Cadastre funis de vendas, pós-venda e automações entre etapas."
        addLabel={canManage ? 'Novo funil' : null}
        onAdd={canManage ? goToCreate : undefined}
        loading={loading}
        error={error}
        message={message}
        query={list.query}
        onQueryChange={list.onQueryChange}
        searchPlaceholder="Buscar funil"
        page={list.page}
        pageSize={list.pageSize}
        totalItems={list.totalItems}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onPageSizeChange={list.onPageSizeChange}
        panelTitle="Funis cadastrados"
        emptyMessage="Nenhum funil cadastrado."
        rows={list.rows}
        columns={[
          { key: 'name', label: 'Funil', render: (row) => row.name },
          { key: 'slug', label: 'Slug', render: (row) => row.slug },
          {
            key: 'stageCount',
            label: 'Etapas',
            render: (row) => row.stageCount ?? '—',
          },
          {
            key: 'leadCount',
            label: 'Leads',
            render: (row) => row.leadCount ?? '—',
          },
          {
            key: 'active',
            label: 'Status',
            render: (row) => (
              <span className={inactiveBadgeClass(row.active)}>{inactiveLabel(row.active)}</span>
            ),
          },
          {
            key: 'isDefault',
            label: 'Padrão',
            render: (row) => (row.isDefault ? 'Sim' : '—'),
          },
        ]}
        onView={(row) => goToView(row.id)}
        onRowClick={(row) => goToView(row.id)}
        canManage={canManage}
        onEdit={(row) => goToEdit(row.id)}
      />
    </PermissionGate>
  );
}
