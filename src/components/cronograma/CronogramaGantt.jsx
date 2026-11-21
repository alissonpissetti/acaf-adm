import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  GANTT_T0,
  GANTT_T1,
  PROJECT_PHASES,
  STATUS_LABELS,
  fmtPtShort,
  ganttPos,
  ganttTotalDays,
  isLate,
  parseYmd,
  pilotDate,
  todayYmd,
  weightedProgressPercent,
  durationDays,
} from '../../lib/cronogramaMetrics.js';
import { ownersFromTask } from '../../lib/cronogramaOwners.js';
import { CronogramaOwnerAvatars } from './CronogramaOwnerAvatars.jsx';

const OWNER_COLUMN_PX = 92;

const DAY_MS = 86_400_000;

function matchTask(task, filt, q, today) {
  const hay = `${task.name} ${task.owner ?? ''} ${task.notes ?? ''}`.toLowerCase();
  if (q && !hay.includes(q)) return false;
  if (filt === 'all') return true;
  if (filt === 'late') return isLate(task, today);
  return task.status === filt;
}

function weekHeaders() {
  const t0 = parseYmd(GANTT_T0);
  const t1 = parseYmd(GANTT_T1);
  const months = [];
  for (let m = new Date(t0.getFullYear(), t0.getMonth(), 1); m <= t1; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    if (m < t0) continue;
    const label = m.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    months.push(
      <div key={label} className="cronograma-gantt-mo" style={{ left: `${ganttPos(m.toISOString().slice(0, 10))}%` }}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </div>,
    );
  }
  const weeks = [];
  for (let w = new Date(t0); w <= t1; w = new Date(w.getTime() + 7 * DAY_MS)) {
    weeks.push(
      <div key={w.toISOString()} className="cronograma-gantt-wk" style={{ left: `${ganttPos(w.toISOString().slice(0, 10))}%` }}>
        {w.getDate()}
      </div>,
    );
  }
  return { months, weeks };
}

export function CronogramaGantt({
  tasks,
  filter,
  query,
  collapsedPhases,
  onTogglePhase,
  onOpenTask,
  onDeleteTask,
  canManage,
  columnWidth,
  onColumnWidthChange,
  ownerUserDirectory,
}) {
  const scrollRef = useRef(null);
  const scrolledRef = useRef(false);
  const [gripActive, setGripActive] = useState(false);
  const today = todayYmd();
  const total = ganttTotalDays();
  const wkPct = `${(7 / total) * 100}%`;
  const pilot = pilotDate(tasks);

  const phases = useMemo(() => {
    const extra = [...new Set(tasks.map((t) => t.phase))].filter((f) => !PROJECT_PHASES.includes(f));
    return [...PROJECT_PHASES, ...extra];
  }, [tasks]);

  const filteredByPhase = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map();
    for (const phase of phases) {
      const all = tasks.filter((t) => t.phase === phase);
      const list = all
        .filter((t) => matchTask(t, filter, q, today))
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.sortOrder - b.sortOrder);
      map.set(phase, { all, list });
    }
    return map;
  }, [tasks, phases, filter, query, today]);

  useEffect(() => {
    if (scrolledRef.current || !tasks.length) return;
    const el = scrollRef.current;
    const grid = el?.querySelector('.cronograma-gantt-grid');
    if (!el || !grid) return;
    const fixed = columnWidth + OWNER_COLUMN_PX;
    if (today >= GANTT_T0 && today <= GANTT_T1 && el.scrollWidth > el.clientWidth) {
      const inner = grid.clientWidth - fixed;
      const xToday = (inner * ganttPos(today)) / 100;
      if (xToday + fixed > el.clientWidth - 80) {
        el.scrollLeft = Math.max(0, xToday - (el.clientWidth - fixed) * 0.3);
      }
    }
    scrolledRef.current = true;
  }, [tasks, columnWidth, today]);

  const onGripPointerDown = (e) => {
    e.preventDefault();
    setGripActive(true);
    const x0 = e.clientX;
    const w0 = columnWidth;
    const onMove = (ev) => onColumnWidthChange(Math.round(w0 + ev.clientX - x0), false);
    const onUp = () => {
      setGripActive(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      onColumnWidthChange(columnWidth, true);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!tasks.length) {
    return (
      <div className="cronograma-gantt panel">
        <p className="cronograma-empty">Nenhuma tarefa ainda. Use &quot;Nova tarefa&quot; para começar.</p>
      </div>
    );
  }

  const { months, weeks } = weekHeaders();

  const renderBar = (task) => {
    const late = isLate(task, today);
    const statusLabel = STATUS_LABELS[late ? 'late' : task.status];
    const tip = `${task.name} · ${fmtPtShort(task.startDate)} a ${fmtPtShort(task.endDate)} · ${statusLabel}${task.owner ? ` · ${task.owner}` : ''}`;
  const L = ganttPos(task.startDate);
  const W = Math.max(0.4, (durationDays(task) / total) * 100);

    if (task.isMilestone) {
      const color = task.status === 'done' ? 'var(--movly-purple)' : 'var(--movly-lime)';
      const X = ganttPos(task.endDate);
      return (
        <>
          <button
            type="button"
            className={`cronograma-milestone ${late ? 'cronograma-milestone--late' : ''}`}
            style={{ left: `${X}%`, background: color }}
            title={tip}
            aria-label={tip}
            onClick={() => onOpenTask(task)}
          />
          <span className="cronograma-milestone-label" style={{ left: `${X}%` }}>
            {task.name.replace(/^Marco:\s*/i, '')} · {fmtPtShort(task.endDate)}
          </span>
        </>
      );
    }

    const pct =
      task.status === 'done' ? 100 : task.status === 'cancelled' ? 0 : Number(task.progress) || 0;
    const E = L + W;
    const nameRight = E > 78;
    const barLabel =
      W > 3.2 ? (
        <span>{pct}%</span>
      ) : null;
    return (
      <>
        <span
          className={`cronograma-bar-title ${nameRight ? 'cronograma-bar-title--left' : ''}`}
          style={nameRight ? { right: `calc(${100 - L}% + 8px)` } : { left: `calc(${E}% + 8px)` }}
        >
          {task.name}
        </span>
        <button
          type="button"
          className={`cronograma-bar cronograma-bar--${task.status} ${late ? 'cronograma-bar--late' : ''}`}
          style={{ left: `${L}%`, width: `${W}%` }}
          title={tip}
          aria-label={tip}
          onClick={() => onOpenTask(task)}
        >
          <i style={{ width: `${pct}%` }} />
          {barLabel}
        </button>
      </>
    );
  };

  return (
    <div className="cronograma-gantt panel panel-body-flush" ref={scrollRef}>
      <div
        className="cronograma-gantt-grid"
        style={{
          '--cronograma-lw': `${columnWidth}px`,
          '--cronograma-ow': `${OWNER_COLUMN_PX}px`,
          '--cronograma-wk': wkPct,
        }}
      >
        <div className="cronograma-gantt-row cronograma-gantt-row--hdr">
          <div className="cronograma-gantt-label cronograma-gantt-label--hdr">
            Tarefa
            <span
              className={`cronograma-gantt-grip ${gripActive ? 'cronograma-gantt-grip--on' : ''}`}
              title="Arraste para alargar a coluna"
              onPointerDown={onGripPointerDown}
              role="presentation"
            />
          </div>
          <div className="cronograma-gantt-owners cronograma-gantt-owners--hdr muted">
            Resp.
          </div>
          <div className="cronograma-gantt-track cronograma-gantt-track--hdr">
            {months}
            {weeks}
          </div>
        </div>

        {phases.map((phase, phaseIndex) => {
          const { all, list } = filteredByPhase.get(phase) ?? { all: [], list: [] };
          if (!all.length) return null;
          if (!list.length && (filter !== 'all' || query)) return null;
          const open = !collapsedPhases.has(phase);
          const pct = weightedProgressPercent(all);
          const ini = [...all].map((t) => t.startDate).sort()[0];
          const fim = [...all].map((t) => t.endDate).sort().pop();
          const phaseW = ((durationDays({ startDate: ini, endDate: fim }) / total) * 100);
          return (
            <Fragment key={phase}>
              <div className="cronograma-gantt-row cronograma-gantt-row--phase" id={`cronograma-ph-${phaseIndex}`}>
                <button
                  type="button"
                  className="cronograma-gantt-label"
                  aria-expanded={open}
                  onClick={() => onTogglePhase(phase)}
                >
                  <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                  <span className="cronograma-gantt-name">{phase}</span>
                  <small>{pct}%</small>
                </button>
                <div className="cronograma-gantt-owners" aria-hidden="true" />
                <div className="cronograma-gantt-track">
                  <div className="cronograma-phase-bar" style={{ left: `${ganttPos(ini)}%`, width: `${phaseW}%` }}>
                    <i style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
              {open
                ? list.map((task) => {
                    const late = isLate(task, today);
                    const dot =
                      task.status === 'done'
                        ? 'var(--movly-purple)'
                        : task.status === 'in_progress'
                          ? 'var(--movly-periwinkle)'
                          : task.status === 'blocked'
                            ? 'var(--movly-orange, #d9771f)'
                            : task.status === 'postponed'
                              ? 'var(--cronograma-postponed, #64748b)'
                              : task.status === 'cancelled'
                                ? 'var(--cronograma-cancelled, #9ca3af)'
                                : 'var(--cronograma-todo)';
                    const ownerEntries = ownersFromTask(task, ownerUserDirectory);
                    return (
                      <div key={task.id} className="cronograma-gantt-row cronograma-gantt-row--task">
                        <div className="cronograma-gantt-label-wrap">
                          <button type="button" className="cronograma-gantt-label" onClick={() => onOpenTask(task)}>
                            <span className="cronograma-gantt-dot" style={{ background: late ? 'var(--danger)' : dot }} />
                            <span className="cronograma-gantt-text">
                              <span
                                className={`cronograma-gantt-name${task.status === 'cancelled' ? ' cronograma-gantt-name--cancelled' : ''}`}
                                title={task.name}
                              >
                                {task.name}
                              </span>
                              <span className="cronograma-gantt-meta muted">
                                {task.isMilestone
                                  ? `Marco · ${fmtPtShort(task.endDate)}`
                                  : `${fmtPtShort(task.startDate)} a ${fmtPtShort(task.endDate)}`}
                                {task.status !== 'done' && task.status !== 'cancelled'
                                  ? ` · ${task.progress}%`
                                  : ''}
                              </span>
                            </span>
                          </button>
                          {canManage ? (
                            <button
                              type="button"
                              className="cronograma-gantt-delete"
                              title="Excluir tarefa"
                              aria-label={`Excluir tarefa ${task.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTask?.(task);
                              }}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                        <div className="cronograma-gantt-owners">
                          <CronogramaOwnerAvatars entries={ownerEntries} />
                        </div>
                        <div className="cronograma-gantt-track">{renderBar(task)}</div>
                      </div>
                    );
                  })
                : null}
            </Fragment>
          );
        })}

        <div
          className="cronograma-recess"
          style={{
            left: `calc(var(--cronograma-gantt-fixed) + (100% - var(--cronograma-gantt-fixed)) * ${ganttPos('2026-12-24') / 100})`,
            width: `calc((100% - var(--cronograma-gantt-fixed)) * ${9 / total})`,
          }}
          title="Recesso de fim de ano"
        />
        {today >= GANTT_T0 && today <= GANTT_T1 ? (
          <div
            className="cronograma-vline cronograma-vline--today"
            style={{
              left: `calc(var(--cronograma-gantt-fixed) + (100% - var(--cronograma-gantt-fixed)) * ${ganttPos(today) / 100})`,
            }}
          >
            <b>Hoje</b>
          </div>
        ) : null}
        <div
          className="cronograma-vline cronograma-vline--pilot"
          style={{
            left: `calc(var(--cronograma-gantt-fixed) + (100% - var(--cronograma-gantt-fixed)) * ${ganttPos(pilot) / 100})`,
          }}
        >
          <b>Piloto</b>
        </div>
      </div>
    </div>
  );
}