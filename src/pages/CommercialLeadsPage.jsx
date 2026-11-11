import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  LayoutGrid,
  Mail,
  Maximize2,
  Minimize2,
  Phone,
  Plus,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  addCommercialLeadInteraction,
  convertCommercialLead,
  createCommercialLead,
  deleteCommercialLead,
  getCommercialFunnelOptions,
  getCommercialLeadInteractions,
  getCommercialLeadSources,
  getCommercialLossReasons,
  getCommercialLeads,
  recordCommercialLeadInteraction,
  updateCommercialLead,
} from '../api/commercial.js';
import { getUsers } from '../api/users.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { LeadOwnersField, LeadOwnersStack } from '../components/LeadOwnersField.jsx';
import {
  LeadContactsField,
  buildContactsPayload,
  formatContactsSummary,
  getPrimaryContact,
  resolveLeadContactsForForm,
} from '../components/LeadContactsField.jsx';
import { ModalCloseButton } from '../components/ModalCloseButton.jsx';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { useFlashMessage } from '../components/flash/FlashMessageProvider.jsx';
import { appConfirm } from '../components/confirm/appConfirm.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { LeadSourceBadge, LeadSourcesLegend } from '../components/LeadSourceBadge.jsx';
import { LeadMarkLostModal } from '../components/LeadMarkLostModal.jsx';
import { LeadAuditPanel } from '../components/LeadAuditPanel.jsx';
import { formatRelativeTime } from '../utils/relativeTime.js';
import { formatBrazilDateTime, formatBrazilTimeShort } from '../utils/brazilDateTime.js';
import {
  readKanbanFullscreenPreference,
  writeKanbanFullscreenPreference,
} from '../utils/commercialKanbanStorage.js';
import '../styles/commercial-leads.css';

const EMPTY_FORM = {
  title: '',
  type: '',
  stageId: '',
  funnelId: '',
  legalName: '',
  cnpj: '',
  contacts: [],
  initialInteraction: '',
  ownerUserIds: [],
  temperature: 'cold',
};

function isConsoleAdminUser(user) {
  return user?.active !== false && (user?.roles?.includes('admin') ?? false);
}

function resolveDefaultOwnerUserIds(currentUserId, adminUsers) {
  if (currentUserId && adminUsers.some((user) => user.id === currentUserId)) {
    return [currentUserId];
  }
  return adminUsers[0]?.id ? [adminUsers[0].id] : [];
}

function resolveLeadOwnerUserIds(lead) {
  if (lead?.owners?.length) return lead.owners.map((owner) => owner.userId);
  if (lead?.ownerUserId) return [lead.ownerUserId];
  return [];
}

const INTERACTION_MAX_LENGTH = 300;

const LEAD_TEMPERATURES = [
  { value: 'cold', label: 'Frio' },
  { value: 'warm', label: 'Morno' },
  { value: 'hot', label: 'Quente' },
];

function leadTemperatureLabel(value) {
  return LEAD_TEMPERATURES.find((item) => item.value === value)?.label ?? 'Frio';
}

function getPipelineStages(stages) {
  return stages.filter((stage) => stage.outcome === 'pipeline');
}

function getLostStage(stages) {
  return stages.find((stage) => stage.outcome === 'lost') ?? null;
}

function getNextPipelineStage(stages, currentStageId) {
  const pipeline = getPipelineStages(stages);
  const index = pipeline.findIndex((stage) => stage.id === currentStageId);
  if (index < 0 || index >= pipeline.length - 1) return null;
  return pipeline[index + 1];
}

function stageLabel(stage) {
  return stage?.name ?? stage?.label ?? '—';
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${breakpoint}px)`).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);

  return isMobile;
}

function normalizeCnpjInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 14);
}

function formatCnpjDisplay(digits) {
  const value = normalizeCnpjInput(digits);
  if (value.length <= 2) return value;
  if (value.length <= 5) return `${value.slice(0, 2)}.${value.slice(2)}`;
  if (value.length <= 8) return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5)}`;
  if (value.length <= 12) {
    return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8)}`;
  }
  return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`;
}

function normalizePhoneInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11);
}

function formatPhoneDisplay(digits) {
  const value = normalizePhoneInput(digits);
  if (value.length <= 2) return value;
  if (value.length <= 7) return `(${value.slice(0, 2)}) ${value.slice(2)}`;
  return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
}

function phoneDigits(phone) {
  return normalizePhoneInput(phone);
}

function whatsAppUrl(phone) {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return `https://wa.me/55${digits}`;
}

function getStageIndex(stages, stageId) {
  return stages.findIndex((stage) => stage.id === stageId);
}

function getNextStage(stages, currentStageId) {
  return getNextPipelineStage(stages, currentStageId);
}

function formatDateTime(isoDate) {
  return formatBrazilDateTime(isoDate);
}

function LeadToolbarInteraction({ lead, compact = false }) {
  const interactionLabel = formatRelativeTime(lead.lastInteractionAt, {
    emptyLabel: 'sem registro',
  });

  return (
    <span
      className={`commercial-lead-toolbar-interaction${compact ? ' commercial-lead-toolbar-interaction--compact' : ''}`}
      title={
        lead.lastInteractionAt
          ? `Última interação: ${formatDateTime(lead.lastInteractionAt)}`
          : 'Sem interação registrada'
      }
    >
      {compact ? interactionLabel : `Última interação: ${interactionLabel}`}
    </span>
  );
}

function LeadTemperaturePicker({ value, disabled, onChange }) {
  return (
    <div className="commercial-lead-toolbar-field commercial-lead-toolbar-field--temperature">
      <span>Temperatura</span>
      <div className="commercial-lead-temperature" role="group" aria-label="Temperatura do lead">
        {LEAD_TEMPERATURES.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`commercial-lead-temperature-btn commercial-lead-temperature-btn--${item.value}${
              value === item.value ? ' commercial-lead-temperature-btn--active' : ''
            }`}
            aria-pressed={value === item.value}
            disabled={disabled}
            onClick={() => onChange?.(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LeadTimingMeta({ lead, compact = false }) {
  const interactionLabel = formatRelativeTime(lead.lastInteractionAt, {
    emptyLabel: 'Sem interação',
  });
  const deadlineLabel =
    lead.stageDeadlineAt && !lead.stageExpired
      ? formatRelativeTime(lead.stageDeadlineAt, { future: true })
      : null;

  return (
    <div className={`commercial-lead-timing${compact ? ' commercial-lead-timing--compact' : ''}`}>
      <span
        className="commercial-lead-timing-item"
        title={
          lead.lastInteractionAt
            ? `Última interação: ${formatDateTime(lead.lastInteractionAt)}`
            : 'Sem interação registrada'
        }
      >
        {compact ? interactionLabel : `Última interação: ${interactionLabel}`}
      </span>
      {lead.stageExpired ? (
        <span className="commercial-lead-badge commercial-lead-badge--expired">Expirado</span>
      ) : deadlineLabel ? (
        <span
          className="commercial-lead-timing-deadline"
          title={formatDateTime(lead.stageDeadlineAt) || undefined}
        >
          Prazo {deadlineLabel}
        </span>
      ) : null}
    </div>
  );
}

function formatInteractionDateTime(isoDate) {
  return formatBrazilDateTime(isoDate) || '—';
}

function formatInteractionTimeShort(isoDate) {
  return formatBrazilTimeShort(isoDate) || '—';
}

function interactionSourceLabel(source) {
  if (source === 'whatsapp') return 'Celular';
  if (source === 'system') return 'Sistema';
  return 'Anotação';
}

function LeadInteractionsPanel({ leadId, lead, canManage, onLeadUpdated }) {
  const flash = useFlashMessage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError('');
    try {
      const rows = await getCommercialLeadInteractions(leadId);
      setItems(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load, lead?.lastInteractionAt]);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const content = text.trim();
    if (!content || !canManage) return;

    setBusy(true);
    setError('');
    try {
      const result = await addCommercialLeadInteraction(leadId, content);
      setItems((rows) => [result.interaction, ...rows]);
      setText('');
      onLeadUpdated?.(result.lead);
      flash.success('Interação registrada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="commercial-lead-modal-feed" aria-label="Interações do lead">
      <header className="commercial-lead-feed-head">
        <h3>Interações</h3>
        <p>
          Anotações manuais e mensagens do WhatsApp (sincronizadas automaticamente). Conversa completa no{' '}
          <Link to="/m/comercial/whatsapp">inbox</Link>.
        </p>
      </header>

      <CrudAlerts error={error} />

      {canManage ? (
        <form className="commercial-lead-interaction-compose" onSubmit={onSubmit}>
          <label className="field-block commercial-lead-interaction-compose-field">
            <span className="field-label">Nova anotação</span>
            <input
              type="text"
              className="input"
              value={text}
              maxLength={INTERACTION_MAX_LENGTH}
              onChange={(ev) => setText(ev.target.value)}
              placeholder="Ex.: Retorno na sexta às 14h"
              disabled={busy}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>
            {busy ? 'Salvando…' : 'Registrar'}
          </button>
        </form>
      ) : null}

      <div className="commercial-lead-interaction-list" aria-live="polite">
        {loading ? (
          <p className="commercial-lead-interaction-empty">Carregando interações…</p>
        ) : items.length === 0 ? (
          <p className="commercial-lead-interaction-empty">Nenhuma interação registrada ainda.</p>
        ) : (
          items.map((item) => {
            const isMobileChat = item.source === 'whatsapp';
            const bubbleVariant =
              item.source === 'whatsapp' ? 'mobile-chat' : item.source ?? 'manual';
            const authorName = isMobileChat
              ? getPrimaryContact(lead)?.name?.trim() ||
                lead?.contactName?.trim() ||
                item.userName ||
                'Celular'
              : item.userName ?? 'Usuário';

            if (isMobileChat) {
              return (
                <article
                  key={item.id}
                  className={`commercial-lead-interaction-bubble commercial-lead-interaction-bubble--${bubbleVariant}`}
                >
                  <p className="commercial-lead-interaction-wa-body">{item.content}</p>
                  <footer className="commercial-lead-interaction-wa-foot">
                    <time dateTime={item.createdAt} title={formatInteractionDateTime(item.createdAt)}>
                      {formatInteractionTimeShort(item.createdAt)}
                    </time>
                  </footer>
                </article>
              );
            }

            return (
              <article
                key={item.id}
                className={`commercial-lead-interaction-bubble commercial-lead-interaction-bubble--${bubbleVariant}`}
              >
                <header className="commercial-lead-interaction-bubble-head">
                  <div className="commercial-lead-interaction-bubble-author">
                    <Avatar
                      name={item.userName}
                      src={item.userAvatarUrl}
                      color={item.userAvatarColor}
                      size="xs"
                      title={item.userName}
                    />
                    <strong>{authorName}</strong>
                    <span className="commercial-lead-interaction-source">
                      {interactionSourceLabel(item.source)}
                    </span>
                  </div>
                  <time dateTime={item.createdAt} title={formatInteractionDateTime(item.createdAt)}>
                    {formatRelativeTime(item.createdAt)}
                  </time>
                </header>
                <p>{item.content}</p>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}

function LeadModal({
  mode,
  lead,
  stages,
  adminUsers,
  currentUserId,
  defaultFunnelId,
  canManage,
  onClose,
  onSaved,
  onUpdated,
  onDeleted,
  onRequestMarkLost,
}) {
  const flash = useFlashMessage();
  const isCreate = mode === 'create';
  const [form, setForm] = useState(() => {
    if (isCreate) {
      return {
        ...EMPTY_FORM,
        ownerUserIds: resolveDefaultOwnerUserIds(currentUserId, adminUsers),
      };
    }
    return {
      title: lead?.title ?? '',
      type: lead?.type ?? '',
      stageId: lead?.stageId ?? '',
      funnelId: lead?.funnelId ?? '',
      legalName: lead?.legalName ?? '',
      cnpj: lead?.cnpj ? normalizeCnpjInput(lead.cnpj) : '',
      contacts: resolveLeadContactsForForm(lead),
      initialInteraction: '',
      ownerUserIds: resolveLeadOwnerUserIds(lead),
      temperature: lead?.temperature ?? 'cold',
    };
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [converting, setConverting] = useState(false);
  const [detailTab, setDetailTab] = useState('summary');
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  const readOnly = !canManage || lead?.converted;
  const canAddInteractions = canManage && !lead?.converted;

  const selectedProfiles = useMemo(
    () =>
      form.ownerUserIds
        .map((userId) => {
          const fromAdmin = adminUsers.find((user) => user.id === userId);
          if (fromAdmin) {
            return {
              userId: fromAdmin.id,
              name: fromAdmin.name,
              avatarUrl: fromAdmin.avatarUrl ?? null,
              avatarColor: fromAdmin.avatarColor ?? null,
            };
          }
          return lead?.owners?.find((owner) => owner.userId === userId) ?? null;
        })
        .filter(Boolean),
    [form.ownerUserIds, adminUsers, lead?.owners],
  );

  const applyUpdatedLead = (result) => {
    const updated = result?.lead ?? result;
    onUpdated?.(updated);
    setForm((prev) => ({
      ...prev,
      ownerUserIds: resolveLeadOwnerUserIds(updated),
      contacts: resolveLeadContactsForForm(updated),
    }));
    setAuditRefreshKey((value) => value + 1);
    return updated;
  };

  async function persistLeadOwners(ownerUserIds) {
    if (isCreate || readOnly || !lead?.id) {
      setForm((prev) => ({ ...prev, ownerUserIds }));
      return;
    }
    const filtered = ownerUserIds.filter(Boolean);
    if (!filtered.length) {
      setError('Informe ao menos um responsável.');
      return;
    }
    setForm((prev) => ({ ...prev, ownerUserIds: filtered }));
    setError('');
    try {
      const result = await updateCommercialLead(lead.id, { ownerUserIds: filtered });
      applyUpdatedLead(result);
    } catch (err) {
      setError(err.message);
    }
  }

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (readOnly && !isCreate) return;

    const ownerUserIds = form.ownerUserIds.filter(Boolean);
    if (!ownerUserIds.length) {
      setError('Informe ao menos um responsável console admin.');
      return;
    }

    const contactsPayload = buildContactsPayload(form.contacts);
    for (const [index, contact] of contactsPayload.entries()) {
      if (!contact.name) {
        setError(`Informe o nome do contato ${index + 1}.`);
        return;
      }
    }

    setBusy(true);
    setError('');

    const payload = {
      title: form.title.trim(),
      ...(form.type ? { type: form.type } : {}),
      legalName: form.legalName.trim() || undefined,
      cnpj: normalizeCnpjInput(form.cnpj) || undefined,
      contacts: contactsPayload,
      ownerUserIds,
      temperature: form.temperature,
    };

    try {
      if (isCreate) {
        const created = await createCommercialLead({
          ...payload,
          funnelId: defaultFunnelId || undefined,
        });
        const initialInteraction = form.initialInteraction.trim();
        if (initialInteraction) {
          await addCommercialLeadInteraction(created.id, initialInteraction);
        }
        flash.success('Lead cadastrado.');
        onSaved(created);
      } else {
        const targetStage = stages.find((stage) => stage.id === form.stageId);
        const enteringLost =
          targetStage?.outcome === 'lost' &&
          lead.stageOutcome !== 'lost' &&
          form.stageId !== lead.stageId;
        if (enteringLost) {
          onRequestMarkLost?.(lead, form.stageId);
          setBusy(false);
          return;
        }

        const result = await updateCommercialLead(lead.id, {
          ...payload,
          type: form.type || null,
          stageId: form.stageId,
          legalName: form.legalName.trim() || null,
          cnpj: normalizeCnpjInput(form.cnpj) || null,
          contacts: contactsPayload,
          temperature: form.temperature,
        });
        flash.success('Lead atualizado.');
        onSaved(applyUpdatedLead(result));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onConvert = async () => {
    if (!lead || lead.converted) return;
    setConverting(true);
    setError('');
    try {
      const result = await convertCommercialLead(lead.id);
      flash.success(
        result.conversion.kind === 'partner'
          ? `Lead convertido em parceiro "${result.conversion.networkName}".`
          : `Lead convertido em empresa "${result.conversion.companyName}".`,
      );
      onSaved(result.lead, result.conversion);
    } catch (err) {
      setError(err.message);
    } finally {
      setConverting(false);
    }
  };

  const onRemove = async () => {
    if (!lead?.id || !canManage || lead.converted) return;

    const label = form.title.trim() || lead.title || 'este lead';
    const confirmed = await appConfirm({
      title: 'Excluir lead',
      message: `Excluir "${label}"? O registro será apagado de forma permanente, junto com todo o histórico (interações, aba Histórico e vínculo deste lead no WhatsApp). Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir lead',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!confirmed) return;

    setBusy(true);
    setError('');
    try {
      await deleteCommercialLead(lead.id);
      flash.success('Lead excluído.');
      onDeleted?.(lead.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div
      className={`commercial-lead-modal-backdrop${isCreate ? ' commercial-lead-modal-backdrop--centered' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`commercial-lead-modal${isCreate ? ' commercial-lead-modal--create' : ' commercial-lead-modal--large'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commercial-lead-modal-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <ModalCloseButton onClick={onClose} className="commercial-lead-modal-close" />
        <div className="commercial-lead-modal-head">
          <div className="commercial-lead-modal-head-row">
            <h2 id="commercial-lead-modal-title">
              {isCreate ? 'Novo lead' : form.title.trim() || lead?.title || 'Lead'}
            </h2>
            {!isCreate && lead ? (
              <>
                <div className="commercial-lead-modal-head-badges">
                  {lead.typeLabel ? (
                    <span
                      className={`commercial-lead-badge commercial-lead-badge--${lead.type === 'partner' ? 'partner' : 'corporate'}`}
                    >
                      {lead.typeLabel}
                    </span>
                  ) : null}
                  <LeadSourceBadge lead={lead} />
                </div>
                <div className="commercial-lead-toolbar-controls commercial-lead-toolbar-controls--head">
                  <label className="commercial-lead-toolbar-field">
                    <span>Etapa</span>
                    <select
                      className="input"
                      value={form.stageId}
                      onChange={(ev) => setForm((prev) => ({ ...prev, stageId: ev.target.value }))}
                      disabled={readOnly}
                      aria-label="Etapa do lead"
                    >
                      {stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stageLabel(stage)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="commercial-lead-toolbar-field">
                    <span>Tipo</span>
                    <select
                      className="input"
                      value={form.type}
                      onChange={(ev) => setForm((prev) => ({ ...prev, type: ev.target.value }))}
                      disabled={readOnly}
                      aria-label="Tipo do lead"
                    >
                      <option value="">Não definido</option>
                      <option value="partner">Academia</option>
                      <option value="corporate">Empresa</option>
                    </select>
                  </label>
                  <LeadTemperaturePicker
                    value={form.temperature}
                    disabled={readOnly}
                    onChange={(temperature) => setForm((prev) => ({ ...prev, temperature }))}
                  />
                </div>
                <div className="commercial-lead-toolbar-meta commercial-lead-toolbar-meta--head">
                  <span className="commercial-lead-toolbar-chip">{lead.funnelName ?? 'Funil'}</span>
                  <LeadToolbarInteraction lead={lead} compact />
                </div>
              </>
            ) : null}
            {!isCreate && lead?.converted ? (
              <p className="page-subtitle commercial-lead-modal-head-converted">Lead convertido em cadastro.</p>
            ) : null}
          </div>
          {!isCreate ? (
            <LeadOwnersField
              adminUsers={adminUsers}
              ownerUserIds={form.ownerUserIds}
              owners={lead?.owners}
              disabled={readOnly}
              onChange={persistLeadOwners}
            />
          ) : null}
        </div>

        <form className="commercial-lead-modal-form" onSubmit={onSubmit}>
          <div className="commercial-lead-modal-body">
            <CrudAlerts error={error} />

            {isCreate ? (
              <div className="form-grid commercial-lead-create-form">
                <label className="field-block field-span-2">
                  <span className="field-label">Nome</span>
                  <input
                    type="text"
                    className="input"
                    value={form.title}
                    onChange={(ev) => setForm((prev) => ({ ...prev, title: ev.target.value }))}
                    required
                    autoFocus
                    placeholder="Ex.: Academia Centro"
                  />
                </label>

                <label className="field-block field-span-2">
                  <span className="field-label">Tipo (opcional)</span>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(ev) => setForm((prev) => ({ ...prev, type: ev.target.value }))}
                  >
                    <option value="">Não definido</option>
                    <option value="partner">Academia</option>
                    <option value="corporate">Empresa</option>
                  </select>
                </label>

                <label className="field-block field-span-2">
                  <span className="field-label">Primeira interação (opcional)</span>
                  <input
                    type="text"
                    className="input"
                    maxLength={INTERACTION_MAX_LENGTH}
                    value={form.initialInteraction}
                    onChange={(ev) =>
                      setForm((prev) => ({ ...prev, initialInteraction: ev.target.value }))
                    }
                    placeholder="Ex.: Indicação do João, interessado no plano corporativo"
                  />
                </label>

                <div className="field-block field-span-2">
                  <span className="field-label">Contatos (opcional)</span>
                  <LeadContactsField
                    contacts={form.contacts}
                    onChange={(contacts) => setForm((prev) => ({ ...prev, contacts }))}
                  />
                </div>
              </div>
            ) : (
              <div className="commercial-lead-modal-layout">
                <div className="commercial-lead-modal-content">
                  <div className="commercial-lead-modal-tabs" role="tablist">
                    <button
                      type="button"
                      className={`commercial-lead-modal-tab${detailTab === 'summary' ? ' commercial-lead-modal-tab--active' : ''}`}
                      role="tab"
                      aria-selected={detailTab === 'summary'}
                      onClick={() => setDetailTab('summary')}
                    >
                      Resumo
                    </button>
                    <button
                      type="button"
                      className={`commercial-lead-modal-tab${detailTab === 'history' ? ' commercial-lead-modal-tab--active' : ''}`}
                      role="tab"
                      aria-selected={detailTab === 'history'}
                      onClick={() => setDetailTab('history')}
                    >
                      Histórico
                    </button>
                    <button type="button" className="commercial-lead-modal-tab" role="tab" aria-selected="false" disabled title="Em breve">
                      Proposta comercial
                    </button>
                  </div>

                  <section className="commercial-lead-modal-panel">
                    <div className="commercial-lead-panel-head">
                      <h3>Informações do lead</h3>
                    </div>
                    <label className="field-block">
                      <span className="field-label">Nome do lead</span>
                      <input
                        type="text"
                        className="input"
                        value={form.title}
                        onChange={(ev) => setForm((prev) => ({ ...prev, title: ev.target.value }))}
                        required
                        disabled={readOnly}
                        autoFocus={canManage && !lead?.converted}
                      />
                    </label>
                    <div className="commercial-lead-summary-grid">
                      <div>
                        <span>Funil</span>
                        <strong>{lead.funnelName ?? '—'}</strong>
                      </div>
                    </div>
                  </section>

                  <section className="commercial-lead-modal-panel">
                    <div className="commercial-lead-panel-head">
                      <h3>Contatos</h3>
                    </div>
                    <LeadContactsField
                      contacts={form.contacts}
                      disabled={readOnly}
                      onChange={(contacts) => setForm((prev) => ({ ...prev, contacts }))}
                    />
                  </section>

                  <section className="commercial-lead-modal-panel">
                    <div className="commercial-lead-panel-head">
                      <h3>Empresa</h3>
                    </div>
                    <div className="commercial-lead-modal-fields commercial-lead-modal-fields--grid">
                      <label className="field-block">
                        <span className="field-label">Razão social</span>
                        <input
                          type="text"
                          className="input"
                          value={form.legalName}
                          onChange={(ev) =>
                            setForm((prev) => ({ ...prev, legalName: ev.target.value }))
                          }
                          disabled={readOnly}
                        />
                      </label>
                      <label className="field-block">
                        <span className="field-label">CNPJ</span>
                        <input
                          type="text"
                          className="input"
                          inputMode="numeric"
                          value={formatCnpjDisplay(form.cnpj)}
                          onChange={(ev) =>
                            setForm((prev) => ({ ...prev, cnpj: normalizeCnpjInput(ev.target.value) }))
                          }
                          disabled={readOnly}
                          placeholder="00.000.000/0000-00"
                        />
                      </label>
                    </div>
                  </section>
                </div>

                {detailTab === 'history' ? (
                  <LeadAuditPanel leadId={lead.id} refreshKey={auditRefreshKey} />
                ) : (
                  <LeadInteractionsPanel
                    leadId={lead.id}
                    lead={lead}
                    canManage={canAddInteractions}
                    onLeadUpdated={applyUpdatedLead}
                  />
                )}
              </div>
            )}

            {!isCreate && lead?.converted ? (
              <div className="panel panel-muted">
                <p className="field-hint">
                  {lead.convertedNetworkId ? (
                    <>
                      Convertido em parceiro.{' '}
                      <Link to={`/m/operacao/redes?id=${encodeURIComponent(lead.convertedNetworkId)}`}>
                        Abrir cadastro →
                      </Link>
                    </>
                  ) : (
                    <>
                      Convertido em empresa.{' '}
                      <Link
                        to={`/m/corporativo/empresas?id=${encodeURIComponent(lead.convertedCompanyId)}`}
                      >
                        Abrir cadastro →
                      </Link>
                    </>
                  )}
                </p>
              </div>
            ) : null}
          </div>

          <div className="commercial-lead-modal-actions">
            {!isCreate && canManage && !lead?.converted ? (
              <button
                type="button"
                className="btn-ghost btn-danger commercial-lead-modal-delete"
                disabled={busy || converting}
                onClick={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  void onRemove();
                }}
              >
                Excluir lead
              </button>
            ) : null}
            <span className="commercial-lead-modal-actions-spacer" aria-hidden="true" />

            {!isCreate && canManage && !lead?.converted && lead?.stageOutcome !== 'lost' ? (
              <button
                type="button"
                className="commercial-btn-outline"
                disabled={converting || busy}
                onClick={onConvert}
              >
                {converting ? 'Convertendo…' : 'Converter em cadastro'}
              </button>
            ) : null}

            {canManage && (!lead?.converted || isCreate) ? (
              <button type="submit" className="btn-primary" disabled={busy || converting}>
                {busy ? 'Salvando…' : isCreate ? 'Cadastrar lead' : 'Salvar alterações'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

function SalesFunnelOverview({ stages, leadsByStage, activeStageId, onSelectStage }) {
  const pipelineStages = getPipelineStages(stages);
  const maxCount = Math.max(
    1,
    ...pipelineStages.map((stage) => (leadsByStage[stage.id] ?? []).length),
  );

  const pipelineTotal = pipelineStages.reduce(
    (sum, stage) => sum + (leadsByStage[stage.id] ?? []).length,
    0,
  );
  const wonCount = (leadsByStage[stages.find((stage) => stage.outcome === 'won')?.id] ?? []).length;
  const lostCount = (leadsByStage[stages.find((stage) => stage.outcome === 'lost')?.id] ?? []).length;

  return (
    <section className="panel commercial-funnel-panel" aria-label="Resumo do funil">
      <div className="panel-body commercial-funnel-panel-body">
        <div className="commercial-funnel-stats">
          <div className="commercial-funnel-stat">
            <TrendingUp size={16} aria-hidden="true" />
            <span>
              <strong>{pipelineTotal}</strong> em pipeline
            </span>
          </div>
          <div className="commercial-funnel-stat commercial-funnel-stat--won">
            <strong>{wonCount}</strong> ganhos
          </div>
          <div className="commercial-funnel-stat commercial-funnel-stat--lost">
            <strong>{lostCount}</strong> perdidos
          </div>
        </div>

        <div className="commercial-funnel-bars" role="list" aria-label="Etapas do funil">
          {pipelineStages.map((stage, index) => {
            const count = (leadsByStage[stage.id] ?? []).length;
            const width = Math.max(28, Math.round((count / maxCount) * 100));
            const isActive = stage.id === activeStageId;

            return (
              <button
                key={stage.id}
                type="button"
                role="listitem"
                className={`commercial-funnel-bar${isActive ? ' commercial-funnel-bar--active' : ''}`}
                style={{ width: `${width}%` }}
                onClick={() => onSelectStage(stage.id)}
                aria-pressed={isActive}
              >
                <span className="commercial-funnel-bar-label">{stageLabel(stage)}</span>
                <span className="commercial-funnel-bar-count">{count}</span>
                {index < pipelineStages.length - 1 ? (
                  <span className="commercial-funnel-bar-arrow" aria-hidden="true">
                    ›
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LeadStageQuickControls({
  lead,
  stages,
  canManage,
  busyId,
  onStageChange,
  compact = false,
}) {
  const lostStage = getLostStage(stages);
  const pipeline = getPipelineStages(stages);
  const nextStage = getNextPipelineStage(stages, lead.stageId);
  const isClosed = lead.stageOutcome === 'won' || lead.stageOutcome === 'lost' || lead.converted;
  const isBusy = busyId === lead.id;

  if (!canManage || isClosed) return null;

  const stopBubble = (ev) => {
    ev.stopPropagation();
  };

  return (
    <div
      className={`commercial-lead-stage-quick${compact ? ' commercial-lead-stage-quick--compact' : ''}`}
      onClick={stopBubble}
      onPointerDown={stopBubble}
    >
      <label className="commercial-lead-stage-quick-select-wrap">
        <span className="sr-only">Etapa do funil</span>
        <select
          className="commercial-lead-stage-quick-select"
          value={lead.stageId}
          disabled={isBusy}
          aria-label={`Etapa de ${lead.title}`}
          onChange={(ev) => onStageChange(lead, ev.target.value)}
        >
          {pipeline.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stageLabel(stage)}
            </option>
          ))}
        </select>
      </label>
      {nextStage && lead.stageId !== nextStage.id ? (
        <button
          type="button"
          className="commercial-lead-stage-quick-btn"
          disabled={isBusy}
          title={`Avançar: ${stageLabel(nextStage)}`}
          aria-label={`Avançar para ${stageLabel(nextStage)}`}
          onClick={() => onStageChange(lead, nextStage.id)}
        >
          <ChevronRight size={16} aria-hidden="true" />
          {!compact ? <span>Avançar</span> : null}
        </button>
      ) : null}
      {lostStage && lead.stageId !== lostStage.id ? (
        <button
          type="button"
          className="commercial-lead-stage-quick-btn commercial-lead-stage-quick-btn--lost"
          disabled={isBusy}
          title="Marcar como perdido"
          aria-label={`Marcar ${lead.title} como perdido`}
          onClick={() => onStageChange(lead, lostStage.id)}
        >
          <X size={compact ? 14 : 16} aria-hidden="true" />
          {!compact ? <span>Perdido</span> : null}
        </button>
      ) : null}
    </div>
  );
}

function StageTabBar({ stages, leadsByStage, activeStageId, onSelectStage }) {
  return (
    <div className="commercial-stage-tabs" role="tablist" aria-label="Etapas do funil">
      {stages.map((stage) => {
        const count = (leadsByStage[stage.id] ?? []).length;
        const isActive = stage.id === activeStageId;
        return (
          <button
            key={stage.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`commercial-stage-tab commercial-stage-tab--${stage.outcome}${isActive ? ' commercial-stage-tab--active' : ''}`}
            onClick={() => onSelectStage(stage.id)}
          >
            <span>{stageLabel(stage)}</span>
            <span className="commercial-stage-tab-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function LeadQuickActions({
  lead,
  stages,
  canManage,
  onOpen,
  onStageChange,
  onConvert,
  onRecordInteraction,
  busyId,
}) {
  const primaryContact = getPrimaryContact(lead);
  const phone = phoneDigits(primaryContact?.phone ?? lead.phone);
  const email = primaryContact?.email ?? lead.email;
  const wa = whatsAppUrl(primaryContact?.phone ?? lead.phone);
  const contactsSummary = formatContactsSummary(lead);
  const isClosed = lead.stageOutcome === 'won' || lead.stageOutcome === 'lost' || lead.converted;
  const isBusy = busyId === lead.id;

  return (
    <article className={`commercial-funnel-lead${lead.stageExpired ? ' commercial-funnel-lead--expired' : ''}`}>
      <button type="button" className="commercial-funnel-lead-main" onClick={() => onOpen(lead)}>
        <div className="commercial-funnel-lead-head">
          <h3>{lead.title}</h3>
          <div className="commercial-lead-card-meta">
            {lead.type ? (
              <span
                className={`commercial-lead-badge commercial-lead-badge--${lead.type === 'partner' ? 'partner' : 'corporate'}`}
              >
                {lead.type === 'partner' ? 'Academia' : 'Empresa'}
              </span>
            ) : null}
            <LeadSourceBadge lead={lead} compact />
          </div>
        </div>
        <LeadTimingMeta lead={lead} />
        {contactsSummary ? <p>{contactsSummary}</p> : null}
        {phone ? <p>{formatPhoneDisplay(phone)}</p> : null}
        {email ? <p>{email}</p> : null}
        {lead.owners?.length || lead.ownerName ? (
          <p className="commercial-funnel-lead-owner">
            <LeadOwnersStack owners={lead.owners?.length ? lead.owners : [{
              userId: lead.ownerUserId,
              name: lead.ownerName,
              avatarUrl: lead.ownerAvatarUrl,
              avatarColor: lead.ownerAvatarColor,
            }]} size="xs" max={3} />
            <span>
              {(lead.owners?.length ? lead.owners : [{ name: lead.ownerName }])
                .map((owner) => owner.name)
                .filter(Boolean)
                .join(', ')}
            </span>
          </p>
        ) : null}
        {lead.converted ? (
          <span className="commercial-lead-badge commercial-lead-badge--converted">Convertido</span>
        ) : null}
      </button>

      <LeadStageQuickControls
        lead={lead}
        stages={stages}
        canManage={canManage}
        busyId={busyId}
        onStageChange={onStageChange}
      />

      <div className="commercial-funnel-lead-actions">
        {phone ? (
          <a
            className="commercial-action-btn"
            href={`tel:+55${phone}`}
            aria-label={`Ligar para ${lead.title}`}
            onClick={() => onRecordInteraction?.(lead, 'call')}
          >
            <Phone size={18} aria-hidden="true" />
            <span>Ligar</span>
          </a>
        ) : null}

        {wa ? (
          <a
            className="commercial-action-btn commercial-action-btn--mobile-chat"
            href={wa}
            target="_blank"
            rel="noreferrer"
            aria-label={`Mensagem no celular — ${lead.title}`}
            onClick={() => onRecordInteraction?.(lead, 'whatsapp')}
          >
            <span className="commercial-action-icon-text" aria-hidden="true">
              Msg
            </span>
            <span>Celular</span>
          </a>
        ) : null}

        {email ? (
          <a
            className="commercial-action-btn"
            href={`mailto:${email}`}
            aria-label={`E-mail ${lead.title}`}
            onClick={() => onRecordInteraction?.(lead, 'email')}
          >
            <Mail size={18} aria-hidden="true" />
            <span>E-mail</span>
          </a>
        ) : null}

        {canManage && !lead.converted && lead.stageOutcome !== 'lost' && lead.stageOutcome !== 'won' ? (
          <button
            type="button"
            className="commercial-action-btn"
            disabled={isBusy}
            onClick={() => onConvert(lead)}
          >
            <span>Converter</span>
          </button>
        ) : null}
      </div>
    </article>
  );
}

function LeadKanbanCard({
  lead,
  stages,
  canManage,
  busyId,
  dragging,
  dropStageId,
  onOpen,
  onStageChange,
  onDragStart,
  onDragEnd,
  onColumnDragOver,
  onColumnDrop,
}) {
  const draggable = canManage && !lead.converted;
  const didDragRef = useRef(false);

  const handleDragStart = (ev) => {
    didDragRef.current = true;
    ev.dataTransfer.setData('text/plain', lead.id);
    ev.dataTransfer.setData('text/lead-id', lead.id);
    ev.dataTransfer.effectAllowed = 'move';
    onDragStart?.(ev);
  };

  const handleDragEnd = (ev) => {
    onDragEnd?.(ev);
    window.setTimeout(() => {
      didDragRef.current = false;
    }, 0);
  };

  const handleOpen = () => {
    if (didDragRef.current) return;
    onOpen(lead);
  };

  const sourceAccent = lead.sourceColor ?? 'var(--border)';

  return (
    <article
      className={`commercial-lead-card-wrap${draggable ? ' commercial-lead-card-wrap--draggable' : ''}${dragging ? ' commercial-lead-card-wrap--dragging' : ''}${lead.stageExpired ? ' commercial-lead-card-wrap--expired' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable ? handleDragEnd : undefined}
      onDragOver={canManage ? (ev) => onColumnDragOver(ev, dropStageId) : undefined}
      onDrop={canManage ? (ev) => onColumnDrop(ev, dropStageId) : undefined}
      title={draggable ? 'Arraste para mover de etapa' : undefined}
    >
      <div
        className="commercial-lead-card"
        style={{ borderLeftColor: sourceAccent }}
        role="button"
        tabIndex={0}
        draggable={false}
        onClick={handleOpen}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            handleOpen();
          }
        }}
      >
        <header className="commercial-lead-card-header commercial-lead-card-header--kanban">
          <div className="commercial-lead-card-title" title={lead.title}>
            {lead.title}
          </div>
          <LeadSourceBadge lead={lead} compact />
        </header>
        <div className="commercial-lead-card-meta commercial-lead-card-meta--kanban">
          {lead.typeLabel ? (
            <span
              className={`commercial-lead-badge commercial-lead-badge--${lead.type === 'partner' ? 'partner' : 'corporate'}`}
            >
              {lead.type === 'partner' ? 'Academia' : 'Empresa'}
            </span>
          ) : null}
          <LeadTimingMeta lead={lead} compact />
          {lead.converted ? (
            <span className="commercial-lead-badge commercial-lead-badge--converted">Conv.</span>
          ) : null}
        </div>
        {lead.stageOutcome === 'lost' && lead.lossReasonLabel ? (
          <p className="commercial-lead-card-snippet" title={lead.lossReasonLabel}>
            {lead.lossReasonLabel.length > 56
              ? `${lead.lossReasonLabel.slice(0, 56).trim()}…`
              : lead.lossReasonLabel}
          </p>
        ) : lead.latestInteractionContent ? (
          <p className="commercial-lead-card-snippet" title={lead.latestInteractionContent}>
            {lead.latestInteractionContent.length > 56
              ? `${lead.latestInteractionContent.slice(0, 56).trim()}…`
              : lead.latestInteractionContent}
          </p>
        ) : null}
        {lead.owners?.length || lead.ownerName ? (
          <div
            className="commercial-lead-card-owner commercial-lead-card-owner--avatars"
            title={(lead.owners?.length ? lead.owners : [{ name: lead.ownerName }])
              .map((owner) => owner.name)
              .filter(Boolean)
              .join(', ')}
          >
            <LeadOwnersStack
              owners={
                lead.owners?.length
                  ? lead.owners
                  : [{
                      userId: lead.ownerUserId,
                      name: lead.ownerName,
                      avatarUrl: lead.ownerAvatarUrl,
                      avatarColor: lead.ownerAvatarColor,
                    }]
              }
              size="xs"
              max={3}
            />
          </div>
        ) : null}
      </div>
      <LeadStageQuickControls
        lead={lead}
        stages={stages}
        canManage={canManage}
        busyId={busyId}
        onStageChange={onStageChange}
        compact
      />
    </article>
  );
}

export function CommercialLeadsPage() {
  const [searchParams] = useSearchParams();
  const funnelIdFromUrl = searchParams.get('funnelId') ?? '';
  const leadIdFromUrl = searchParams.get('leadId') ?? '';
  const { user, hasPermission } = useAuth();
  const flash = useFlashMessage();
  const canManage = hasPermission('comercial.leads.manage');
  const isMobile = useIsMobile();

  const [funnelOptions, setFunnelOptions] = useState([]);
  const [stages, setStages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const adminUsers = useMemo(
    () => users.filter((row) => isConsoleAdminUser(row)),
    [users],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFunnelId, setSelectedFunnelId] = useState(funnelIdFromUrl);
  const [activeStageId, setActiveStageId] = useState('');
  const [viewMode, setViewMode] = useState(() => (isMobile ? 'funnel' : 'kanban'));
  const [kanbanFullscreen, setKanbanFullscreen] = useState(() => readKanbanFullscreenPreference());
  const [busyLeadId, setBusyLeadId] = useState('');
  const [draggingLeadId, setDraggingLeadId] = useState('');
  const [dragOverStageId, setDragOverStageId] = useState('');
  const [modal, setModal] = useState(null);
  const [leadSources, setLeadSources] = useState([]);
  const [lossReasons, setLossReasons] = useState([]);
  const [markLostModal, setMarkLostModal] = useState(null);
  const kanbanShellRef = useRef(null);

  useEffect(() => {
    setViewMode(isMobile ? 'funnel' : viewMode === 'funnel' ? 'funnel' : 'kanban');
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && kanbanFullscreen) {
      setKanbanFullscreen(false);
      writeKanbanFullscreenPreference(false);
    }
  }, [isMobile, kanbanFullscreen]);

  const toggleKanbanFullscreen = useCallback(() => {
    setKanbanFullscreen((current) => {
      const next = !current;
      writeKanbanFullscreenPreference(next);
      return next;
    });
  }, []);

  const kanbanFullscreenActive =
    kanbanFullscreen && viewMode === 'kanban' && !isMobile;
  const kanbanLayoutActive = viewMode === 'kanban' && !isMobile && !loading;

  useEffect(() => {
    if (!kanbanFullscreenActive) return undefined;
    const onKey = (ev) => {
      if (ev.key !== 'Escape') return;
      setKanbanFullscreen(false);
      writeKanbanFullscreenPreference(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kanbanFullscreenActive]);

  useEffect(() => {
    if (!kanbanFullscreenActive) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [kanbanFullscreenActive]);

  useEffect(() => {
    if (funnelIdFromUrl) {
      setSelectedFunnelId(funnelIdFromUrl);
    }
  }, [funnelIdFromUrl]);

  useEffect(() => {
    if (!kanbanLayoutActive) return undefined;
    const shell = kanbanShellRef.current;
    if (!shell) return undefined;

    const onWheel = (event) => {
      if (shell.scrollWidth <= shell.clientWidth + 1) return;

      let delta = 0;
      if (event.shiftKey && event.deltaY !== 0) {
        delta = event.deltaY;
      } else if (Math.abs(event.deltaX) > 2 && Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
        delta = event.deltaX;
      } else {
        return;
      }

      const before = shell.scrollLeft;
      shell.scrollLeft += delta;
      if (shell.scrollLeft !== before) {
        event.preventDefault();
      }
    };

    shell.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => shell.removeEventListener('wheel', onWheel, { capture: true });
  }, [kanbanLayoutActive]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [options, userRows, sources, reasons] = await Promise.all([
        getCommercialFunnelOptions(),
        getUsers(),
        getCommercialLeadSources().catch(() => []),
        getCommercialLossReasons().catch(() => []),
      ]);

      const nextOptions = Array.isArray(options) ? options : [];
      setFunnelOptions(nextOptions);
      setUsers((userRows ?? []).filter((row) => row.active !== false));
      setLeadSources(Array.isArray(sources) ? sources : []);
      setLossReasons(Array.isArray(reasons) ? reasons : []);

      const preferredFunnelId = funnelIdFromUrl || selectedFunnelId;
      const currentFunnel =
        nextOptions.find((item) => item.id === preferredFunnelId) ??
        nextOptions.find((item) => item.id === selectedFunnelId) ??
        nextOptions.find((item) => item.isDefault) ??
        nextOptions[0] ??
        null;

      const funnelId = currentFunnel?.id ?? '';
      const nextStages = currentFunnel?.stages ?? [];
      setStages(nextStages);

      if (funnelId && !funnelIdFromUrl && !selectedFunnelId) {
        setSelectedFunnelId(funnelId);
      } else if (funnelId && funnelIdFromUrl && funnelId !== selectedFunnelId) {
        setSelectedFunnelId(funnelId);
      }

      const leadRows = await getCommercialLeads({
        funnelId: funnelId || undefined,
      });

      setLeads(Array.isArray(leadRows) ? leadRows : []);

      const grouped = Object.fromEntries(nextStages.map((stage) => [stage.id, []]));
      for (const lead of leadRows ?? []) {
        if (!grouped[lead.stageId]) grouped[lead.stageId] = [];
        grouped[lead.stageId].push(lead);
      }

      const firstWithLeads =
        nextStages.find((stage) => (grouped[stage.id] ?? []).length > 0)?.id ??
        nextStages[0]?.id ??
        '';

      setActiveStageId((current) =>
        current && (grouped[current] ?? []).length > 0 ? current : firstWithLeads,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [funnelIdFromUrl, selectedFunnelId, user?.id]);

  useEffect(() => {
    if (user?.id) load();
  }, [load, user?.id]);

  useEffect(() => {
    if (!leadIdFromUrl || loading || !leads.length) return;
    const lead = leads.find((row) => row.id === leadIdFromUrl);
    if (lead) {
      setModal({ mode: 'edit', lead });
      setActiveStageId(lead.stageId);
    }
  }, [leadIdFromUrl, leads, loading]);

  const leadsByStage = useMemo(() => {
    const map = Object.fromEntries(stages.map((stage) => [stage.id, []]));
    for (const lead of leads) {
      if (!map[lead.stageId]) map[lead.stageId] = [];
      map[lead.stageId].push(lead);
    }
    return map;
  }, [leads, stages]);

  const activeStage = stages.find((stage) => stage.id === activeStageId) ?? stages[0];
  const activeStageLeads = leadsByStage[activeStageId] ?? [];

  const onRecordInteraction = async (lead, kind) => {
    try {
      const result = await recordCommercialLeadInteraction(lead.id, kind);
      const updated = result?.lead ?? result;
      setLeads((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      setModal((current) =>
        current?.lead?.id === updated.id ? { ...current, lead: updated } : current,
      );
    } catch {
      // silencioso — a ação principal (ligar/celular/e-mail) não deve falhar por isso
    }
  };

  const onStageChange = useCallback(
    async (lead, stageId, lossPayload) => {
      if (lead.stageId === stageId) return;

      const targetStage = stages.find((stage) => stage.id === stageId);
      const enteringLost =
        targetStage?.outcome === 'lost' && lead.stageOutcome !== 'lost';
      if (enteringLost && !lossPayload) {
        setMarkLostModal({ lead, stageId });
        return false;
      }

      setBusyLeadId(lead.id);
      try {
        const result = await updateCommercialLead(lead.id, { stageId, ...lossPayload });
        const updated = result?.lead ?? result;
        setLeads((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));

        if (result?.outcome?.kind === 'transfer_funnel') {
          setLeads((rows) => rows.filter((row) => row.id !== updated.id));
          flash.success(
            `Lead movido para ${result.outcome.targetFunnelName} · ${result.outcome.targetStageName}.`,
          );
        } else if (result?.outcome?.conversion) {
          flash.success('Lead convertido automaticamente.');
        } else if (updated.stageId !== lead.stageId) {
          flash.success(`Lead movido para ${updated.stageLabel}.`);
          setActiveStageId((current) => (updated.stageId !== current ? updated.stageId : current));
        } else {
          flash.error('Não foi possível mover o lead para esta etapa.');
        }
        return true;
      } catch (err) {
        flash.error(err.message);
        return false;
      } finally {
        setBusyLeadId('');
      }
    },
    [flash, stages],
  );

  const onRequestMarkLost = useCallback((lead, stageId) => {
    setModal(null);
    setMarkLostModal({ lead, stageId });
  }, []);

  const onConfirmMarkLost = useCallback(
    async (lossPayload) => {
      if (!markLostModal) return;
      const { lead, stageId } = markLostModal;
      const ok = await onStageChange(lead, stageId, lossPayload);
      if (!ok) return;
      try {
        const reasons = await getCommercialLossReasons();
        setLossReasons(Array.isArray(reasons) ? reasons : []);
      } catch {
        /* lista opcional */
      }
      setMarkLostModal(null);
    },
    [markLostModal, onStageChange],
  );

  const onKanbanDrop = useCallback(
    async (stageId, leadId) => {
      const lead = leads.find((row) => row.id === leadId);
      if (!lead || lead.stageId === stageId) return;
      await onStageChange(lead, stageId);
    },
    [leads, onStageChange],
  );

  const onColumnDragOver = useCallback(
    (ev, stageId) => {
      if (!canManage) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'move';
      setDragOverStageId(stageId);
    },
    [canManage],
  );

  const onColumnDrop = useCallback(
    (ev, stageId) => {
      if (!canManage) return;
      ev.preventDefault();
      ev.stopPropagation();
      setDragOverStageId('');
      const leadId = ev.dataTransfer.getData('text/lead-id') || ev.dataTransfer.getData('text/plain');
      if (!leadId) return;
      void onKanbanDrop(stageId, leadId);
    },
    [canManage, onKanbanDrop],
  );

  const onConvertLead = async (lead) => {
    setBusyLeadId(lead.id);
    try {
      const result = await convertCommercialLead(lead.id);
      const updated = result.lead;
      if (result.outcome?.kind === 'transfer_funnel') {
        setLeads((rows) => rows.filter((row) => row.id !== updated.id));
      } else {
        setLeads((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      }
      const wonStage = stages.find((stage) => stage.outcome === 'won');
      if (wonStage) setActiveStageId(wonStage.id);
      flash.success(
        result.conversion.kind === 'partner'
          ? `Convertido em parceiro "${result.conversion.networkName}".`
          : `Convertido em empresa "${result.conversion.companyName}".`,
      );
    } catch (err) {
      flash.error(err.message);
    } finally {
      setBusyLeadId('');
    }
  };

  const onLeadUpdated = (updated) => {
    setLeads((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
    setModal((current) =>
      current?.lead?.id === updated.id ? { ...current, lead: updated } : current,
    );
  };

  const onLeadDeleted = (leadId) => {
    setLeads((rows) => rows.filter((row) => row.id !== leadId));
    setModal(null);
  };

  const onSaved = (savedLead, conversion) => {
    if (conversion) {
      setLeads((rows) => rows.map((row) => (row.id === savedLead.id ? savedLead : row)));
      const wonStage = stages.find((stage) => stage.outcome === 'won');
      if (wonStage) setActiveStageId(wonStage.id);
      setModal({ mode: 'edit', lead: savedLead });
      return;
    }

    if (modal?.mode === 'create') {
      setLeads((rows) => [savedLead, ...rows]);
      setActiveStageId(savedLead.stageId);
    } else {
      setLeads((rows) => rows.map((row) => (row.id === savedLead.id ? savedLead : row)));
    }
    setModal(null);
  };

  const selectedFunnel = funnelOptions.find((item) => item.id === selectedFunnelId);

  return (
    <PermissionGate permission="comercial.leads">
      <div
        className={`page-stack commercial-page${isMobile ? ' commercial-page--mobile' : ''}${
          kanbanLayoutActive ? ' commercial-page--kanban' : ''
        }${kanbanFullscreenActive ? ' commercial-page--kanban-fullscreen' : ''}`}
      >
        <PageHeader
          title="Funil de vendas"
          subtitle={
            kanbanFullscreenActive
              ? selectedFunnel?.name
                ? `Funil: ${selectedFunnel.name}`
                : undefined
              : 'Leads comerciais para academias e empresas.'
          }
          actions={
            <div className="commercial-header-actions">
              {!isMobile ? (
                <div className="commercial-view-toggle" role="group" aria-label="Visualização">
                  <button
                    type="button"
                    className={`commercial-view-toggle-btn${viewMode === 'funnel' ? ' commercial-view-toggle-btn--active' : ''}`}
                    onClick={() => setViewMode('funnel')}
                  >
                    Funil
                  </button>
                  <button
                    type="button"
                    className={`commercial-view-toggle-btn${viewMode === 'kanban' ? ' commercial-view-toggle-btn--active' : ''}`}
                    onClick={() => setViewMode('kanban')}
                  >
                    <LayoutGrid size={16} aria-hidden="true" />
                    Kanban
                  </button>
                </div>
              ) : null}
              {viewMode === 'kanban' && !isMobile ? (
                <button
                  type="button"
                  className={`commercial-view-toggle-btn commercial-kanban-fullscreen-btn${
                    kanbanFullscreenActive ? ' commercial-kanban-fullscreen-btn--active' : ''
                  }`}
                  onClick={toggleKanbanFullscreen}
                  aria-pressed={kanbanFullscreenActive}
                  title={kanbanFullscreenActive ? 'Sair da tela cheia' : 'Kanban em tela cheia'}
                >
                  {kanbanFullscreenActive ? (
                    <Minimize2 size={16} aria-hidden="true" />
                  ) : (
                    <Maximize2 size={16} aria-hidden="true" />
                  )}
                  <span>{kanbanFullscreenActive ? 'Sair' : 'Tela cheia'}</span>
                </button>
              ) : null}
              {canManage && !isMobile ? (
                <button type="button" className="btn-primary" onClick={() => setModal({ mode: 'create' })}>
                  Novo lead
                </button>
              ) : null}
            </div>
          }
        />

        <CrudAlerts error={error} />

        {!loading && leadSources.length && !kanbanFullscreenActive ? (
          <LeadSourcesLegend items={leadSources} />
        ) : null}

        {loading ? (
          <AppLoadingPanel label="Carregando funil…" />
        ) : viewMode === 'kanban' && !isMobile ? (
          <div className="commercial-kanban-shell" ref={kanbanShellRef}>
          <div className="commercial-kanban commercial-kanban--compact" aria-label="Kanban de leads">
            {stages.map((stage) => {
              const columnLeads = leadsByStage[stage.id] ?? [];
              return (
                <section
                  key={stage.id}
                  className={`commercial-kanban-column commercial-kanban-column--${stage.outcome}${stage.slug ? ` commercial-kanban-column--${stage.slug}` : ''}${dragOverStageId === stage.id ? ' commercial-kanban-column--drag-over' : ''}`}
                  aria-label={stageLabel(stage)}
                  onDragOver={canManage ? (ev) => onColumnDragOver(ev, stage.id) : undefined}
                  onDrop={canManage ? (ev) => onColumnDrop(ev, stage.id) : undefined}
                >
                  <header className="commercial-kanban-column-head">
                    <span className="commercial-kanban-column-title">{stageLabel(stage)}</span>
                    <span className="commercial-kanban-column-count">{columnLeads.length}</span>
                  </header>
                  <div
                    className="commercial-kanban-column-body"
                    onDragLeave={(ev) => {
                      if (ev.currentTarget.contains(ev.relatedTarget)) return;
                      setDragOverStageId('');
                    }}
                  >
                    {columnLeads.length === 0 ? (
                      <p className="commercial-empty-column">
                        {canManage
                          ? 'Nenhum lead nesta etapa. Arraste um card para cá.'
                          : 'Nenhum lead nesta etapa.'}
                      </p>
                    ) : (
                      columnLeads.map((lead) => (
                        <LeadKanbanCard
                          key={lead.id}
                          lead={lead}
                          stages={stages}
                          canManage={canManage}
                          busyId={busyLeadId}
                          dropStageId={stage.id}
                          dragging={draggingLeadId === lead.id}
                          onOpen={(row) => setModal({ mode: 'edit', lead: row })}
                          onStageChange={onStageChange}
                          onColumnDragOver={onColumnDragOver}
                          onColumnDrop={onColumnDrop}
                          onDragStart={() => {
                            setDraggingLeadId(lead.id);
                          }}
                          onDragEnd={() => {
                            setDraggingLeadId('');
                            setDragOverStageId('');
                          }}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          </div>
        ) : (
          <>
            <SalesFunnelOverview
              stages={stages}
              leadsByStage={leadsByStage}
              activeStageId={activeStageId}
              onSelectStage={setActiveStageId}
            />

            <StageTabBar
              stages={stages}
              leadsByStage={leadsByStage}
              activeStageId={activeStageId}
              onSelectStage={setActiveStageId}
            />

            <section className="commercial-funnel-stage-panel" aria-label={stageLabel(activeStage)}>
              <header className="commercial-funnel-stage-head">
                <h2>{stageLabel(activeStage)}</h2>
                {selectedFunnel ? <span>{selectedFunnel.name}</span> : null}
                <span>{activeStageLeads.length} lead(s)</span>
              </header>

              {activeStageLeads.length === 0 ? (
                <div className="commercial-funnel-empty panel">
                  <div className="panel-body">
                    <p>Nenhum lead nesta etapa.</p>
                    {canManage ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setModal({ mode: 'create' })}
                      >
                        Cadastrar lead
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="commercial-funnel-leads">
                  {activeStageLeads.map((lead) => (
                    <LeadQuickActions
                      key={lead.id}
                      lead={lead}
                      stages={stages}
                      canManage={canManage}
                      busyId={busyLeadId}
                      onOpen={(row) => setModal({ mode: 'edit', lead: row })}
                      onStageChange={onStageChange}
                      onConvert={onConvertLead}
                      onRecordInteraction={onRecordInteraction}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {canManage && isMobile ? (
          <button
            type="button"
            className="commercial-fab"
            aria-label="Novo lead"
            onClick={() => setModal({ mode: 'create' })}
          >
            <Plus size={24} aria-hidden="true" />
          </button>
        ) : null}

        {modal ? (
          <LeadModal
            key={modal.mode === 'create' ? 'create' : modal.lead?.id}
            mode={modal.mode}
            lead={modal.lead}
            stages={stages}
            adminUsers={adminUsers}
            currentUserId={user?.id}
            defaultFunnelId={selectedFunnelId}
            canManage={canManage}
            onClose={() => setModal(null)}
            onSaved={onSaved}
            onUpdated={onLeadUpdated}
            onDeleted={onLeadDeleted}
            onRequestMarkLost={onRequestMarkLost}
          />
        ) : null}

        {markLostModal ? (
          <LeadMarkLostModal
            lead={markLostModal.lead}
            stageLabel={stageLabel(stages.find((stage) => stage.id === markLostModal.stageId))}
            reasons={lossReasons}
            busy={busyLeadId === markLostModal.lead?.id}
            onClose={() => setMarkLostModal(null)}
            onConfirm={onConfirmMarkLost}
          />
        ) : null}
      </div>
    </PermissionGate>
  );
}
