export const TASK_STATUS_LABELS = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  blocked: 'Bloqueada',
  postponed: 'Adiada',
  cancelled: 'Cancelada',
  done: 'Finalizada',
};

export const TASK_PRIORITY_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export const TASK_EVENT_FIELD_LABELS = {
  name: 'nome',
  phase: 'fase',
  startDate: 'início',
  endDate: 'vencimento',
  status: 'status',
  priority: 'prioridade',
  tags: 'tags',
  estimatedHours: 'horas estimadas',
  timeTrackedSeconds: 'tempo rastreado',
  requesterUserId: 'solicitante',
  progress: 'progresso',
  owner: 'responsáveis',
  ownerUserIds: 'responsáveis',
  notes: 'descrição',
  isMilestone: 'marco',
  attachment_added: 'anexo',
  attachment_removed: 'anexo',
};

function resolveOwnerIdsLabel(value, userById) {
  if (value == null || value === '') return '—';
  try {
    const ids = JSON.parse(value);
    if (!Array.isArray(ids)) return value;
    if (!userById?.size) return ids.join(', ');
    return ids.map((id) => userById.get(id)?.name ?? id).filter(Boolean).join(', ') || '—';
  } catch {
    return value;
  }
}

export function formatTaskEventValue(field, value, userById) {
  if (value == null || value === '') return '—';
  if (field === 'status') return TASK_STATUS_LABELS[value] ?? value;
  if (field === 'priority') return TASK_PRIORITY_LABELS[value] ?? value;
  if (field === 'isMilestone') return value === 'true' ? 'sim' : 'não';
  if (field === 'requesterUserId' && userById?.size) {
    return userById.get(value)?.name ?? value;
  }
  if (field === 'timeTrackedSeconds') {
    const n = Number(value);
    if (!Number.isFinite(n)) return value;
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const s = n % 60;
    return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
  }
  if (field === 'tags' || field === 'ownerUserIds') {
    if (field === 'ownerUserIds') return resolveOwnerIdsLabel(value, userById);
    try {
      const arr = JSON.parse(value);
      return Array.isArray(arr) ? arr.join(', ') : value;
    } catch {
      return value;
    }
  }
  if (field === 'progress') return `${value}%`;
  return value;
}

export function buildTaskActivityMessage(event, userById) {
  const actor = event.userName?.trim() || 'Alguém';
  const field = event.field;
  const oldRaw = event.oldValue;
  const newRaw = event.newValue;
  const hasOld = oldRaw != null && oldRaw !== '';
  const hasNew = newRaw != null && newRaw !== '';

  if (field === 'attachment_added' && hasNew) {
    return `${actor} anexou o arquivo “${newRaw}”`;
  }
  if (field === 'attachment_removed' && hasOld) {
    return `${actor} removeu o anexo “${oldRaw}”`;
  }
  if (field === 'status') {
    const from = formatTaskEventValue('status', oldRaw, userById);
    const to = formatTaskEventValue('status', newRaw, userById);
    if (hasOld && hasNew) return `${actor} alterou o status de ${from} para ${to}`;
    if (hasNew) return `${actor} definiu o status como ${to}`;
  }
  if (field === 'ownerUserIds' || field === 'owner') {
    const from = formatTaskEventValue(field, oldRaw, userById);
    const to = formatTaskEventValue(field, newRaw, userById);
    if (hasOld && hasNew && from !== to) {
      return `${actor} alterou os responsáveis de ${from} para ${to}`;
    }
    if (hasNew) return `${actor} definiu os responsáveis: ${to}`;
  }

  const label = TASK_EVENT_FIELD_LABELS[field] ?? field;
  const from = formatTaskEventValue(field, oldRaw, userById);
  const to = formatTaskEventValue(field, newRaw, userById);
  if (hasOld && hasNew) return `${actor} alterou ${label} de ${from} para ${to}`;
  if (hasNew) return `${actor} definiu ${label} como ${to}`;
  if (hasOld) return `${actor} removeu ${label} (${from})`;
  return `${actor} registrou alteração em ${label}`;
}

export function formatDurationSeconds(total) {
  const n = Math.max(0, Math.floor(Number(total) || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
}

export function parseTagsInput(raw) {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\n]+/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
}