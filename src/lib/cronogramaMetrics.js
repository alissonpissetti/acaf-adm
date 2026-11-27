export const PROJECT_PHASES = [
  'Concepção e estratégia',
  'Empresa, jurídico e financeiro',
  'Marca e branding',
  'Produto e tecnologia',
  'Marketing e comunicação',
  'Rede e comercial',
  'Piloto com acesso controlado',
];

export const GANTT_T0 = '2026-08-31';
export const GANTT_T1 = '2027-02-28';
export const RECESS_START = '2026-12-24';
export const DEFAULT_PILOT_DATE = '2027-01-18';
export const PILOT_CODE = 'm-piloto';

const DAY_MS = 86_400_000;

export function parseYmd(ymd) {
  return new Date(`${ymd}T00:00:00`);
}

export function formatYmd(date) {
  return date.toISOString().slice(0, 10);
}

export function todayYmd() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return formatYmd(d);
}

export function fmtPtShort(ymd) {
  const d = parseYmd(ymd);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function durationDays(task) {
  const diff = Math.round((parseYmd(task.endDate) - parseYmd(task.startDate)) / DAY_MS);
  return Math.max(1, diff + 1);
}

export function isLate(task, today = todayYmd()) {
  if (task.status === 'done' || task.status === 'cancelled' || task.status === 'postponed') return false;
  return task.endDate < today;
}

export function weightedProgressPercent(tasks) {
  const work = tasks.filter((t) => !t.isMilestone);
  const totalDays = work.reduce((acc, t) => acc + durationDays(t), 0);
  if (!totalDays) return 0;
  const weighted = work.reduce((acc, t) => {
    const pct =
      t.status === 'done' ? 100 : t.status === 'cancelled' ? 0 : Number(t.progress) || 0;
    return acc + pct * durationDays(t);
  }, 0);
  return Math.round(weighted / totalDays);
}

export function pilotDate(tasks) {
  const row = tasks.find((t) => t.code === PILOT_CODE);
  return row?.endDate ?? DEFAULT_PILOT_DATE;
}

export function daysUntil(ymd, today = todayYmd()) {
  return Math.ceil((parseYmd(ymd) - parseYmd(today)) / DAY_MS);
}

export function ganttTotalDays() {
  return Math.round((parseYmd(GANTT_T1) - parseYmd(GANTT_T0)) / DAY_MS) + 1;
}

export function ganttPos(ymd) {
  const total = ganttTotalDays();
  const day = Math.round((parseYmd(ymd) - parseYmd(GANTT_T0)) / DAY_MS);
  return (day / total) * 100;
}

export const STATUS_LABELS = {
  done: 'Finalizada',
  in_progress: 'Em andamento',
  blocked: 'Bloqueada',
  postponed: 'Adiada',
  cancelled: 'Cancelada',
  todo: 'A fazer',
  late: 'Atrasada',
};

export function buildSummary(tasks) {
  const today = todayYmd();
  const pilot = pilotDate(tasks);
  const days = daysUntil(pilot, today);
  let s = `Movly · status do cronograma (${new Date().toLocaleDateString('pt-BR')})\n`;
  s += `${weightedProgressPercent(tasks)}% concluído · ${Math.max(0, days)} dias até o piloto\n`;
  const phases = [
    ...PROJECT_PHASES,
    ...[...new Set(tasks.map((t) => t.phase))].filter((f) => !PROJECT_PHASES.includes(f)),
  ];
  for (const phase of phases) {
    const list = tasks.filter((t) => t.phase === phase);
    if (!list.length) continue;
    s += `\n${phase}: ${weightedProgressPercent(list)}%\n`;
    list
      .filter((t) => t.status !== 'done')
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .forEach((t) => {
        const late = isLate(t, today);
        s += `- ${t.name} (${late ? 'ATRASADA, ' : ''}${STATUS_LABELS[t.status] ?? t.status}, até ${fmtPtShort(t.endDate)}${t.owner ? `, ${t.owner}` : ''})\n`;
      });
  }
  return s;
}

export function normalizeStatusProgress(status, progress) {
  let nextStatus = status;
  let nextProgress = Math.max(0, Math.min(100, Math.floor(Number(progress) || 0)));
  if (nextStatus === 'done') nextProgress = 100;
  else if (nextProgress === 100 && nextStatus !== 'cancelled') nextStatus = 'done';
  else if (nextStatus === 'todo' && nextProgress > 0) nextStatus = 'in_progress';
  return { status: nextStatus, progress: nextProgress };
}