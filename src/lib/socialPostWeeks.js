export const SOCIAL_CALENDAR_TZ = 'America/Sao_Paulo';
const TZ = SOCIAL_CALENDAR_TZ;

/** Valor para `<input type="datetime-local">` no fuso do calendário (não use slice do ISO UTC). */
export function toDatetimeLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const pick = (type) => parts.find((p) => p.type === type)?.value ?? '00';
  const y = pick('year');
  const m = pick('month');
  const day = pick('day');
  let h = pick('hour');
  if (h === '24') h = '00';
  const min = pick('minute');
  return `${y}-${m}-${day}T${h}:${min}`;
}

/** Corpo PATCH: horário de parede em America/Sao_Paulo. */
export function agendadoParaFromDatetimeLocal(value) {
  if (!value?.trim()) return null;
  return `${value}:00-03:00`;
}

export function formatPostDateTime(iso) {
  if (!iso) return { date: '—', time: '—', weekday: '' };
  const d = new Date(iso);
  const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long' }).format(d);
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: 'short' }).format(d);
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(d);
  return { date, time, weekday };
}

export function groupPostsByWeek(posts) {
  const weeks = new Map();
  for (const post of posts) {
    const key = weekKey(post.agendadoPara);
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key).push(post);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      label: weekLabel(key, items),
      posts: items,
    }));
}

function weekKey(iso) {
  if (!iso) return 'sem-data';
  const d = new Date(iso);
  const start = startOfWeek(d);
  return start.toISOString().slice(0, 10);
}

function startOfWeek(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const local = new Date(Date.UTC(y, m - 1, day));
  const dow = local.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  local.setUTCDate(local.getUTCDate() + diff);
  return local;
}

function weekLabel(key, items) {
  if (key === 'sem-data') return 'Sem data';
  const feed = items.filter((p) => p.envio === 'feed').length;
  const storyDays = new Set(
    items.filter((p) => p.envio === 'stories').map((p) => p.agendadoPara?.slice(0, 10)),
  ).size;
  const reelCount = items.filter((p) => p.envio === 'reels').length;
  const end = new Date(`${key}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const range = `${formatBr(key)} – ${formatBr(end.toISOString().slice(0, 10))}`;
  const reelPart = reelCount ? ` · ${reelCount} ${reelCount === 1 ? 'reel' : 'reels'}` : '';
  return `${range} · ${feed} no feed · ${storyDays} dias de stories${reelPart}`;
}

function formatBr(ymd) {
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}`;
}