/** Agrupa notificações por dia (Hoje, Ontem, Esta semana, Anteriores) para leitura rápida. */
export function groupNotificationsByDay(items, now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const groups = [
    { key: 'today', label: 'Hoje', items: [] },
    { key: 'yesterday', label: 'Ontem', items: [] },
    { key: 'week', label: 'Últimos 7 dias', items: [] },
    { key: 'older', label: 'Anteriores', items: [] },
  ];

  for (const item of items) {
    const t = new Date(item.createdAt).getTime();
    if (Number.isNaN(t) || t >= startOfToday) groups[0].items.push(item);
    else if (t >= startOfToday - day) groups[1].items.push(item);
    else if (t >= startOfToday - 6 * day) groups[2].items.push(item);
    else groups[3].items.push(item);
  }

  return groups.filter((g) => g.items.length > 0);
}

export const SEVERITY_META = {
  info: { label: 'Informação' },
  success: { label: 'Sucesso' },
  warning: { label: 'Atenção' },
  error: { label: 'Erro' },
};

export function normalizeSeverity(severity) {
  return SEVERITY_META[severity] ? severity : 'info';
}

export function formatFullDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
