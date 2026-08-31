import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  addSupportTicketMessage,
  fetchSupportCatalog,
  fetchSupportStats,
  fetchSupportTicket,
  fetchSupportTickets,
  updateSupportTicket,
} from '../api/support.js';
import { CrudListToolbar, CrudPagination } from '../components/crud/CrudListToolbar.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSupport } from '../components/support/SupportContext.jsx';
import { booleanFilter, hasFilterValue, selectFilter } from '../crud/filterUtils.js';
import { formatRelativeTime } from '../utils/relativeTime.js';
import { useFlashMessage } from '../components/flash/FlashMessageProvider.jsx';
import '../styles/support.css';

const SOURCE_LABELS = {
  admin: 'Admin',
  partner: 'Parceiro',
  corporate: 'Corporativo',
  app: 'App',
};

const DEFAULT_PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { key: 'updatedAt', direction: 'desc', label: 'Mais recentes' },
  { key: 'priority', direction: 'asc', label: 'Prioridade' },
  { key: 'createdAt', direction: 'desc', label: 'Abertura' },
];

const DEFAULT_FIELD_FILTERS = [{ id: 'visibility', value: 'open' }];

function mergeFieldFilters(defaultFieldFilters, fieldFilters, suppressedDefaultIds) {
  const merged = [];

  for (const defaultFilter of defaultFieldFilters) {
    if (suppressedDefaultIds.has(defaultFilter.id)) continue;
    const userFilter = fieldFilters.find((item) => item.id === defaultFilter.id);
    merged.push(userFilter ?? defaultFilter);
  }

  for (const filter of fieldFilters) {
    if (defaultFieldFilters.some((item) => item.id === filter.id)) continue;
    merged.push(filter);
  }

  return merged;
}

function readSelectFilter(filters, id) {
  const match = filters.find((item) => item.id === id);
  return match?.value ?? '';
}

function statusClass(status) {
  return `support-status-badge support-status-badge--${status}`;
}

function priorityClass(priority) {
  return `support-priority-badge support-priority-badge--${priority}`;
}

function queueBadgeStyle(color) {
  const value = color || '#64748b';
  return {
    backgroundColor: `${value}1a`,
    color: value,
    border: `1px solid ${value}33`,
  };
}

function SupportStatCard({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      className={`support-stat-card${active ? ' is-active' : ''}`}
      onClick={onClick}
    >
      <span className="support-stat-value">{value}</span>
      <span className="support-stat-label">{label}</span>
    </button>
  );
}

function SupportQueueItem({ item, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`support-queue-item${selected ? ' is-active' : ''}`}
      onClick={() => onSelect(item.id)}
    >
      <div className="support-queue-item-head">
        <strong>{item.code}</strong>
        <span>{formatRelativeTime(item.updatedAt)}</span>
      </div>
      <div className="support-queue-item-title">{item.subject}</div>
      <div className="support-queue-item-meta">
        <span className="support-queue-badge" style={queueBadgeStyle(item.queueColor)}>
          {item.queueLabel}
        </span>
        <span className={statusClass(item.status)}>{item.statusLabel}</span>
        <span className={priorityClass(item.priority)}>{item.priorityLabel}</span>
        <span className="support-source-badge">{SOURCE_LABELS[item.source] ?? item.source}</span>
        {item.messageCount > 0 ? (
          <span className="support-message-count">{item.messageCount} msg</span>
        ) : null}
      </div>
      <div className="support-queue-item-foot">
        <span>{item.requesterName}</span>
        {item.assignedToName ? <span>· {item.assignedToName}</span> : null}
      </div>
    </button>
  );
}

export function SupportTicketsPage() {
  const flash = useFlashMessage();
  const { user, hasPermission } = useAuth();
  const { openSupport } = useSupport();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = hasPermission('atendimento.chamados.manage');
  const queueFilter = useMemo(() => searchParams.get('queue') ?? '', [searchParams]);

  const [catalog, setCatalog] = useState({ statuses: [], priorities: [], sources: [], queues: [] });
  const activeQueues = useMemo(() => catalog.queues ?? [], [catalog.queues]);
  const currentQueue = useMemo(
    () => activeQueues.find((item) => item.value === queueFilter) ?? null,
    [activeQueues, queueFilter],
  );
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fieldFilters, setFieldFilters] = useState([]);
  const [suppressedDefaultFilterIds, setSuppressedDefaultFilterIds] = useState(new Set());
  const [sortKey, setSortKey] = useState('updatedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const selectedId = searchParams.get('id') ?? '';
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filterDefinitions = useMemo(() => {
    const definitions = [
      selectFilter('status', 'Status', 'status', catalog.statuses ?? []),
      selectFilter('priority', 'Prioridade', 'priority', catalog.priorities ?? []),
      selectFilter('visibility', 'Exibição', 'visibility', [
        { value: 'open', label: 'Somente em aberto' },
        { value: 'all', label: 'Incluir encerrados' },
      ]),
    ];

    if (canManage) {
      definitions.push(
        selectFilter('source', 'Origem', 'source', catalog.sources ?? []),
        selectFilter('scope', 'Escopo', 'scope', [
          { value: 'all', label: 'Todos os chamados' },
          { value: 'mine', label: 'Meus chamados' },
        ]),
        booleanFilter('assignedToMe', 'Atribuição', 'assignedToMe', {
          trueLabel: 'Atribuídos a mim',
          falseLabel: 'Sem filtro de responsável',
        }),
      );
    }

    return definitions;
  }, [catalog, canManage]);

  const effectiveFieldFilters = useMemo(
    () => mergeFieldFilters(DEFAULT_FIELD_FILTERS, fieldFilters, suppressedDefaultFilterIds),
    [fieldFilters, suppressedDefaultFilterIds],
  );

  const statusFilter = readSelectFilter(effectiveFieldFilters, 'status');
  const priorityFilter = readSelectFilter(effectiveFieldFilters, 'priority');
  const sourceFilter = readSelectFilter(effectiveFieldFilters, 'source');
  const visibilityFilter = readSelectFilter(effectiveFieldFilters, 'visibility');
  const openOnly = visibilityFilter !== 'all';
  const scope = canManage ? readSelectFilter(effectiveFieldFilters, 'scope') || 'all' : 'mine';
  const assignedToMe = effectiveFieldFilters.some(
    (item) => item.id === 'assignedToMe' && item.value === true,
  );
  const apiSort = sortKey;

  const applyFieldFilter = useCallback((filter) => {
    const definition = filterDefinitions.find((item) => item.id === filter.id);
    if (!definition || !hasFilterValue(filter, definition)) return;

    setSuppressedDefaultFilterIds((current) => {
      if (!current.has(filter.id)) return current;
      const next = new Set(current);
      next.delete(filter.id);
      return next;
    });

    setFieldFilters((current) => {
      const next = current.filter((item) => item.id !== filter.id);
      next.push(filter);
      return next;
    });
    setPage(1);
  }, [filterDefinitions]);

  const removeFieldFilter = useCallback((id) => {
    const hasUserFilter = fieldFilters.some((item) => item.id === id);
    const hasDefaultFilter = DEFAULT_FIELD_FILTERS.some((item) => item.id === id);

    if (hasUserFilter) {
      setFieldFilters((current) => current.filter((item) => item.id !== id));
    } else if (hasDefaultFilter) {
      setSuppressedDefaultFilterIds((current) => new Set(current).add(id));
    }
    setPage(1);
  }, [fieldFilters]);

  const clearFieldFilters = useCallback(() => {
    setFieldFilters([]);
    setSuppressedDefaultFilterIds(new Set());
    setPage(1);
  }, []);

  const applyQuickFilter = useCallback((patch) => {
    setFieldFilters((current) => {
      let next = [...current];
      for (const [id, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === '') {
          next = next.filter((item) => item.id !== id);
          continue;
        }
        const index = next.findIndex((item) => item.id === id);
        const entry = { id, value };
        if (index === -1) next.push(entry);
        else next[index] = entry;
      }
      return next;
    });
    setSuppressedDefaultFilterIds((current) => {
      const next = new Set(current);
      for (const id of Object.keys(patch)) {
        next.delete(id);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    scope,
    queueFilter,
    statusFilter,
    priorityFilter,
    sourceFilter,
    openOnly,
    assignedToMe,
    searchQuery,
    sortKey,
    sortDirection,
    pageSize,
  ]);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchSupportStats({ queue: queueFilter || undefined });
      setStats(data);
    } catch {
      setStats(null);
    }
  }, [queueFilter]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSupportTickets({
        mineOnly: scope !== 'all',
        queue: queueFilter || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        source: sourceFilter || undefined,
        openOnly,
        assignedToMe: canManage && assignedToMe,
        q: searchQuery || undefined,
        sort: apiSort,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === 'number' ? data.total : 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    scope,
    queueFilter,
    statusFilter,
    priorityFilter,
    sourceFilter,
    openOnly,
    assignedToMe,
    searchQuery,
    apiSort,
    page,
    pageSize,
    canManage,
  ]);

  const loadDetail = useCallback(
    async (ticketId) => {
      if (!ticketId) {
        setDetail(null);
        return;
      }
      setDetailLoading(true);
      try {
        const data = await fetchSupportTicket(ticketId);
        setDetail(data);
      } catch (err) {
        flash.error(err.message);
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [flash],
  );

  useEffect(() => {
    fetchSupportCatalog().then(setCatalog).catch(() => {});
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const selectTicket = (ticketId) => {
    const next = new URLSearchParams(searchParams);
    if (ticketId) next.set('id', ticketId);
    else next.delete('id');
    setSearchParams(next);
  };

  const setQueueFilter = (queue) => {
    const next = new URLSearchParams(searchParams);
    if (queue) next.set('queue', queue);
    else next.delete('queue');
    next.delete('id');
    setSearchParams(next);
  };

  const refreshAll = async () => {
    await Promise.all([loadList(), loadStats(), selectedId ? loadDetail(selectedId) : Promise.resolve()]);
  };

  const onReply = async () => {
    if (!detail?.id || !reply.trim()) return;
    setSaving(true);
    try {
      const updated = await addSupportTicketMessage(detail.id, {
        body: reply.trim(),
        isInternal: canManage && internalNote,
      });
      setDetail(updated);
      setReply('');
      setInternalNote(false);
      await refreshAll();
      flash.success('Mensagem enviada.');
    } catch (err) {
      flash.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onUpdateTicket = async (patch) => {
    if (!detail?.id) return;
    setSaving(true);
    try {
      const updated = await updateSupportTicket(detail.id, patch);
      setDetail(updated);
      await refreshAll();
      flash.success('Chamado atualizado.');
    } catch (err) {
      flash.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onAssumeTicket = () => {
    if (!detail?.id || !user?.id) return;
    onUpdateTicket({
      status: 'in_progress',
      assignedToUserId: user.id,
    });
  };

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? detail,
    [items, selectedId, detail],
  );

  return (
    <div className="page support-page">
      <PageHeader
        title={currentQueue?.label ?? 'Todos os chamados'}
        subtitle={
          currentQueue?.description ||
          'Central de solicitações da plataforma — parceiros, corporativo e admin.'
        }
        actions={
          <button type="button" className="btn-primary btn-sm" onClick={() => openSupport()}>
            <Plus size={16} aria-hidden="true" />
            Novo chamado
          </button>
        }
      />

      <div className="notifications-filter support-queue-tabs" role="tablist" aria-label="Filas">
        {[
          { value: '', label: 'Todos', count: stats?.total },
          ...activeQueues.map((queue) => ({
            value: queue.value,
            label: queue.label,
            count: stats?.byQueue?.[queue.value]?.open,
          })),
        ].map((option) => (
          <button
            key={option.value || 'all'}
            type="button"
            className={`notifications-filter-btn${queueFilter === option.value ? ' is-active' : ''}`}
            onClick={() => setQueueFilter(option.value)}
          >
            {option.label}
            {typeof option.count === 'number' ? (
              <span className="support-queue-tab-count">{option.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {stats ? (
        <div className="support-stats-grid">
          <SupportStatCard
            label="Abertos"
            value={stats.open ?? 0}
            active={statusFilter === 'open' && !assignedToMe}
            onClick={() => {
              applyQuickFilter({
                status: 'open',
                assignedToMe: null,
                visibility: 'open',
              });
            }}
          />
          <SupportStatCard
            label="Em atendimento"
            value={stats.inProgress ?? 0}
            active={statusFilter === 'in_progress'}
            onClick={() => {
              applyQuickFilter({ status: 'in_progress', visibility: 'open' });
            }}
          />
          <SupportStatCard
            label="Aguardando resposta"
            value={stats.waitingRequester ?? 0}
            active={statusFilter === 'waiting_requester'}
            onClick={() => {
              applyQuickFilter({ status: 'waiting_requester', visibility: 'open' });
            }}
          />
          {canManage ? (
            <SupportStatCard
              label="Urgentes"
              value={stats.urgent ?? 0}
              active={priorityFilter === 'urgent'}
              onClick={() => {
                applyQuickFilter({ priority: 'urgent', visibility: 'open' });
              }}
            />
          ) : null}
          {canManage ? (
            <SupportStatCard
              label="Atribuídos a mim"
              value={stats.assignedToMe ?? 0}
              active={assignedToMe}
              onClick={() => {
                applyQuickFilter({
                  assignedToMe: true,
                  status: null,
                  visibility: 'open',
                });
              }}
            />
          ) : null}
        </div>
      ) : null}

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="support-workbench">
        <section className="panel support-queue-panel">
          <div className="panel-header">
            <h2>{currentQueue?.label ?? 'Fila'}</h2>
            <span className="panel-meta">{total} chamado(s)</span>
          </div>

          <div className="panel-body support-queue-toolbar">
            <CrudListToolbar
              query={query}
              onQueryChange={setQuery}
              placeholder="Buscar por código, assunto ou solicitante…"
              sortKey={sortKey}
              sortDirection={sortDirection}
              sortOptions={SORT_OPTIONS}
              onSortChange={(key, direction) => {
                setSortKey(key);
                setSortDirection(direction);
              }}
              pageSize={pageSize}
              onPageSizeChange={(value) => setPageSize(Number(value))}
              filterDefinitions={filterDefinitions}
              fieldFilters={effectiveFieldFilters}
              onApplyFieldFilter={applyFieldFilter}
              onRemoveFieldFilter={removeFieldFilter}
              onClearFieldFilters={clearFieldFilters}
            />
          </div>

          <div className="panel-body panel-body-flush support-queue-body">
            {loading ? <div className="support-empty-state">Carregando fila…</div> : null}
            {!loading && items.length === 0 ? (
              <div className="support-empty-state">
                Nenhum chamado encontrado com os filtros atuais.
              </div>
            ) : null}
            {!loading && items.length > 0 ? (
              <div className="support-queue-list">
                {items.map((item) => (
                  <SupportQueueItem
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    onSelect={selectTicket}
                  />
                ))}
              </div>
            ) : null}
          </div>
          {!loading && total > 0 ? (
            <div className="panel-body crud-pagination-wrap">
              <CrudPagination
                page={page}
                pageSize={pageSize}
                totalItems={total}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </section>

        <section className="panel support-detail-panel">
          <div className="panel-header support-detail-head">
            <div>
              <h2>{selectedItem?.code ?? 'Detalhe'}</h2>
              {selectedItem ? (
                <div className="support-detail-badges">
                  <span className="support-queue-badge" style={queueBadgeStyle(selectedItem.queueColor)}>
                    {selectedItem.queueLabel}
                  </span>
                  <span className={statusClass(selectedItem.status)}>{selectedItem.statusLabel}</span>
                  <span className={priorityClass(selectedItem.priority)}>
                    {selectedItem.priorityLabel}
                  </span>
                  <span className="support-source-badge">
                    {SOURCE_LABELS[selectedItem.source] ?? selectedItem.source}
                  </span>
                </div>
              ) : null}
            </div>
            {canManage && detail && !detail.assignedToUserId && detail.status === 'open' ? (
              <button type="button" className="btn-ghost btn-sm" disabled={saving} onClick={onAssumeTicket}>
                Assumir chamado
              </button>
            ) : null}
          </div>
          <div className="panel-body support-detail-body">
            {!selectedId ? (
              <div className="support-empty-state">Selecione um chamado na fila para ver detalhes.</div>
            ) : null}
            {selectedId && detailLoading ? (
              <div className="support-empty-state">Carregando chamado…</div>
            ) : null}
            {detail ? (
              <div className="support-detail-grid">
                <div className="support-detail-summary">
                  <h3>{detail.subject}</h3>
                  <p className="support-detail-description">{detail.description}</p>
                  <div className="support-detail-requester">
                    <strong>{detail.requesterName}</strong>
                    <span>{detail.requesterEmail}</span>
                  </div>
                  {detail.assignedToName ? (
                    <div className="muted">Responsável: {detail.assignedToName}</div>
                  ) : null}
                  {detail.contextLabel ? (
                    <div className="support-context-chip">
                      <span className="support-context-label">Contexto</span>
                      <strong>{detail.contextLabel}</strong>
                      {detail.contextUrl ? <small>{detail.contextUrl}</small> : null}
                    </div>
                  ) : null}
                </div>

                <PermissionGate permission="atendimento.chamados.manage">
                  <div className="support-form-grid">
                    <label className="field-block">
                      <span className="field-label">Fila</span>
                      <select
                        value={detail.queue}
                        disabled={saving}
                        onChange={(ev) => onUpdateTicket({ queue: ev.target.value })}
                      >
                        {(catalog.queues ?? []).map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-block">
                      <span className="field-label">Status</span>
                      <select
                        value={detail.status}
                        disabled={saving}
                        onChange={(ev) => onUpdateTicket({ status: ev.target.value })}
                      >
                        {(catalog.statuses ?? []).map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-block">
                      <span className="field-label">Prioridade</span>
                      <select
                        value={detail.priority}
                        disabled={saving}
                        onChange={(ev) => onUpdateTicket({ priority: ev.target.value })}
                      >
                        {(catalog.priorities ?? []).map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </PermissionGate>

                <div className="support-message-list">
                  {(detail.messages ?? []).map((message) => (
                    <article
                      key={message.id}
                      className={`support-message${message.isInternal ? ' support-message--internal' : ''}`}
                    >
                      <div className="support-message-head">
                        <strong>{message.authorName}</strong>
                        <span>{formatRelativeTime(message.createdAt)}</span>
                      </div>
                      <div className="support-message-body">{message.body}</div>
                    </article>
                  ))}
                </div>

                {!['resolved', 'closed'].includes(detail.status) ? (
                  <div className="support-reply-box">
                    <label className="field-block">
                      <span className="field-label">Responder</span>
                      <textarea
                        className="input"
                        rows={4}
                        value={reply}
                        onChange={(ev) => setReply(ev.target.value)}
                        placeholder="Escreva uma atualização para o solicitante."
                      />
                    </label>
                    <PermissionGate permission="atendimento.chamados.manage">
                      <label className="permission-checkbox">
                        <input
                          type="checkbox"
                          checked={internalNote}
                          onChange={(ev) => setInternalNote(ev.target.checked)}
                        />
                        <span>Nota interna (visível só para a equipe)</span>
                      </label>
                    </PermissionGate>
                    <div>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={saving || !reply.trim()}
                        onClick={onReply}
                      >
                        Enviar mensagem
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
