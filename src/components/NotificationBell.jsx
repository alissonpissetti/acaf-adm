import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications.js';
import { formatRelativeTime } from '../utils/relativeTime.js';
import '../styles/notifications.css';

function severityClass(severity) {
  if (severity === 'success') return 'notification-item--success';
  if (severity === 'warning') return 'notification-item--warning';
  if (severity === 'error') return 'notification-item--error';
  return 'notification-item--info';
}

export function NotificationBell() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);

  const refreshCount = useCallback(async () => {
    try {
      const count = await fetchUnreadNotificationCount();
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch {
      /* ignore polling errors */
    }
  }, []);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications({ limit: 8 });
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, 60_000);
    return () => window.clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return undefined;
    loadPreview();

    const onPointerDown = (ev) => {
      if (rootRef.current && !rootRef.current.contains(ev.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, loadPreview]);

  const onOpen = () => setOpen((current) => !current);

  const onItemClick = async (item) => {
    if (!item.readAt) {
      try {
        await markNotificationRead(item.id);
        setUnreadCount((count) => Math.max(0, count - 1));
        setItems((rows) =>
          rows.map((row) =>
            row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row,
          ),
        );
      } catch {
        /* ignore */
      }
    }

    setOpen(false);
    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  const onMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setItems((rows) => rows.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className="notification-bell-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unreadCount ? `${unreadCount} notificações não lidas` : 'Notificações'}
        onClick={onOpen}
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
            className="notification-bell-backdrop"
            aria-label="Fechar notificações"
            onClick={() => setOpen(false)}
          />
          <div className="notification-bell-panel" role="dialog" aria-label="Notificações">
            <header className="notification-bell-head">
              <strong>Notificações</strong>
              {unreadCount > 0 ? (
                <button type="button" className="btn-ghost btn-sm" onClick={onMarkAllRead}>
                  <CheckCheck size={14} aria-hidden="true" />
                  Marcar todas
                </button>
              ) : null}
            </header>

            <div className="notification-bell-body">
              {loading ? <div className="notification-bell-empty">Carregando…</div> : null}
              {!loading && items.length === 0 ? (
                <div className="notification-bell-empty">Nenhuma notificação por enquanto.</div>
              ) : null}

              {!loading
                ? items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`notification-item${item.readAt ? '' : ' notification-item--unread'} ${severityClass(item.severity)}`}
                      onClick={() => onItemClick(item)}
                    >
                      <span className="notification-item-title">{item.title}</span>
                      <span className="notification-item-body">{item.body}</span>
                      <span className="notification-item-meta">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </button>
                  ))
                : null}
            </div>

            <footer className="notification-bell-foot">
              <Link to="/m/notificacoes" onClick={() => setOpen(false)}>
                Ver todas
              </Link>
            </footer>
          </div>
        </>
      ) : null}
    </div>
  );
}
