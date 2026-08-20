const STATUS_LABELS = {
  pending: 'Pendente',
  settled: 'Liquidado',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

export function statusClass(status) {
  if (status === 'settled') return 'status-pill status-pill-success';
  if (status === 'overdue') return 'status-pill status-pill-danger';
  if (status === 'cancelled') return 'status-pill status-pill-muted';
  return 'status-pill status-pill-warning';
}

export function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString('pt-BR');
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function attachmentKindLabel(kind) {
  return kind === 'payment_receipt' ? 'Comprovante de pagamento' : 'Anexo';
}
