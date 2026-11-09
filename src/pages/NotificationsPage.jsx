import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BellOff, CheckCheck, ExternalLink, Inbox, RefreshCw, Search, X } from 'lucide-react';
import {
  fetchNotifications,
  fetchNotificationTriggers,
  markAllNotificationsRead,
  markManyNotificationsRead,
  markNotificationRead,
} from '../api/notifications.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { NotificationRow, SeverityIcon } from '../components/notifications/NotificationRow.jsx';
import {
  formatFullDate,
  groupNotificationsByDay,
  normalizeSeverity,
  SEVERITY_META,
} from '../utils/notificationGroups.js';
import { notificationTriggerLabel } from '../utils/notificationTriggers.js';
import { formatRelativeTime } from '../utils/relativeTime.js';
import '../styles/notifications.css';

const PAGE_SIZE = 50;

const SEVERITY_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'info', label: SEVERITY_META.info.label },
  { value: 'success', label: SEVERITY_META.success.label },
  { value: 'warning', label: SEVERITY_META.warning.label },
  { value: 'error', label: SEVERITY_META.error.label },
];

function isToday(iso) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [triggers, setTriggers] = useState([]);

  const [status, setStatus] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [triggerKey, setTriggerKey] = useState('');
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchNotifications({ unreadOnly: status === 'unread', limit: PAGE_SIZE, offset: 0 });
      const rows = Array.isArray(data.items) ? data.items : [];
      setItems(rows);
      setHasMore(rows.length === PAGE_SIZE);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
      setChecked(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchNotificationTriggers()
      .then((data) => setTriggers(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []))
      .catch(() => setTriggers([]));
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await fetchNotifications({
        unreadOnly: status === 'unread',
        limit: PAGE_SIZE,
        offset: items.length,
      });
      const rows = Array.isArray(data.items) ? data.items : [];
      setItems((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const triggerLabels = useMemo(
    () => Object.fromEntries(triggers.map((t) => [t.key, t.label])),
    [triggers],
  );
  const triggerByKey = useMemo(() => Object.fromEntries(triggers.map((t) => [t.key, t])), [triggers]);

  const triggerOptions = useMemo(() => {
    const byCategory = new Map();
    const keys = new Set([...triggers.map((t) => t.key), ...items.map((i) => i.triggerKey).filter(Boolean)]);
    for (const key of keys) {
      const t = triggerByKey[key];
      const category = t?.category ?? 'Outros';
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push({ key, label: t?.label ?? notificationTriggerLabel(key) });
    }
    return [...byCategory.entries()];
  }, [triggers, triggerByKey, items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (severity !== 'all' && normalizeSeverity(item.severity) !== severity) return false;
      if (triggerKey && item.triggerKey !== triggerKey) return false;
      if (q && !`${item.title ?? ''} ${item.body ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, severity, triggerKey, query]);

  const groups = useMemo(() => groupNotificationsByDay(filtered), [filtered]);
  const selected = useMemo(
    () => items.find((i) => String(i.id) === String(selectedId)) ?? null,
    [items, selectedId],
  );

  const stats = useMemo(
    () => ({
      today: items.filter((i) => isToday(i.createdAt)).length,
      alerts: items.filter((i) => ['warning', 'error'].includes(normalizeSeverity(i.severity))).length,
    }),
    [items],
  );

  const markLocalRead = (ids) => {
    const now = new Date().toISOString();
    const set = new Set(ids.map(String));
    setItems((rows) => rows.map((row) => (set.has(String(row.id)) ? { ...row, readAt: row.readAt ?? now } : row)));
  };

  const markRead = async (item) => {
    if (item.readAt) return;
    try {
      await markNotificationRead(item.id);
      setUnreadCount((count) => Math.max(0, count - 1));
      markLocalRead([item.id]);
    } catch (err) {
      setError(err.message);
    }
  };

  const openItem = (item) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('id', String(item.id));
      return next;
    });
    markRead(item);
  };

  const closeDetail = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('id');
      return next;
    });
  };

  const toggleCheck = (item) => {
    setChecked((prev) => {
      const next = new Set(prev);
      const key = String(item.id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allVisibleChecked = filtered.length > 0 && filtered.every((i) => checked.has(String(i.id)));
  const toggleAllVisible = () => {
    setChecked(allVisibleChecked ? new Set() : new Set(filtered.map((i) => String(i.id))));
  };

  const markCheckedRead = async () => {
    const ids = items.filter((i) => checked.has(String(i.id)) && !i.readAt).map((i) => i.id);
    if (ids.length === 0) {
      setChecked(new Set());
      return;
    }
    try {
      await markManyNotificationsRead(ids);
      setUnreadCount((count) => Math.max(0, count - ids.length));
      markLocalRead(ids);
      setChecked(new Set());
    } catch (err) {
      setError(err.message);
    }
  };

  const onMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      markLocalRead(items.map((i) => i.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const hasFilters = severity !== 'all' || triggerKey || query.trim();
  const clearFilters = () => {
    setSeverity('all');
    setTriggerKey('');
    setQuery('');
  };

  const selectedTrigger = selected?.triggerKey ? triggerByKey[selected.triggerKey] : null;

  return (
    <div className="page notifications-page">
      <PageHeader
        title="Notificações"
        subtitle="Central de alertas da plataforma: chamados, atribuições e mudanças de status."
        actions={
          <div className="notif-page-actions">
            <button type="button" className="btn-ghost" onClick={load} disabled={loading}>
              <RefreshCw size={15} aria-hidden="true" className={loading ? 'is-spinning' : ''} />
              Atualizar
            </button>
            {unreadCount > 0 ? (
              <button type="button" className="btn-primary btn-sm" onClick={onMarkAllRead}>
                <CheckCheck size={16} aria-hidden="true" />
                Marcar todas como lidas
              </button>
            ) : null}
          </div>
        }
      />

      <section className="notif-stats" aria-label="Resumo">
        <button
          type="button"
          className={`notif-stat${status === 'unread' ? ' is-active' : ''}`}
          onClick={() => setStatus(status === 'unread' ? 'all' : 'unread')}
        >
          <span className="notif-stat-value">{unreadCount}</span>
          <span className="notif-stat-label">Não lidas</span>
        </button>
        <div className="notif-stat">
          <span className="notif-stat-value">{stats.today}</span>
          <span className="notif-stat-label">Recebidas hoje</span>
        </div>
        <button
          type="button"
          className={`notif-stat${severity === 'warning' ? ' is-active' : ''}`}
          onClick={() => setSeverity(severity === 'warning' ? 'all' : 'warning')}
        >
          <span className="notif-stat-value">{stats.alerts}</span>
          <span className="notif-stat-label">Atenção e erros</span>
        </button>
        <div className="notif-stat">
          <span className="notif-stat-value">{items.length}</span>
          <span className="notif-stat-label">Carregadas{hasMore ? ' (há mais)' : ''}</span>
        </div>
      </section>

      <div className="notif-toolbar">
        <div className="notif-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            placeholder="Buscar por título ou conteúdo"
            aria-label="Buscar notificações"
          />
        </div>

        <div className="notif-tabs" role="tablist" aria-label="Status">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'unread', label: 'Não lidas', count: unreadCount },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={status === option.value}
              className={`notif-tab${status === option.value ? ' is-active' : ''}`}
              onClick={() => setStatus(option.value)}
            >
              {option.label}
              {option.count ? <span className="notif-tab-count">{option.count}</span> : null}
            </button>
          ))}
        </div>

        <div className="notif-chips" role="group" aria-label="Severidade">
          {SEVERITY_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`notif-chip${severity === option.value ? ' is-active' : ''}`}
              aria-pressed={severity === option.value}
              onClick={() => setSeverity(option.value)}
            >
              {option.value !== 'all' ? <SeverityIcon severity={option.value} size={13} /> : null}
              {option.label}
            </button>
          ))}
        </div>

        <select
          className="notif-select"
          value={triggerKey}
          onChange={(ev) => setTriggerKey(ev.target.value)}
          aria-label="Tipo de notificação"
        >
          <option value="">Todos os tipos</option>
          {triggerOptions.map(([category, options]) => (
            <optgroup key={category} label={category}>
              {options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {hasFilters ? (
          <button type="button" className="notif-link-btn" onClick={clearFilters}>
            <X size={14} aria-hidden="true" />
            Limpar filtros
          </button>
        ) : null}
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className={`notif-workspace${selected ? ' has-detail' : ''}`}>
        <section className="panel notif-list-panel" aria-label="Lista de notificações">
          <div className="notif-list-head">
            <label className="notif-row-check">
              <input
                type="checkbox"
                checked={allVisibleChecked}
                onChange={toggleAllVisible}
                disabled={filtered.length === 0}
                aria-label="Selecionar todas as visíveis"
              />
            </label>
            {checked.size > 0 ? (
              <div className="notif-bulk">
                <strong>{checked.size} selecionada{checked.size === 1 ? '' : 's'}</strong>
                <button type="button" className="btn-ghost btn-sm" onClick={markCheckedRead}>
                  <CheckCheck size={14} aria-hidden="true" />
                  Marcar como lidas
                </button>
                <button type="button" className="notif-link-btn" onClick={() => setChecked(new Set())}>
                  Limpar seleção
                </button>
              </div>
            ) : (
              <span className="notif-list-count">
                {filtered.length} {filtered.length === 1 ? 'notificação' : 'notificações'}
                {hasFilters ? ' com os filtros aplicados' : ''}
              </span>
            )}
          </div>

          <div className="notif-list-body">
            {loading ? (
              <div className="notif-skeleton" aria-label="Carregando">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="notif-skeleton-row" />
                ))}
              </div>
            ) : null}

            {!loading && filtered.length === 0 ? (
              <div className="notif-empty">
                <span className="notif-empty-icon">
                  <BellOff size={22} aria-hidden="true" />
                </span>
                <strong>
                  {hasFilters
                    ? 'Nada encontrado com esses filtros'
                    : status === 'unread'
                      ? 'Você leu todas as notificações'
                      : 'Nenhuma notificação registrada ainda'}
                </strong>
                <span>
                  {hasFilters
                    ? 'Ajuste a busca, a severidade ou o tipo para ver mais resultados.'
                    : 'Quando houver chamados novos, mensagens ou mudanças de status, eles aparecem aqui.'}
                </span>
                {hasFilters ? (
                  <button type="button" className="btn-ghost btn-sm" onClick={clearFilters}>
                    Limpar filtros
                  </button>
                ) : null}
              </div>
            ) : null}

            {!loading
              ? groups.map((group) => (
                  <section key={group.key} className="notif-group" aria-label={group.label}>
                    <h3 className="notif-group-title">
                      {group.label}
                      <span>{group.items.length}</span>
                    </h3>
                    {group.items.map((item) => (
                      <NotificationRow
                        key={item.id}
                        item={item}
                        triggerLabels={triggerLabels}
                        selected={String(item.id) === String(selectedId)}
                        checked={checked.has(String(item.id))}
                        onToggleCheck={toggleCheck}
                        onOpen={openItem}
                        onMarkRead={markRead}
                      />
                    ))}
                  </section>
                ))
              : null}

            {!loading && hasMore ? (
              <div className="notif-more">
                <button type="button" className="btn-ghost" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Carregando…' : 'Carregar mais'}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="panel notif-detail" aria-label="Detalhes da notificação">
          {selected ? (
            <>
              <header className="notif-detail-head">
                <div className={`notif-detail-sev notif-detail-sev--${normalizeSeverity(selected.severity)}`}>
                  <SeverityIcon severity={selected.severity} size={14} />
                  {SEVERITY_META[normalizeSeverity(selected.severity)].label}
                </div>
                <button type="button" className="notif-icon-btn" onClick={closeDetail} aria-label="Fechar detalhes">
                  <X size={18} aria-hidden="true" />
                </button>
              </header>

              <h2 className="notif-detail-title">{selected.title}</h2>
              {selected.body ? <p className="notif-detail-body">{selected.body}</p> : null}

              <dl className="notif-detail-meta">
                <div>
                  <dt>Tipo</dt>
                  <dd>
                    {selected.triggerKey
                      ? selectedTrigger?.label ?? notificationTriggerLabel(selected.triggerKey)
                      : '—'}
                  </dd>
                </div>
                {selectedTrigger?.category ? (
                  <div>
                    <dt>Categoria</dt>
                    <dd>{selectedTrigger.category}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Recebida</dt>
                  <dd>
                    {formatFullDate(selected.createdAt)}
                    <span className="notif-detail-rel">{formatRelativeTime(selected.createdAt)}</span>
                  </dd>
                </div>
                <div>
                  <dt>Lida</dt>
                  <dd>{selected.readAt ? formatFullDate(selected.readAt) : 'Não lida'}</dd>
                </div>
              </dl>

              {selectedTrigger?.description ? (
                <p className="notif-detail-hint">{selectedTrigger.description}</p>
              ) : null}

              <div className="notif-detail-actions">
                {selected.actionUrl ? (
                  <button type="button" className="btn-primary" onClick={() => navigate(selected.actionUrl)}>
                    <ExternalLink size={16} aria-hidden="true" />
                    Abrir item relacionado
                  </button>
                ) : null}
                {!selected.readAt ? (
                  <button type="button" className="btn-ghost" onClick={() => markRead(selected)}>
                    <CheckCheck size={15} aria-hidden="true" />
                    Marcar como lida
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="notif-detail-empty">
              <span className="notif-empty-icon">
                <Inbox size={22} aria-hidden="true" />
              </span>
              <strong>Selecione uma notificação</strong>
              <span>Os detalhes, a data completa e o atalho para o item relacionado aparecem aqui.</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
