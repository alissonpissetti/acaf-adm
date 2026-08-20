import { useEffect, useMemo, useState } from 'react';
import { getConnectDomain, updateConnectDomain } from '../api/admin.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';

const SYSTEM_VARIABLES = [
  {
    id: 'acafConnectFeePercent',
    key: 'acafConnectFeePercent',
    name: 'Taxa sobre planos',
    description: 'Percentual retido pela ACAF sobre assinaturas de planos (portal parceiro e app).',
    suffix: '%',
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    id: 'acafDailyFeePercent',
    key: 'acafDailyFeePercent',
    name: 'Taxa diárias',
    description: 'Percentual retido pela ACAF sobre diárias avulsas nas unidades parceiras.',
    suffix: '%',
    min: 0,
    max: 100,
    step: 0.1,
  },
];

function formatValue(row) {
  const numeric = Number(row.value);
  if (Number.isNaN(numeric)) return '—';
  return `${numeric}${row.suffix ?? ''}`;
}

function SettingForm({ title, subtitle, breadcrumbs, initial, onSubmit, onCancel, onEdit }) {
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
          <h2>Variável de sistema</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span>Nome</span>
              <input className="input" value={form.name} disabled readOnly />
            </label>
            <label>
              <span>Chave</span>
              <input className="input" value={form.key} disabled readOnly />
            </label>
            <label className="field-span-2">
              <span>Descrição</span>
              <textarea className="input" rows={2} value={form.description} disabled readOnly />
            </label>
            <label>
              <span>Valor{form.suffix ? ` (${form.suffix})` : ''}</span>
              <input
                className="input"
                type="number"
                min={form.min}
                max={form.max}
                step={form.step}
                value={form.value}
                onChange={(ev) => setForm({ ...form, value: ev.target.value })}
                disabled={form.readOnly}
                required
              />
            </label>
            <div className="field-span-full form-actions">
              {form.readOnly ? (
                <CrudViewActions onBack={onCancel} onEdit={onEdit} />
              ) : (
                <CrudFormActions busy={busy} onCancel={onCancel} submitLabel="Salvar" />
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export function PlatformSettingsPage() {
  const { hasPermission } = useAuth();
  const router = useCrudRouter();
  const canManage = hasPermission('plataforma.configuracoes.manage');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const list = useCrudList(rows, {
    searchKeys: ['name', 'key', 'description', 'valueLabel'],
    defaultSort: { key: 'name', direction: 'asc' },
    storageKey: LIST_PREFERENCE_KEYS.platformSettings,
  });

  const selected = useMemo(
    () => rows.find((row) => row.id === router.id) ?? null,
    [rows, router.id],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const domain = await getConnectDomain();
      setRows(
        SYSTEM_VARIABLES.map((variable) => {
          const value = domain[variable.key] ?? 20;
          return {
            ...variable,
            value,
            valueLabel: formatValue({ ...variable, value }),
          };
        }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (router.isViewing || router.isEditing) {
    if (!selected && loading) return <AppLoadingPanel label="Carregando variável…" />;
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Variável não encontrada.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    return (
      <PermissionGate permission="plataforma.configuracoes">
        <SettingForm
          title={router.isViewing ? selected.name : 'Editar variável'}
          subtitle={selected.key}
          breadcrumbs={[
            { label: 'Configurações', onClick: router.goToList },
            { label: selected.name },
          ]}
          initial={{
            name: selected.name,
            key: selected.key,
            description: selected.description,
            value: String(selected.value),
            suffix: selected.suffix,
            min: selected.min,
            max: selected.max,
            step: selected.step,
            readOnly: router.isViewing,
          }}
          onCancel={router.goToList}
          onEdit={canManage ? () => router.goToEdit(selected.id) : undefined}
          onSubmit={async (form) => {
            await updateConnectDomain({
              [selected.key]: Number(form.value),
            });
            setMessage('Variável atualizada.');
            router.goToView(selected.id);
            await load();
          }}
        />
      </PermissionGate>
    );
  }

  return (
    <PermissionGate permission="plataforma.configuracoes">
      <CrudListShell
        title="Configurações"
        subtitle="Variáveis globais da plataforma ACAF — taxas e parâmetros operacionais."
        canAdd={false}
        loading={loading}
        error={error}
        message={message}
        query={list.query}
        onQueryChange={list.onQueryChange}
        searchPlaceholder="Buscar por nome, chave ou descrição"
        sortKey={list.sortKey}
        sortDirection={list.sortDirection}
        onSortChange={list.setSort}
        sortOptions={[
          { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
          { key: 'key', direction: 'asc', label: 'Chave (A–Z)' },
        ]}
        page={list.page}
        pageSize={list.pageSize}
        totalItems={list.totalItems}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onPageSizeChange={list.onPageSizeChange}
        panelTitle="Variáveis de sistema"
        emptyMessage="Nenhuma variável configurada."
        columns={[
          { key: 'name', label: 'Variável', render: (row) => <strong>{row.name}</strong> },
          { key: 'key', label: 'Chave', render: (row) => <code>{row.key}</code> },
          { key: 'valueLabel', label: 'Valor' },
          { key: 'description', label: 'Descrição' },
        ]}
        rows={list.rows}
        onView={(row) => router.goToView(row.id)}
        onEdit={canManage ? (row) => router.goToEdit(row.id) : undefined}
        canManage={canManage}
      />
    </PermissionGate>
  );
}
