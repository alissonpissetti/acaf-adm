export const NOTIFICATION_TRIGGER_LABELS = {
  'support.ticket.created': 'Chamado aberto',
  'support.ticket.message': 'Nova mensagem',
  'support.ticket.internal_note': 'Nota interna',
  'support.ticket.assigned': 'Chamado atribuído',
  'support.ticket.status': 'Status alterado',
  'marketing.lead.created': 'Lead de formulário',
};

export function notificationTriggerLabel(triggerKey) {
  if (!triggerKey) return '';
  return NOTIFICATION_TRIGGER_LABELS[triggerKey] ?? triggerKey;
}
