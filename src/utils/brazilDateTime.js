const BR_TZ = 'America/Sao_Paulo';

/** Aceita ISO com Z ou datetime da API sem fuso (trata como UTC). */
export function parseApiDateTime(iso) {
  if (iso == null || iso === '') return null;
  const raw = String(iso).trim();
  if (!raw) return null;
  const normalized =
    /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatBrazilDateTime(iso, options = {}) {
  const date = parseApiDateTime(iso);
  if (!date) return '';
  return date.toLocaleString('pt-BR', {
    timeZone: BR_TZ,
    ...options,
  });
}

export function formatBrazilTimeShort(iso) {
  return formatBrazilDateTime(iso, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBrazilMessageTime(iso) {
  return formatBrazilDateTime(iso, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBrazilThreadTime(iso) {
  const date = parseApiDateTime(iso);
  if (!date) return '';
  const now = new Date();
  const sameDayFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const sameDay = sameDayFormatter.format(date) === sameDayFormatter.format(now);
  if (sameDay) {
    return date.toLocaleTimeString('pt-BR', {
      timeZone: BR_TZ,
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('pt-BR', {
    timeZone: BR_TZ,
    day: '2-digit',
    month: 'short',
  });
}
