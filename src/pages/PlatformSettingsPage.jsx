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
import { parseOptionalPercent } from '../utils/parsePercentInput.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';

const SYSTEM_VARIABLES = [
  {
    id: 'connectFeePercent',
    key: 'connectFeePercent',
    kind: 'percent',
    name: 'Taxa sobre planos',
    description: 'Percentual retido pela plataforma sobre assinaturas de planos (portal parceiro e app).',
    suffix: '%',
    min: 0,
    max: 100,
    step: 0.01,
  },
  {
    id: 'dailyFeePercent',
    key: 'dailyFeePercent',
    kind: 'percent',
    name: 'Taxa diárias',
    description: 'Percentual retido pela plataforma sobre diárias avulsas nas unidades parceiras.',
    suffix: '%',
    min: 0,
    max: 100,
    step: 0.01,
  },
  {
    id: 'evolutionApiBaseUrl',
    key: 'evolutionApiBaseUrl',
    kind: 'text',
    name: 'Evolution API — URL base',
    description:
      'Endereço global da Evolution API usado por todas as instâncias WhatsApp (sem barra no final).',
    placeholder: 'https://evo.seudominio.com',
  },
  {
    id: 'evolutionApiKey',
    key: 'evolutionApiKey',
    kind: 'secret',
    name: 'Evolution API — chave',
    description: 'Chave global (apikey) da Evolution. Novas instâncias usam este valor automaticamente.',
    placeholder: 'Informe a chave da Evolution',
  },
  {
    id: 'apiPublicBaseUrl',
    key: 'apiPublicBaseUrl',
    kind: 'text',
    name: 'API pública — webhook WhatsApp',
    description:
      'URL base da API acessível pela internet (sem barra no final). Ao criar instância, registramos na Evolution o webhook: {base}/api/public/evolution/webhook com os eventos de mensagem.',
    placeholder: 'https://api.seudominio.com.br',
  },
];

function formatValue(row) {
  if (row.kind === 'secret') {
    return row.value ? '••••••••' : '—';
  }
  if (row.kind === 'text') {
    return row.value ? String(row.value) : '—';
  }
  const numeric = Number(row.value);
  if (Number.isNaN(numeric)) return '—';
  return `${numeric}${row.suffix ?? ''}`;
}

function SettingForm({ title, subtitle, breadcrumbs, initial, message, onSubmit, onCancel, onEdit }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(initial);
    setError('');
  }, [initial]);

  const submit = async (ev) => {
    ev.preventDefault();
    if (form.readOnly) {
      setError('Você não tem permissão para alterar esta variável.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (form.kind === 'percent') {
        const parsed = parseOptionalPercent(form.value);
        if (parsed === undefined) {
          setError('Informe um número válido (use vírgula ou ponto nas casas decimais, ex.: 22,01 ou 22.01).');
          return;
        }
        if (parsed === null) {
          setError('Informe um percentual.');
          return;
        }
        if (parsed < form.min || parsed > form.max) {
          setError(`O valor deve estar entre ${form.min} e ${form.max}.`);
          return;
        }
        await onSubmit({ ...form, value: parsed });
        return;
      }

      let text = String(form.value ?? '').trim();
      if ((form.key === 'evolutionApiBaseUrl' || form.key === 'apiPublicBaseUrl') && text) {
        text = text.replace(/\/+$/, '');
        try {
          const parsed = new URL(text);
          if (!/^https?:$/i.test(parsed.protocol)) {
            throw new Error('protocol');
          }
        } catch {
          setError('URL inválida. Use um endereço completo, ex.: http://seu-servidor.sslip.io');
          return;
        }
      }
      if (form.kind === 'text' && !text) {
        setError('Informe um valor.');
        return;
      }
      if (form.kind === 'secret' && !text) {
        if (form.isEditing && form.hasValue) {
          await onSubmit({ ...form, value: null, skip: true });
          return;
        }
        setError('Informe a chave da Evolution.');
        return;
      }
      await onSubmit({ ...form, value: text || null });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader breadcrumbs={breadcrumbs} title={title} subtitle={subtitle} />
      <CrudAlerts error={error} message={message} />
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
            <label className="field-span-2">
              <span>Valor{form.suffix ? ` (${form.suffix})` : ''}</span>
              {form.readOnly ? (
                <p className="platform-setting-value-readonly">
                  {form.kind === 'secret'
                    ? form.hasValue
                      ? 'Chave configurada (oculta por segurança).'
                      : 'Não configurada.'
                    : form.value
                      ? String(form.value)
                      : '—'}
                </p>
              ) : (
                <>
                  <input
                    className={form.kind === 'secret' ? 'input input-mono' : 'input'}
                    type="text"
                    inputMode={form.kind === 'percent' ? 'decimal' : undefined}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={
                      form.placeholder ??
                      (form.kind === 'percent' ? 'Ex.: 22,01 ou 22.01' : undefined)
                    }
                    value={form.value}
                    onChange={(ev) => setForm({ ...form, value: ev.target.value })}
                    required={form.kind !== 'secret'}
                    aria-invalid={Boolean(error)}
                  />
                  {form.kind === 'secret' && form.hasValue ? (
                    <small className="muted">Deixe em branco para manter a chave atual.</small>
                  ) : null}
                  {form.key === 'evolutionApiBaseUrl' ? (
                    <small className="muted">
                      Pode usar http ou https. A barra no final é removida automaticamente ao salvar.
                    </small>
                  ) : null}
                </>
              )}
              {form.readOnly ? (
                <small className="muted">
                  Sem permissão para alterar variáveis. Peça acesso «Gerenciar Configurações» ao
                  administrador.
                </small>
              ) : null}
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
  const canView = hasPermission('plataforma.configuracoes');
  const canManage =
    hasPermission('plataforma.configuracoes.manage') || canView;

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
          const defaultValue = variable.kind === 'percent' ? 20 : '';
          const value = domain[variable.key] ?? defaultValue;
          return {
            ...variable,
            value,
            hasValue:
              variable.key === 'evolutionApiKey'
                ? Boolean(domain.evolutionApiKeySet)
                : Boolean(String(domain[variable.key] ?? '').trim()),
            valueLabel:
              variable.key === 'apiPublicBaseUrl' && domain.evolutionWebhookUrl
                ? `${formatValue({ ...variable, value })}\nWebhook: ${domain.evolutionWebhookUrl}`
                : formatValue({ ...variable, value }),
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

  useEffect(() => {
    if (canManage && router.isViewing && router.id) {
      router.goToEdit(router.id);
    }
  }, [canManage, router.isViewing, router.id]);

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
          message={message}
          breadcrumbs={[
            { label: 'Configurações', onClick: router.goToList },
            { label: selected.name },
          ]}
          initial={{
            name: selected.name,
            key: selected.key,
            description: selected.description,
            value:
              selected.kind === 'secret' && canManage ? '' : String(selected.value ?? ''),
            suffix: selected.suffix,
            min: selected.min,
            max: selected.max,
            step: selected.step,
            kind: selected.kind ?? 'percent',
            placeholder: selected.placeholder,
            hasValue: selected.hasValue,
            isEditing: canManage,
            readOnly: !canManage,
          }}
          onCancel={router.goToList}
          onEdit={canManage ? () => router.goToEdit(selected.id) : undefined}
          onSubmit={async (form) => {
            if (form.skip) {
              setMessage('Nenhuma alteração na chave.');
              router.goToView(selected.id);
              return;
            }
            const payloadValue =
              selected.kind === 'secret'
                ? String(form.value ?? '').trim()
                : form.value;
            const updated = await updateConnectDomain({
              [selected.key]: payloadValue,
            });
            const savedValue = updated?.[selected.key];
            setMessage('Variável atualizada.');
            await load();
            router.goToEdit(selected.id);
            setRows((prev) =>
              prev.map((row) => {
                if (row.id !== selected.id) return row;
                if (selected.kind === 'secret') {
                  return {
                    ...row,
                    hasValue: Boolean(updated?.evolutionApiKeySet ?? payloadValue),
                    value: '',
                    valueLabel: '••••••••',
                  };
                }
                if (selected.kind === 'text' && savedValue != null) {
                  return {
                    ...row,
                    value: savedValue,
                    hasValue: Boolean(String(savedValue).trim()),
                    valueLabel: formatValue({ ...row, value: savedValue }),
                  };
                }
                return row;
              }),
            );
          }}
        />
      </PermissionGate>
    );
  }

  return (
    <PermissionGate permission="plataforma.configuracoes">
      <CrudListShell
        title="Configurações"
        subtitle="Variáveis globais salvas no banco do sistema (taxas, Evolution API / WhatsApp e demais parâmetros)."
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
        onView={(row) => (canManage ? router.goToEdit(row.id) : router.goToView(row.id))}
        onEdit={canManage ? (row) => router.goToEdit(row.id) : undefined}
        canManage={canManage}
      />
    </PermissionGate>
  );
}
