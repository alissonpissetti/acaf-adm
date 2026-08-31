import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { formatRelativeTime } from '../utils/relativeTime.js';
import { notificationTriggerLabel } from '../utils/notificationTriggers.js';
import '../styles/notifications.css';

function severityClass(severity) {
  if (severity === 'success') return 'notification-item--success';
  if (severity === 'warning') return 'notification-item--warning';
  if (severity === 'error') return 'notification-item--error';
  return 'notification-item--info';
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchNotifications({
        unreadOnly: filter === 'unread',
        limit: 50,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

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

    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  const onMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setItems((rows) => rows.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page notifications-page">
      <PageHeader
        title="Notificações"
        subtitle="Alertas sistêmicos da plataforma para o seu usuário."
        actions={
          unreadCount > 0 ? (
            <button type="button" className="btn-secondary btn-sm" onClick={onMarkAllRead}>
              <CheckCheck size={16} aria-hidden="true" />
              Marcar todas como lidas
            </button>
          ) : null
        }
      />

      <div className="notifications-toolbar">
        <div className="notifications-filter" role="tablist" aria-label="Filtrar notificações">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'unread', label: 'Não lidas' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`notifications-filter-btn${filter === option.value ? ' is-active' : ''}`}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
              {option.value === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="panel">
        <div className="panel-body panel-body-flush">
          {loading ? <div className="notification-bell-empty">Carregando…</div> : null}

          {!loading && items.length === 0 ? (
            <div className="notification-bell-empty">
              {filter === 'unread'
                ? 'Você não tem notificações não lidas.'
                : 'Nenhuma notificação registrada ainda.'}
            </div>
          ) : null}

          {!loading && items.length > 0 ? (
            <div className="notifications-list">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`notification-item notification-item--full${item.readAt ? '' : ' notification-item--unread'} ${severityClass(item.severity)}`}
                  onClick={() => onItemClick(item)}
                >
                  <span className="notification-item-title">{item.title}</span>
                  <span className="notification-item-body">{item.body}</span>
                  <span className="notification-item-meta">
                    {formatRelativeTime(item.createdAt)}
                    {item.triggerKey ? ` · ${notificationTriggerLabel(item.triggerKey)}` : ''}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
