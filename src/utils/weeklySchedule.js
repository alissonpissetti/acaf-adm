export const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEKDAY_LABELS = {
  mon: 'segunda-feira',
  tue: 'terça-feira',
  wed: 'quarta-feira',
  thu: 'quinta-feira',
  fri: 'sexta-feira',
  sat: 'sábado',
  sun: 'domingo',
};

export function defaultWeeklySchedule() {
  const weekday = { closed: false, open: '05:30', close: '22:00' };
  return {
    mon: { ...weekday },
    tue: { ...weekday },
    wed: { ...weekday },
    thu: { ...weekday },
    fri: { ...weekday },
    sat: { closed: false, open: '08:00', close: '16:00' },
    sun: { closed: false, open: '09:00', close: '13:00' },
  };
}

export function normalizeWeeklySchedule(input) {
  const base = defaultWeeklySchedule();
  if (!input) return base;

  for (const day of WEEKDAY_ORDER) {
    const row = input[day];
    if (!row) continue;
    base[day] = {
      closed: Boolean(row.closed),
      open: row.open?.trim() || base[day].open,
      close: row.close?.trim() || base[day].close,
    };
  }

  return base;
}

export function formatDayRange(day) {
  if (day.closed) return 'Fechado';
  if (!day.open || !day.close) return '—';
  return `${day.open}–${day.close}`;
}

export function getTodayDayKey() {
  const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[new Date().getDay()];
}

export function getRotatedWeekdayOrder(today = getTodayDayKey()) {
  const start = WEEKDAY_ORDER.indexOf(today);
  if (start < 0) return [...WEEKDAY_ORDER];
  return [...WEEKDAY_ORDER.slice(start), ...WEEKDAY_ORDER.slice(0, start)];
}

export function weeklyScheduleFromUnit(unit) {
  return normalizeWeeklySchedule(unit?.weeklySchedule);
}

export function formatOpenHoursPreview(schedule) {
  return getRotatedWeekdayOrder().map((day) => ({
    day,
    label: WEEKDAY_LABELS[day],
    range: formatDayRange(schedule[day]),
    isToday: day === getTodayDayKey(),
  }));
}

export function formatTodayHours(unit) {
  const schedule = weeklyScheduleFromUnit(unit);
  return formatDayRange(schedule[getTodayDayKey()]);
}

export function isWeeklyScheduleComplete(schedule) {
  const normalized = normalizeWeeklySchedule(schedule);
  return WEEKDAY_ORDER.every((day) => {
    const row = normalized[day];
    if (row.closed) return true;
    return Boolean(row.open?.trim()) && Boolean(row.close?.trim());
  });
}

export function formatWeeklyScheduleSummary(schedule) {
  const normalized = normalizeWeeklySchedule(schedule);
  const today = getTodayDayKey();
  return `${WEEKDAY_LABELS[today]} · ${formatDayRange(normalized[today])}`;
}
