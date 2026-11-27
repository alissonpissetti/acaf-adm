import { useEffect, useMemo, useRef, useState } from 'react';

const MODES = [
  { id: 'daily', label: 'Diário' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'monthly', label: 'Mensal' },
];

const DEFAULT_PERIOD_MONTHS_BACK = 6;
const DEFAULT_PERIOD_MONTHS_FORWARD = 6;

/** Janela da tendência: para trás e para frente a partir do último ponto. */
const TREND_CONFIG = {
  daily: { back: 15, forward: 15, unit: 'day', legend: '−15 / +15 dias' },
  weekly: { back: 5, forward: 5, unit: 'week', legend: '−5 / +5 semanas' },
  monthly: {
    back: DEFAULT_PERIOD_MONTHS_BACK,
    forward: DEFAULT_PERIOD_MONTHS_FORWARD,
    unit: 'month',
    legend: `−${DEFAULT_PERIOD_MONTHS_BACK} / +${DEFAULT_PERIOD_MONTHS_FORWARD} meses`,
  },
};

const CHART_W = 720;
const CHART_H = 280;
const PAD = { top: 22, right: 20, bottom: 28, left: 52 };
const MAX_X_LABELS = { daily: 5, weekly: 6, monthly: 6 };

function parseYmd(ymd) {
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function ymdFromDate(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function formatPtNumber(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('pt-BR').format(Number(n));
}

function formatPtShortDate(ymd) {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function isoWeekKey(ymd) {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  const tmp = new Date(d);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  const week = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function aggregateSeries(raw, mode) {
  if (!raw?.length) return [];
  const sorted = [...raw].sort((a, b) => a.date.localeCompare(b.date));
  if (mode === 'daily') return sorted;

  const buckets = new Map();
  for (const row of sorted) {
    const key =
      mode === 'weekly' ? isoWeekKey(row.date) : row.date.slice(0, 7);
    buckets.set(key, row);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
}

function mergeLiveToday(series, liveCount, todayYmd) {
  if (liveCount == null || !todayYmd) return series;
  const last = series[series.length - 1];
  if (last?.date === todayYmd) {
    if (Number(last.payingLivesCount) === Number(liveCount)) return series;
    return [...series.slice(0, -1), { date: todayYmd, payingLivesCount: liveCount }];
  }
  return [...series, { date: todayYmd, payingLivesCount: liveCount }];
}

function linearRegression(points) {
  const n = points.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-9) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept, predict: (x) => intercept + slope * x };
}

function daysBetweenYmd(a, b) {
  const d1 = parseYmd(a);
  const d2 = parseYmd(b);
  if (!d1 || !d2) return 0;
  return Math.round((d2 - d1) / 86400000);
}

function addDaysYmd(ymd, days) {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + days);
  return ymdFromDate(d);
}

function addWeeksYmd(ymd, weeks) {
  return addDaysYmd(ymd, weeks * 7);
}

function addMonthsYmd(ymd, months) {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  d.setMonth(d.getMonth() + months);
  return ymdFromDate(d);
}

function startOfMonthYmd(ymd) {
  const d = parseYmd(ymd);
  if (!d) return ymd.slice(0, 7) + '-01';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function endOfMonthYmd(ymd) {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return ymdFromDate(d);
}

/** Período padrão: do início do mês −N até o fim do mês +M (fuso local do navegador). */
function defaultPeriodRange(todayYmd) {
  const anchor = todayYmd || ymdFromDate(new Date());
  return {
    from: startOfMonthYmd(addMonthsYmd(anchor, -DEFAULT_PERIOD_MONTHS_BACK)),
    to: endOfMonthYmd(addMonthsYmd(anchor, DEFAULT_PERIOD_MONTHS_FORWARD)),
  };
}

function resolvePeriodBounds(todayYmd, fromInput, toInput) {
  const defaults = defaultPeriodRange(todayYmd);
  let from = fromInput.trim() || defaults.from;
  let to = toInput.trim() || defaults.to;
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  return { from, to, usingDefaults: !fromInput.trim() && !toInput.trim() };
}

function shiftYmd(ymd, amount, unit) {
  if (unit === 'day') return addDaysYmd(ymd, amount);
  if (unit === 'week') return addWeeksYmd(ymd, amount);
  return addMonthsYmd(ymd, amount);
}

function nextMilestones(currentCount, tiers) {
  const n = Math.max(0, Number(currentCount) || 0);
  const mins = (tiers ?? [])
    .map((t) => t.min)
    .filter((m) => m != null && m > n)
    .sort((a, b) => a - b);
  return [...new Set(mins)];
}

function buildMilestoneForecasts({ series, liveCount, tiers, regressionBackDays = 15 }) {
  if (series.length < 3) return [];
  const anchor = series[series.length - 1].date;
  const windowStart = addDaysYmd(anchor, -regressionBackDays);
  const window = series.filter((row) => row.date >= windowStart && row.date <= anchor);
  if (window.length < 2) return [];

  const t0 = window[0].date;
  const reg = linearRegression(
    window.map((row) => ({
      x: daysBetweenYmd(t0, row.date),
      y: row.payingLivesCount,
    })),
  );
  if (!reg || reg.slope <= 0.001) return [];

  const xLast = daysBetweenYmd(t0, anchor);
  const milestones = nextMilestones(liveCount ?? series[series.length - 1].payingLivesCount, tiers);

  return milestones
    .map((target) => {
      const xHit = (target - reg.intercept) / reg.slope;
      const daysFromLast = Math.ceil(xHit - xLast);
      if (daysFromLast < 0 || daysFromLast > 3650) return null;
      const eta = addDaysYmd(anchor, daysFromLast);
      return { target, eta, daysFromLast };
    })
    .filter(Boolean);
}

function formatAxisLabel(ymd, mode) {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  if (mode === 'monthly') {
    return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function seriesHasMeaningfulVariation(rows) {
  if (!rows?.length || rows.length < 3) return false;
  const ys = rows.map((r) => Number(r.payingLivesCount) || 0);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  return max - min > 0;
}

function buildTrendSegment({ mode, anchorDate, fitSeries, xAtDate, yAt }) {
  const cfg = TREND_CONFIG[mode];
  if (!cfg || !anchorDate || fitSeries.length < 2) return null;

  const trendStart = shiftYmd(anchorDate, -cfg.back, cfg.unit);
  const trendEnd = shiftYmd(anchorDate, cfg.forward, cfg.unit);

  const windowStart = shiftYmd(anchorDate, -cfg.back, cfg.unit);
  const fitWindow = fitSeries.filter((row) => row.date >= windowStart && row.date <= anchorDate);
  if (fitWindow.length < 2) return null;
  if (!seriesHasMeaningfulVariation(fitWindow)) return null;

  const t0 = fitWindow[0].date;
  const reg = linearRegression(
    fitWindow.map((row) => ({
      x: daysBetweenYmd(t0, row.date),
      y: row.payingLivesCount,
    })),
  );
  if (!reg) return null;

  const yAtDate = (ymd) => {
    const x = daysBetweenYmd(t0, ymd);
    return yAt(Math.max(0, reg.predict(x)));
  };

  return {
    x1: xAtDate(trendStart),
    y1: yAtDate(trendStart),
    x2: xAtDate(trendEnd),
    y2: yAtDate(trendEnd),
    legend: cfg.legend,
  };
}

function ChartModePicker({ mode, setMode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="acaf-lives-chart__mode-picker" ref={rootRef}>
      <button
        type="button"
        className="acaf-lives-chart__mode-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Visualização: ${current.label}. Abrir opções`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="acaf-lives-chart__mode-trigger-label">{current.label}</span>
        <span className="acaf-lives-chart__mode-trigger-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul className="acaf-lives-chart__mode-menu" role="listbox" aria-label="Modo de visualização">
          {MODES.map((m) => (
            <li key={m.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={mode === m.id}
                className={`acaf-lives-chart__mode-option${mode === m.id ? ' is-active' : ''}`}
                onClick={() => {
                  setMode(m.id);
                  setOpen(false);
                }}
              >
                {m.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ChartToolbar({
  mode,
  setMode,
  periodFrom,
  periodTo,
  onPeriodFromChange,
  onPeriodToChange,
}) {
  return (
    <div className="acaf-lives-chart__toolbar">
      <div className="acaf-lives-chart__head">
        <h3 className="acaf-lives-chart__title">Evolução das vidas</h3>
        <p className="muted acaf-lives-chart__subtitle">
          Histórico a partir dos registros diários; o valor de hoje combina snapshot e leitura em tempo quase real.
        </p>
      </div>
      <div className="acaf-lives-chart__controls-row">
        <div className="acaf-lives-chart__period" role="group" aria-label="Período do gráfico">
          <input
            type="date"
            className="acaf-lives-chart__period-input"
            value={periodFrom}
            onChange={(e) => onPeriodFromChange(e.target.value)}
            aria-label="Data inicial"
          />
          <span className="acaf-lives-chart__period-sep muted" aria-hidden>
            —
          </span>
          <input
            type="date"
            className="acaf-lives-chart__period-input"
            value={periodTo}
            onChange={(e) => onPeriodToChange(e.target.value)}
            aria-label="Data final"
          />
        </div>
        <ChartModePicker mode={mode} setMode={setMode} />
      </div>
    </div>
  );
}

export function PayingLivesEvolutionChart({
  snapshots,
  liveCount,
  todayYmd,
  tiers,
}) {
  const [mode, setMode] = useState('monthly');

  const today =
    todayYmd ||
    (() => {
      const d = new Date();
      return ymdFromDate(d);
    })();

  const defaultPeriod = useMemo(() => defaultPeriodRange(today), [today]);

  const [periodFromInput, setPeriodFromInput] = useState(defaultPeriod.from);
  const [periodToInput, setPeriodToInput] = useState(defaultPeriod.to);

  const periodBounds = useMemo(
    () => resolvePeriodBounds(today, periodFromInput, periodToInput),
    [today, periodFromInput, periodToInput],
  );

  const dailyWithLive = useMemo(
    () => mergeLiveToday(snapshots ?? [], liveCount, today),
    [snapshots, liveCount, today],
  );

  const dailyInPeriod = useMemo(
    () =>
      dailyWithLive.filter(
        (row) => row.date >= periodBounds.from && row.date <= periodBounds.to,
      ),
    [dailyWithLive, periodBounds.from, periodBounds.to],
  );

  const displaySeries = useMemo(
    () => aggregateSeries(dailyInPeriod, mode),
    [dailyInPeriod, mode],
  );

  const forecasts = useMemo(
    () =>
      buildMilestoneForecasts({
        series: dailyWithLive,
        liveCount,
        tiers,
        regressionBackDays: TREND_CONFIG.daily.back,
      }),
    [dailyWithLive, liveCount, tiers],
  );

  const chart = useMemo(() => {
    if (!displaySeries.length) return null;

    const anchorDate = displaySeries[displaySeries.length - 1].date;
    const cfg = TREND_CONFIG[mode];
    const trendStart = shiftYmd(anchorDate, -cfg.back, cfg.unit);
    const trendEnd = shiftYmd(anchorDate, cfg.forward, cfg.unit);

    const periodMin = periodBounds.from;
    const periodMax = periodBounds.to;

    const xDomainMin = [periodMin, displaySeries[0].date, trendStart]
      .filter(Boolean)
      .sort()[0];
    const xDomainMax = [periodMax, displaySeries[displaySeries.length - 1].date, trendEnd]
      .filter(Boolean)
      .sort()
      .slice(-1)[0];
    const xSpan = Math.max(1, daysBetweenYmd(xDomainMin, xDomainMax));

    const values = displaySeries.map((r) => r.payingLivesCount);
    const dataMax = Math.max(...values, Number(liveCount) || 0, 1);
    const allMilestones = nextMilestones(liveCount ?? values[values.length - 1], tiers);
    const milestoneCap = Math.max(dataMax * 2.5, dataMax + 50);
    const milestoneLines = allMilestones.filter((m) => m <= milestoneCap);
    const yMax = Math.max(dataMax, ...milestoneLines, 1) * 1.12;
    const yMin = 0;
    const innerW = CHART_W - PAD.left - PAD.right;
    const innerH = CHART_H - PAD.top - PAD.bottom;

    const xAtDate = (ymd) =>
      PAD.left + (daysBetweenYmd(xDomainMin, ymd) / xSpan) * innerW;
    const yAt = (v) => PAD.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

    const linePoints = displaySeries
      .map((row) => `${xAtDate(row.date)},${yAt(row.payingLivesCount)}`)
      .join(' ');
    const areaPoints = `${PAD.left},${PAD.top + innerH} ${linePoints} ${xAtDate(displaySeries[displaySeries.length - 1].date)},${PAD.top + innerH}`;

    const fitSeries = mode === 'daily' ? dailyInPeriod : displaySeries;
    const trendSegment = buildTrendSegment({
      mode,
      anchorDate,
      fitSeries,
      xAtDate,
      yAt,
    });

    const yTicks = 4;
    const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
      Math.round(yMin + ((yMax - yMin) * i) / yTicks),
    );

    const maxLabels = MAX_X_LABELS[mode] ?? 6;
    const xLabelEvery = Math.max(1, Math.ceil(displaySeries.length / maxLabels));
    const xLabels = displaySeries
      .map((row, i) => ({ row, i }))
      .filter(({ i }) => i === 0 || i === displaySeries.length - 1 || i % xLabelEvery === 0)
      .map(({ row, i }) => ({
        row,
        i,
        xPct: (daysBetweenYmd(xDomainMin, row.date) / xSpan) * 100,
      }));

    const padLeftPct = (PAD.left / CHART_W) * 100;
    const padRightPct = (PAD.right / CHART_W) * 100;

    const denseLabels = displaySeries.length > 24;
    const dataPoints = displaySeries.map((row) => {
      const value = Number(row.payingLivesCount) || 0;
      const x = xAtDate(row.date);
      const y = yAt(value);
      const preferAbove = y - 10 >= PAD.top + 8;
      return {
        date: row.date,
        value,
        x,
        y,
        label: formatPtNumber(value),
        labelY: preferAbove ? y - 8 : y + 14,
        labelAnchor: 'middle',
        dense: denseLabels,
      };
    });

    return {
      yMax,
      linePoints,
      areaPoints,
      trendSegment,
      milestoneLines,
      yTickValues,
      xLabels,
      dataPoints,
      yAt,
      xAtDate,
      mode,
      padLeftPct,
      padRightPct,
    };
  }, [displaySeries, dailyWithLive, dailyInPeriod, mode, liveCount, tiers, periodBounds.from, periodBounds.to]);

  if (!dailyWithLive.length) {
    return (
      <div className="acaf-lives-chart acaf-lives-chart--empty">
        <p className="muted">
          Ainda não há histórico diário de vidas. O primeiro snapshot é gravado automaticamente uma vez por dia
          (fuso Brasil).
        </p>
      </div>
    );
  }

  if (!displaySeries.length) {
    return (
      <div className="acaf-lives-chart">
        <ChartToolbar
          mode={mode}
          setMode={setMode}
          periodFrom={periodFromInput}
          periodTo={periodToInput}
          onPeriodFromChange={setPeriodFromInput}
          onPeriodToChange={setPeriodToInput}
        />
        <p className="muted acaf-lives-chart--empty">
          Nenhum registro de vidas no período selecionado ({formatPtShortDate(periodBounds.from)} —{' '}
          {formatPtShortDate(periodBounds.to)}).
        </p>
      </div>
    );
  }

  return (
    <div className="acaf-lives-chart">
      <ChartToolbar
        mode={mode}
        setMode={setMode}
        periodFrom={periodFromInput}
        periodTo={periodToInput}
        onPeriodFromChange={setPeriodFromInput}
        onPeriodToChange={setPeriodToInput}
      />

      <div className="acaf-lives-chart__plot-wrap">
        <svg
          className="acaf-lives-chart__svg"
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          role="img"
          aria-label="Gráfico de evolução das vidas pagantes"
        >
          {chart.yTickValues.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={CHART_W - PAD.right}
                y1={chart.yAt(v)}
                y2={chart.yAt(v)}
                className="acaf-lives-chart__grid"
              />
              <text x={PAD.left - 8} y={chart.yAt(v) + 4} textAnchor="end" className="acaf-lives-chart__axis-y">
                {formatPtNumber(v)}
              </text>
            </g>
          ))}

          {chart.milestoneLines.map((milestone) => (
            <g key={milestone}>
              <line
                x1={PAD.left}
                x2={CHART_W - PAD.right}
                y1={chart.yAt(milestone)}
                y2={chart.yAt(milestone)}
                className="acaf-lives-chart__milestone"
              />
              <text
                x={CHART_W - PAD.right}
                y={chart.yAt(milestone) - 6}
                textAnchor="end"
                className="acaf-lives-chart__milestone-label"
              >
                {formatPtNumber(milestone)}
              </text>
            </g>
          ))}

          <polygon points={chart.areaPoints} className="acaf-lives-chart__area" />
          <polyline points={chart.linePoints} className="acaf-lives-chart__line" />

          {chart.dataPoints.map((p) => (
            <g key={p.date} className="acaf-lives-chart__point-group">
              <circle cx={p.x} cy={p.y} r={p.dense ? 3 : 4} className="acaf-lives-chart__point" />
              <text
                x={p.x}
                y={p.labelY}
                textAnchor={p.labelAnchor}
                className={`acaf-lives-chart__point-label${p.dense ? ' acaf-lives-chart__point-label--dense' : ''}`}
              >
                {p.label}
              </text>
            </g>
          ))}

          {chart.trendSegment ? (
            <line
              x1={chart.trendSegment.x1}
              y1={chart.trendSegment.y1}
              x2={chart.trendSegment.x2}
              y2={chart.trendSegment.y2}
              className="acaf-lives-chart__trend"
            />
          ) : null}
        </svg>

        <div
          className="acaf-lives-chart__xband"
          aria-hidden="true"
          style={{
            '--chart-pad-left': `${chart.padLeftPct}%`,
            '--chart-pad-right': `${chart.padRightPct}%`,
          }}
        >
          {chart.xLabels.map(({ row, i, xPct }) => (
            <span
              key={`${row.date}-${i}`}
              className="acaf-lives-chart__x-tick"
              style={{
                left: `calc(var(--chart-pad-left) + (100% - var(--chart-pad-left) - var(--chart-pad-right)) * ${xPct} / 100)`,
              }}
            >
              {formatAxisLabel(row.date, chart.mode)}
            </span>
          ))}
        </div>
      </div>

      <div className="acaf-lives-chart__legend muted">
        <span className="acaf-lives-chart__legend-item">
          <span className="acaf-lives-chart__swatch acaf-lives-chart__swatch--line" aria-hidden />
          Vidas registradas
        </span>
        {chart?.trendSegment ? (
          <span className="acaf-lives-chart__legend-item">
            <span className="acaf-lives-chart__swatch acaf-lives-chart__swatch--trend" aria-hidden />
            Tendência ({chart.trendSegment.legend})
          </span>
        ) : null}
        <span className="acaf-lives-chart__legend-item">
          <span className="acaf-lives-chart__swatch acaf-lives-chart__swatch--milestone" aria-hidden />
          Próximos marcos de faixa
        </span>
      </div>

      {forecasts.length > 0 ? (
        <div className="acaf-lives-chart__forecasts">
          <p className="acaf-lives-chart__forecasts-title">Estimativa linear (indicativa)</p>
          <ul>
            {forecasts.map((f) => (
              <li key={f.target}>
                <strong>{formatPtNumber(f.target)} vidas</strong>
                <span className="muted">
                  {' '}
                  · em cerca de {f.daysFromLast} dias ({formatPtShortDate(f.eta)})
                </span>
              </li>
            ))}
          </ul>
          <p className="muted acaf-lives-chart__forecasts-disclaimer">
            Projeção simples com base na tendência recente; não considera sazonalidade, campanhas ou churn.
          </p>
        </div>
      ) : dailyWithLive.length >= 3 ? (
        <p className="muted acaf-lives-chart__forecasts-disclaimer">
          Sem tendência de crescimento estável nos últimos dias para estimar novos marcos.
        </p>
      ) : null}
    </div>
  );
}