const UNITS = [
  { limit: 60, singular: 'segundo', plural: 'segundos' },
  { limit: 60, singular: 'minuto', plural: 'minutos' },
  { limit: 24, singular: 'hora', plural: 'horas' },
  { limit: 7, singular: 'dia', plural: 'dias' },
  { limit: 4.34524, singular: 'semana', plural: 'semanas' },
  { limit: 12, singular: 'mês', plural: 'meses' },
  { limit: Infinity, singular: 'ano', plural: 'anos' },
];

function pluralize(value, singular, plural) {
  return value === 1 ? singular : plural;
}

export function formatRelativeTime(isoDate, { future = false, emptyLabel = 'Sem registro' } = {}) {
  if (!isoDate) return emptyLabel;

  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return '—';

  let seconds = Math.floor((timestamp - Date.now()) / 1000);
  const isFuture = seconds > 0;
  if (!future && isFuture) {
    future = true;
  }
  seconds = Math.abs(seconds);

  if (!future && seconds < 45) return 'agora';
  if (future && seconds < 60) return 'em instantes';

  let value = seconds;
  let unit = UNITS[0];

  for (const nextUnit of UNITS) {
    if (value < nextUnit.limit) {
      unit = nextUnit;
      break;
    }
    value = Math.floor(value / nextUnit.limit);
    unit = nextUnit;
  }

  const label = pluralize(value, unit.singular, unit.plural);
  return future ? `em ${value} ${label}` : `há ${value} ${label}`;
}
