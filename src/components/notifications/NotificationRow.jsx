import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { formatRelativeTime } from '../../utils/relativeTime.js';
import { normalizeSeverity, SEVERITY_META } from '../../utils/notificationGroups.js';
import { notificationTriggerLabel } from '../../utils/notificationTriggers.js';

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

export function SeverityIcon({ severity, size = 16 }) {
  const key = normalizeSeverity(severity);
  const Icon = ICONS[key];
  return (
    <span className={`notif-sev notif-sev--${key}`} title={SEVERITY_META[key].label}>
      <Icon size={size} aria-hidden="true" />
    </span>
  );
}

/**
 * Linha de notificação usada no painel lateral e na central.
 * `selected` destaca a linha aberta no painel de detalhes.
 */
export function NotificationRow({
  item,
  triggerLabels,
  selected = false,
  checked,
  onToggleCheck,
  onOpen,
  onMarkRead,
  compact = false,
}) {
  const unread = !item.readAt;
  const trigger = item.triggerKey
    ? triggerLabels?.[item.triggerKey] ?? notificationTriggerLabel(item.triggerKey)
    : '';

  return (
    <div
      className={`notif-row${unread ? ' is-unread' : ''}${selected ? ' is-selected' : ''}${compact ? ' is-compact' : ''}`}
    >
      {onToggleCheck ? (
        <label className="notif-row-check" onClick={(ev) => ev.stopPropagation()}>
          <input
            type="checkbox"
            checked={Boolean(checked)}
            onChange={() => onToggleCheck(item)}
            aria-label={`Selecionar "${item.title}"`}
          />
        </label>
      ) : null}

      <button type="button" className="notif-row-main" onClick={() => onOpen(item)}>
        <SeverityIcon severity={item.severity} />
        <span className="notif-row-text">
          <span className="notif-row-title">{item.title}</span>
          {item.body ? <span className="notif-row-body">{item.body}</span> : null}
          <span className="notif-row-meta">
            <time dateTime={item.createdAt}>{formatRelativeTime(item.createdAt)}</time>
            {trigger ? <span className="notif-row-tag">{trigger}</span> : null}
          </span>
        </span>
        {unread ? <span className="notif-row-dot" aria-label="Não lida" /> : null}
      </button>

      {unread && onMarkRead ? (
        <button
          type="button"
          className="notif-row-action"
          onClick={() => onMarkRead(item)}
          title="Marcar como lida"
          aria-label={`Marcar "${item.title}" como lida`}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
