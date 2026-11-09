import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, Maximize2, RefreshCw, X } from 'lucide-react';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications.js';
import { groupNotificationsByDay } from '../utils/notificationGroups.js';
import { NotificationRow } from './notifications/NotificationRow.jsx';
import '../styles/notifications.css';

const PREVIEW_LIMIT = 30;

/**
 * Sino + painel lateral de notificações (altura total da tela).
 * Para triagem completa, filtros e detalhes: /m/notificacoes.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');

  const refreshCount = useCallback(async () => {
    try {
      const count = await fetchUnreadNotificationCount();
      const value = typeof count === 'number' ? count : count?.count;
      setUnreadCount(typeof value === 'number' ? value : 0);
    } catch {
      /* ignore polling errors */
    }
  }, []);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchNotifications({ limit: PREVIEW_LIMIT, unreadOnly: tab === 'unread' });
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch (err) {
      setItems([]);
      setError(err.message || 'Não foi possível carregar as notificações.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, 60_000);
    return () => window.clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return undefined;
    loadPreview();
    const onKey = (ev) => {
      if (ev.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('notif-drawer-open');
    window.requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('notif-drawer-open');
    };
  }, [open, loadPreview]);

  const groups = useMemo(() => groupNotificationsByDay(items), [items]);

  const markRead = async (item) => {
    if (item.readAt) return;
    try {
      await markNotificationRead(item.id);
      setUnreadCount((count) => Math.max(0, count - 1));
      setItems((rows) =>
        tab === 'unread'
          ? rows.filter((row) => row.id !== item.id)
          : rows.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)),
      );
    } catch {
      /* ignore */
    }
  };

  const onOpenItem = async (item) => {
    await markRead(item);
    if (item.actionUrl) {
      setOpen(false);
      navigate(item.actionUrl);
    } else {
      setOpen(false);
      navigate(`/m/notificacoes?id=${encodeURIComponent(item.id)}`);
    }
  };

  const onMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setItems((rows) =>
        tab === 'unread' ? [] : rows.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })),
      );
    } catch (err) {
      setError(err.message || 'Não foi possível marcar como lidas.');
    }
  };

  return (
    <div className="notification-bell">
      <button
        ref={triggerRef}
        type="button"
        className={`notification-bell-trigger${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="notif-drawer"
        aria-label={unreadCount ? `${unreadCount} notificações não lidas` : 'Notificações'}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="notification-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="notif-drawer-backdrop"
            aria-label="Fechar notificações"
            onClick={() => setOpen(false)}
          />
          <aside
            id="notif-drawer"
            ref={panelRef}
            tabIndex={-1}
            className="notif-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-drawer-title"
          >
            <header className="notif-drawer-head">
              <div className="notif-drawer-heading">
                <h2 id="notif-drawer-title">Notificações</h2>
                <p>
                  {unreadCount > 0
                    ? `${unreadCount} não ${unreadCount === 1 ? 'lida' : 'lidas'}`
                    : 'Tudo em dia'}
                </p>
              </div>
              <div className="notif-drawer-tools">
                <button
                  type="button"
                  className="notif-icon-btn"
                  onClick={loadPreview}
                  title="Atualizar"
                  aria-label="Atualizar notificações"
                >
                  <RefreshCw size={16} aria-hidden="true" className={loading ? 'is-spinning' : ''} />
                </button>
                <Link
                  to="/m/notificacoes"
                  className="notif-icon-btn"
                  onClick={() => setOpen(false)}
                  title="Abrir central de notificações"
                  aria-label="Abrir central de notificações"
                >
                  <Maximize2 size={16} aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  className="notif-icon-btn"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="notif-drawer-bar">
              <div className="notif-tabs" role="tablist" aria-label="Filtrar">
                {[
                  { value: 'all', label: 'Todas' },
                  { value: 'unread', label: 'Não lidas', count: unreadCount },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={tab === option.value}
                    className={`notif-tab${tab === option.value ? ' is-active' : ''}`}
                    onClick={() => setTab(option.value)}
                  >
                    {option.label}
                    {option.count ? <span className="notif-tab-count">{option.count}</span> : null}
                  </button>
                ))}
              </div>
              {unreadCount > 0 ? (
                <button type="button" className="notif-link-btn" onClick={onMarkAllRead}>
                  <CheckCheck size={14} aria-hidden="true" />
                  Marcar todas como lidas
                </button>
              ) : null}
            </div>

            <div className="notif-drawer-body">
              {error ? <div className="alert alert-error notif-inline-alert">{error}</div> : null}

              {loading && items.length === 0 ? (
                <div className="notif-skeleton" aria-label="Carregando">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="notif-skeleton-row" />
                  ))}
                </div>
              ) : null}

              {!loading && !error && items.length === 0 ? (
                <div className="notif-empty">
                  <span className="notif-empty-icon">
                    <BellOff size={22} aria-hidden="true" />
                  </span>
                  <strong>{tab === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação por enquanto'}</strong>
                  <span>
                    Avisos de chamados, atribuições e mudanças de status aparecem aqui assim que acontecerem.
                  </span>
                </div>
              ) : null}

              {groups.map((group) => (
                <section key={group.key} className="notif-group" aria-label={group.label}>
                  <h3 className="notif-group-title">{group.label}</h3>
                  {group.items.map((item) => (
                    <NotificationRow key={item.id} item={item} onOpen={onOpenItem} onMarkRead={markRead} />
                  ))}
                </section>
              ))}
            </div>

            <footer className="notif-drawer-foot">
              <Link to="/m/notificacoes" className="btn-primary notif-drawer-cta" onClick={() => setOpen(false)}>
                Abrir central de notificações
              </Link>
            </footer>
          </aside>
        </>
      ) : null}
    </div>
  );
}
