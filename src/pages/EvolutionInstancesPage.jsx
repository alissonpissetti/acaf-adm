import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import {
  connectEvolutionInstance,
  createEvolutionInstance,
  deleteEvolutionInstance,
  fetchEvolutionOverview,
  refreshEvolutionConnection,
  testEvolutionConnection,
  testEvolutionPlatformConnection,
  updateEvolutionInstance,
  fetchEvolutionLeadIgnoreContacts,
  addEvolutionLeadIgnoreContact,
  removeEvolutionLeadIgnoreContact,
  fetchWhatsAppInboxThreads,
} from '../api/evolution.js';
import { fetchDepartments } from '../api/access-control.js';
import { getUsers } from '../api/users.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { confirmCrudDelete } from '../crud/crudUtils.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';
import { ModalCloseButton } from '../components/ModalCloseButton.jsx';

function normalizeEvolutionQrImage(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('data:image')) return trimmed;
  if (trimmed.startsWith('2@')) return '';
  return `data:image/png;base64,${trimmed}`;
}

/** Código numérico curto (ex. FNPG5AYK) — não o payload longo do QR. */
function formatShortPairingCode(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 4 || trimmed.length > 12) return null;
  if (trimmed.startsWith('2@')) return null;
  if (/[=+,/]/.test(trimmed)) return null;
  if (!/^[A-Za-z0-9-]+$/.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

function EvolutionCreateModal({ open, busy, error, onClose, onSubmit }) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="evolution-pairing-backdrop" role="presentation" onClick={onClose}>
      <div
        className="evolution-pairing-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evolution-create-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="panel-header">
          <h2 id="evolution-create-title">Nova instância</h2>
          <ModalCloseButton onClick={onClose} />
        </div>
        <form
          className="panel-body evolution-pairing-body evolution-pairing-body--form"
          onSubmit={(ev) => {
            ev.preventDefault();
            onSubmit(name);
          }}
        >
          {error ? <p className="form-error">{error}</p> : null}
          <label className="field-block field-span-full evolution-create-field">
            <span className="field-label">Nome amigável</span>
            <input
              className="input"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder="Ex.: Atendimento - Ana"
              autoFocus
              required
              disabled={busy}
            />
            <small className="muted">
              URL e chave de integração vêm de Sistema → Configurações. O identificador técnico é gerado
              automaticamente.
            </small>
          </label>
          <div className="evolution-create-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
              {busy ? 'Criando…' : 'Criar instância'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const MATCH_KIND_LABELS = {
  phone: 'Telefone',
  contact_key: 'Chave de contato',
  remote_jid: 'Remote Jid',
};

function LeadIgnoreContactsSection({ instanceId, readOnly, canManage }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [matchKind, setMatchKind] = useState('phone');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [threadPick, setThreadPick] = useState('');
  const [threads, setThreads] = useState([]);

  const load = async () => {
    if (!instanceId) return;
    setLoading(true);
    setError('');
    try {
      const list = await fetchEvolutionLeadIgnoreContacts(instanceId);
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [instanceId]);

  useEffect(() => {
    if (!instanceId || readOnly) return;
    void fetchWhatsAppInboxThreads(instanceId, { light: 1, limit: 80 })
      .then((page) => setThreads(page?.threads ?? []))
      .catch(() => setThreads([]));
  }, [instanceId, readOnly]);

  useEffect(() => {
    if (!threadPick) return;
    setMatchKind('contact_key');
    setValue(threadPick);
  }, [threadPick]);

  const add = async (ev) => {
    ev.preventDefault();
    if (!canManage) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await addEvolutionLeadIgnoreContact(instanceId, {
        matchKind,
        value: value.trim(),
        label: label.trim() || null,
        note: note.trim() || null,
      });
      setValue('');
      setLabel('');
      setNote('');
      setThreadPick('');
      setMessage('Contato adicionado à lista de exceção.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!canManage) return;
    if (!(await confirmCrudDelete(row.label || row.matchValue))) return;
    setBusy(true);
    setError('');
    try {
      await removeEvolutionLeadIgnoreContact(instanceId, row.id);
      setMessage('Contato removido da lista de exceção.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Exceções de lead (WhatsApp)</h2>
      </div>
      <div className="panel-body">
        <p className="muted field-span-full">
          Contatos nesta lista continuam no inbox, mas não geram lead comercial automaticamente nesta
          instância.
        </p>
        <CrudAlerts error={error} message={message} />
        {loading ? (
          <p className="muted">Carregando exceções…</p>
        ) : rows.length === 0 ? (
          <p className="muted">Nenhum contato ignorado para criação de leads.</p>
        ) : (
          <div className="table-wrap field-span-full">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Identificação</th>
                  <th>Tipo</th>
                  <th>Etiqueta</th>
                  <th>Nota</th>
                  {canManage ? <th aria-label="Ações" /> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <code>{row.matchValue}</code>
                    </td>
                    <td>{MATCH_KIND_LABELS[row.matchKind] ?? row.matchKind}</td>
                    <td>{row.label || '—'}</td>
                    <td className="muted">{row.note || '—'}</td>
                    {canManage ? (
                      <td>
                        <button
                          type="button"
                          className="btn-ghost btn-sm is-danger"
                          disabled={busy}
                          onClick={() => void remove(row)}
                        >
                          Remover
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {canManage && !readOnly && (
          <form className="form-grid field-span-full" onSubmit={add} style={{ marginTop: '1rem' }}>
            <label className="field-span-2">
              <span>Conversa existente (opcional)</span>
              <select
                className="input"
                value={threadPick}
                onChange={(ev) => setThreadPick(ev.target.value)}
                disabled={busy}
              >
                <option value="">— digitar manualmente —</option>
                {threads.map((thread) => (
                  <option key={thread.threadKey} value={thread.contactPhone}>
                    {thread.contactDisplayName || thread.contactPhone} ({thread.contactPhone})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Tipo de correspondência</span>
              <select
                className="input"
                value={matchKind}
                onChange={(ev) => setMatchKind(ev.target.value)}
                disabled={busy}
              >
                <option value="phone">Telefone (só dígitos)</option>
                <option value="contact_key">Chave (ex.: lid:… ou número)</option>
                <option value="remote_jid">Remote Jid</option>
              </select>
            </label>
            <label>
              <span>Valor</span>
              <input
                className="input"
                value={value}
                onChange={(ev) => setValue(ev.target.value)}
                placeholder="5511999999999 ou lid:…"
                required
                disabled={busy}
              />
            </label>
            <label>
              <span>Etiqueta (opcional)</span>
              <input
                className="input"
                value={label}
                onChange={(ev) => setLabel(ev.target.value)}
                placeholder="Ex.: Matriz, suporte interno"
                disabled={busy}
              />
            </label>
            <label className="field-span-2">
              <span>Nota (opcional)</span>
              <input
                className="input"
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                disabled={busy}
              />
            </label>
            <div className="field-span-full">
              <button type="submit" className="btn-primary btn-sm" disabled={busy || !value.trim()}>
                {busy ? 'Salvando…' : 'Adicionar exceção'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function InstanceForm({
  title,
  subtitle,
  breadcrumbs,
  initial,
  departments,
  users,
  instanceId,
  canManageLeadIgnores,
  onSubmit,
  onCancel,
  onDelete,
  onTest,
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm(initial);
    setError('');
    setMessage('');
  }, [initial]);

  const submit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    if (!onTest) return;
    setTestBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await onTest();
      if (result?.ok) {
        setMessage(`Conexão OK. Estado: ${result.state ?? 'conectado'}.`);
      } else {
        setError(result?.message ?? 'Não foi possível testar a conexão.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader breadcrumbs={breadcrumbs} title={title} subtitle={subtitle} />
      <CrudAlerts error={error} message={message} />
      <section className="panel">
        <div className="panel-header">
          <h2>Instância WhatsApp</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label className="field-span-2">
              <span>Nome amigável</span>
              <input
                className="input"
                value={form.name}
                onChange={(ev) => setForm({ ...form, name: ev.target.value })}
                placeholder="Ex.: Atendimento - Ana"
                required
                disabled={form.readOnly}
              />
            </label>
            {form.instanceKey ? (
              <label className="field-span-2">
                <span>Identificador no servidor</span>
                <input className="input" value={form.instanceKey} disabled readOnly />
              </label>
            ) : null}
            <label>
              <span>Modo</span>
              <select
                className="input"
                value={form.usageMode}
                disabled={form.readOnly}
                onChange={(ev) => setForm({ ...form, usageMode: ev.target.value })}
              >
                <option value="corporate">Corporativa</option>
                <option value="operational">Operacional</option>
              </select>
            </label>
            <label>
              <span>Departamento</span>
              <select
                className="input"
                value={form.departmentId}
                disabled={form.readOnly}
                onChange={(ev) => setForm({ ...form, departmentId: ev.target.value })}
              >
                <option value="">—</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-span-2">
              <span>Responsável padrão (comercial)</span>
              <select
                className="input"
                value={form.defaultOwnerUserId}
                disabled={form.readOnly}
                onChange={(ev) => setForm({ ...form, defaultOwnerUserId: ev.target.value })}
              >
                <option value="">Atribuir automaticamente</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
            {!form.readOnly ? (
              <>
                <label className="checkbox-inline field-span-2">
                  <input
                    type="checkbox"
                    checked={form.autoCreateLeads}
                    onChange={(ev) => setForm({ ...form, autoCreateLeads: ev.target.checked })}
                  />
                  Criar lead básico automaticamente em novas conversas
                </label>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(ev) => setForm({ ...form, isDefault: ev.target.checked })}
                  />
                  Instância padrão
                </label>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(ev) => setForm({ ...form, active: ev.target.checked })}
                  />
                  Instância ativa
                </label>
              </>
            ) : null}
            {!form.readOnly && onTest ? (
              <div className="field-span-full">
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => void test()}
                  disabled={busy || testBusy}
                >
                  {testBusy ? 'Testando…' : 'Testar conexão'}
                </button>
              </div>
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
      {instanceId && canManageLeadIgnores ? (
        <LeadIgnoreContactsSection
          instanceId={instanceId}
          readOnly={Boolean(form.readOnly)}
          canManage={Boolean(canManageLeadIgnores)}
        />
      ) : null}
    </div>
  );
}

function connectionBadgeLabel(row) {
  if (row.connected) return 'Conectada';
  const state = String(row.connectionState ?? '').toLowerCase();
  if (state === 'connecting') return 'Conectando…';
  return 'Desconectada';
}

function InstanceCard({ row, canManage, onConnect, onRefresh, onOpen, onEdit, onRemove, busyId }) {
  const connected = row.connected;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (ev) => {
      if (menuRef.current && !menuRef.current.contains(ev.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <article className={`panel evolution-instance-card${connected ? ' is-connected' : ''}`}>
      <header className="evolution-instance-card__head">
        <div>
          <h3>{row.name}</h3>
          <p className="muted evolution-instance-card__key">{row.instanceKey ?? row.shortId}</p>
        </div>
        <span className={`badge ${connected ? 'badge-success' : 'badge-muted'}`}>
          {connectionBadgeLabel(row)}
        </span>
      </header>
      <dl className="evolution-instance-card__meta">
        <div>
          <dt>Modo</dt>
          <dd>{row.usageModeLabel ?? '—'}</dd>
        </div>
        <div>
          <dt>Departamento</dt>
          <dd>{row.departmentName ?? '—'}</dd>
        </div>
        <div className="field-span-2">
          <dt>Número conectado</dt>
          <dd>{row.connectedPhone ?? '—'}</dd>
        </div>
      </dl>
      <footer className="evolution-instance-card__actions">
        <button
          type="button"
          className="btn-primary btn-sm evolution-instance-card__primary"
          disabled={canManage && busyId === row.id}
          onClick={() => (canManage ? onConnect(row) : onOpen(row))}
        >
          {canManage ? (connected ? 'Reconectar' : 'Conectar') : 'Abrir'}
        </button>
        <div className="evolution-instance-card__menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="btn-ghost btn-sm"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            Mais
          </button>
          {menuOpen ? (
            <div className="evolution-instance-card__menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onOpen(row); }}>
                Detalhes
              </button>
              {canManage ? (
                <>
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(row); }}>
                    Editar
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busyId === row.id}
                    onClick={() => {
                      setMenuOpen(false);
                      onRefresh(row);
                    }}
                  >
                    Atualizar status
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="is-danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onRemove(row);
                    }}
                  >
                    Excluir
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

export function EvolutionInstancesPage() {
  const { hasPermission } = useAuth();
  const router = useCrudRouter();
  const canManage = hasPermission('sistema.evolution.manage');

  const [rows, setRows] = useState([]);
  const [apiStatus, setApiStatus] = useState({ online: false, message: '', webhookUrl: '' });
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [pairing, setPairing] = useState(null);
  const [testApiBusy, setTestApiBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');

  const selected = useMemo(
    () => rows.find((row) => row.id === router.id) ?? null,
    [rows, router.id],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const overview = await fetchEvolutionOverview();
      setRows(overview.instances ?? []);
      setApiStatus({
        online: Boolean(overview.apiOnline),
        message: overview.apiMessage ?? '',
        webhookUrl: overview.webhookUrl ?? '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void Promise.all([fetchDepartments(), getUsers()])
      .then(([deptRows, userRows]) => {
        setDepartments((deptRows ?? []).filter((row) => row.active !== false));
        setUsers((userRows ?? []).filter((row) => row.active !== false));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (router.isCreating) {
      setCreateOpen(true);
      router.goToList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- limpar ?new=1 legado
  }, [router.isCreating]);

  const buildPatch = (form) => ({
    name: form.name,
    isDefault: form.isDefault,
    active: form.active,
    usageMode: form.usageMode,
    departmentId: form.departmentId || null,
    defaultOwnerUserId: form.defaultOwnerUserId || null,
    autoCreateLeads: form.autoCreateLeads,
  });

  const handleCreate = async (friendlyName) => {
    setCreateBusy(true);
    setCreateError('');
    try {
      await createEvolutionInstance({ name: friendlyName.trim() });
      setMessage('Instância criada. Use Conectar para vincular o WhatsApp.');
      setCreateOpen(false);
      await load();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateBusy(false);
    }
  };

  const testApi = async () => {
    setTestApiBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await testEvolutionPlatformConnection();
      if (result?.ok) {
        setMessage(result.message ?? 'Servidor de integração respondendo normalmente.');
        await load();
      } else {
        setError(result?.message ?? 'Falha no teste da API.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTestApiBusy(false);
    }
  };

  const handleConnect = async (row) => {
    setBusyId(row.id);
    setError('');
    try {
      const result = await connectEvolutionInstance(row.id);
      if (!result?.ok) {
        setError(result?.message ?? 'Não foi possível conectar a instância.');
        return;
      }
      const qrImage = normalizeEvolutionQrImage(result.qrcode);
      const qrPayload =
        typeof result.qrPayload === 'string' && result.qrPayload.startsWith('2@')
          ? result.qrPayload
          : typeof result.code === 'string' && result.code.startsWith('2@')
            ? result.code
            : null;
      const pairingCode =
        formatShortPairingCode(result.pairingCode) ??
        (!qrPayload ? formatShortPairingCode(result.code) : null);

      if (qrImage || qrPayload || pairingCode) {
        setPairing({
          title: row.name,
          qrcode: qrImage || null,
          qrPayload,
          pairingCode,
        });
      } else {
        setMessage('Solicitação de conexão enviada.');
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const removeInstance = async (item) => {
    const result = await deleteEvolutionInstance(item.id);
    setMessage(result?.warning ?? 'Instância removida.');
    await load();
  };

  const handleRefresh = async (row) => {
    setBusyId(row.id);
    setError('');
    try {
      await refreshEvolutionConnection(row.id);
      setMessage(`Status de «${row.name}» atualizado.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const breadcrumbsRoot = [{ label: 'WhatsApp' }];

  if (router.isViewing || router.isEditing) {
    if (!selected && loading) return <AppLoadingPanel label="Carregando instância…" />;
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Instância não encontrada.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar
          </button>
        </div>
      );
    }

    return (
      <InstanceForm
        title={router.isViewing ? selected.name : 'Editar instância'}
        subtitle={selected.instanceKey}
        breadcrumbs={[...breadcrumbsRoot, { label: selected.name, onClick: router.goToList }]}
        departments={departments}
        users={users}
        instanceId={selected.id}
        canManageLeadIgnores={canManage}
        initial={{
          name: selected.name,
          instanceKey: selected.instanceKey,
          isDefault: selected.isDefault,
          active: selected.active,
          usageMode: selected.usageMode ?? 'corporate',
          departmentId: selected.departmentId ?? '',
          defaultOwnerUserId: selected.defaultOwnerUserId ?? '',
          autoCreateLeads: selected.autoCreateLeads !== false,
          isEditing: true,
          readOnly: router.isViewing,
          onEdit: canManage ? () => router.goToEdit(selected.id) : undefined,
          submitLabel: 'Salvar alterações',
        }}
        onCancel={router.goToList}
        onTest={canManage ? () => testEvolutionConnection(selected.id) : undefined}
        onDelete={
          canManage
            ? async () => {
                if (!(await confirmCrudDelete(selected.name))) return;
                await removeInstance(selected);
                router.goToList();
              }
            : undefined
        }
        onSubmit={async (form) => {
          if (router.isViewing) return;
          await updateEvolutionInstance(selected.id, buildPatch(form));
          setMessage('Instância atualizada.');
          router.goToView(selected.id);
          await load();
        }}
      />
    );
  }

  return (
    <PermissionGate permission="sistema.evolution">
      <div className="page-stack">
        <PageHeader
          breadcrumbs={breadcrumbsRoot}
          title="Instâncias"
          subtitle="Gerencie números conectados ao WhatsApp e a criação automática de leads."
          actions={
            <>
              <Link className="btn-ghost btn-sm" to="/m/comercial/whatsapp">
                Conversas
              </Link>
              {canManage ? (
                <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
                  Nova instância
                </button>
              ) : null}
            </>
          }
        />
        <CrudAlerts error={error} message={message} />

        <section className={`panel evolution-api-status${apiStatus.online ? ' is-online' : ''}`}>
          <div className="panel-body evolution-api-status__body">
            <div>
              <p className="evolution-api-status__label">Integração WhatsApp</p>
              <p className="evolution-api-status__state">
                <span className={`badge ${apiStatus.online ? 'badge-success' : 'badge-muted'}`}>
                  {apiStatus.online ? 'Online' : 'Offline'}
                </span>
              </p>
              <p className="muted evolution-api-status__detail">{apiStatus.message}</p>
              {apiStatus.webhookUrl ? (
                <p className="muted evolution-api-status__detail">
                  Webhook: <code>{apiStatus.webhookUrl}</code>
                </p>
              ) : (
                <p className="muted evolution-api-status__detail">
                  Webhook não configurado. Defina a URL pública da API em Sistema → Configurações.
                </p>
              )}
            </div>
            {canManage ? (
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={testApiBusy || loading}
                onClick={() => void testApi()}
              >
                {testApiBusy ? 'Testando…' : 'Testar conexão'}
              </button>
            ) : null}
          </div>
        </section>

        {loading ? (
          <AppLoadingPanel label="Carregando instâncias…" />
        ) : (
          <div className="evolution-instances-grid">
            {rows.length === 0 ? (
              <p className="muted">Nenhuma instância cadastrada.</p>
            ) : (
              rows.map((row) => (
                <InstanceCard
                  key={row.id}
                  row={row}
                  canManage={canManage}
                  busyId={busyId}
                  onConnect={handleConnect}
                  onRefresh={handleRefresh}
                  onOpen={(item) => router.goToView(item.id)}
                  onEdit={(item) => router.goToEdit(item.id)}
                  onRemove={async (item) => {
                    if (!(await confirmCrudDelete(item.name))) return;
                    await removeInstance(item);
                  }}
                />
              ))
            )}
          </div>
        )}

      </div>

      <EvolutionCreateModal
        open={createOpen}
        busy={createBusy}
        error={createError}
        onClose={() => {
          if (!createBusy) {
            setCreateOpen(false);
            setCreateError('');
          }
        }}
        onSubmit={handleCreate}
      />

      {pairing ? (
        <div
          className="evolution-pairing-backdrop"
          role="presentation"
          onClick={() => {
            setPairing(null);
            void load();
          }}
        >
          <div
            className="evolution-pairing-dialog panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evolution-pairing-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="panel-header">
              <h2 id="evolution-pairing-title">Conectar · {pairing.title}</h2>
            </div>
            <div className="panel-body evolution-pairing-body">
              {pairing.qrcode ? (
                <img className="evolution-pairing-qr" src={pairing.qrcode} alt="QR Code WhatsApp" />
              ) : pairing.qrPayload ? (
                <div className="evolution-pairing-qr evolution-pairing-qr--svg">
                  <QRCode value={pairing.qrPayload} size={280} level="M" />
                </div>
              ) : null}
              {pairing.pairingCode ? (
                <p className="evolution-pairing-hint">
                  Código para «Conectar com número de telefone»:{' '}
                  <strong className="evolution-pairing-code">{pairing.pairingCode}</strong>
                </p>
              ) : null}
              <p className="muted evolution-pairing-hint">
                No celular: WhatsApp → Aparelhos conectados → Conectar aparelho → escaneie o QR
                {pairing.pairingCode ? ' ou use o código acima.' : '.'}
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setPairing(null);
                  void load();
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PermissionGate>
  );
}
