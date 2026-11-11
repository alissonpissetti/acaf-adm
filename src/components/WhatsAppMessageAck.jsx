import { Check, CheckCheck } from 'lucide-react';

function normalizeAck(status) {
  const value = String(status ?? '')
    .trim()
    .toLowerCase();
  if (!value) return 'sent';
  if (['pending', 'sent', 'delivered', 'read', 'played'].includes(value)) return value;
  return 'sent';
}

export function WhatsAppMessageAck({ status }) {
  const ack = normalizeAck(status);
  const isRead = ack === 'read' || ack === 'played';
  const isDelivered = ack === 'delivered' || isRead;
  const Icon = isDelivered ? CheckCheck : Check;
  const label =
    ack === 'pending'
      ? 'Enviando'
      : ack === 'sent'
        ? 'Enviada'
        : ack === 'delivered'
          ? 'Entregue'
          : ack === 'read'
            ? 'Lida'
            : 'Reproduzida';

  return (
    <span
      className={`whatsapp-wa-ack${isRead ? ' whatsapp-wa-ack--read' : ''}`}
      aria-label={label}
      title={label}
    >
      <Icon size={14} strokeWidth={2.25} aria-hidden="true" />
    </span>
  );
}
