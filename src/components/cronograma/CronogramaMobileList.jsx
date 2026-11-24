import { useMemo } from 'react';
import { ChevronDown, Flag } from 'lucide-react';
import {
  PROJECT_PHASES,
  STATUS_LABELS,
  fmtPtShort,
  isLate,
  todayYmd,
  weightedProgressPercent,
} from '../../lib/cronogramaMetrics.js';
import { ownersFromTask } from '../../lib/cronogramaOwners.js';
import { CronogramaOwnerAvatars } from './CronogramaOwnerAvatars.jsx';

function matchTask(task, filt, q, today) {
  const hay = `${task.name} ${task.owner ?? ''} ${task.notes ?? ''}`.toLowerCase();
  if (q && !hay.includes(q)) return false;
  if (filt === 'all') return true;
  if (filt === 'late') return isLate(task, today);
  return task.status === filt;
}

function taskProgress(task) {
  if (task.status === 'done') return 100;
  if (task.status === 'cancelled') return 0;
  return Number(task.progress) || 0;
}

function statusKey(task, today) {
  return isLate(task, today) ? 'late' : task.status;
}

export function CronogramaMobileList({
  tasks,
  filter,
  query,
  collapsedPhases,
  onTogglePhase,
  onOpenTask,
  ownerUserDirectory,
}) {
  const today = todayYmd();

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

  if (!tasks.length) {
    return (
      <div className="cronograma-mobile panel">
        <p className="cronograma-empty">Nenhuma tarefa ainda. Use &quot;Nova tarefa&quot; para começar.</p>
      </div>
    );
  }

  return (
    <div className="cronograma-mobile panel" aria-label="Cronograma em lista">
      <p className="cronograma-mobile-hint muted">
        Visualização otimizada para celular — toque numa tarefa para ver detalhes.
      </p>
      <div className="cronograma-mobile-list">
        {phases.map((phase, phaseIndex) => {
          const { all, list } = filteredByPhase.get(phase) ?? { all: [], list: [] };
          if (!all.length) return null;
          if (!list.length && (filter !== 'all' || query)) return null;
          const open = !collapsedPhases.has(phase);
          const pct = weightedProgressPercent(all);

          return (
            <section key={phase} className="cronograma-mob-phase" id={`cronograma-mob-ph-${phaseIndex}`}>
              <button
                type="button"
                className={`cronograma-mob-phase-head${open ? ' is-open' : ''}`}
                aria-expanded={open}
                onClick={() => onTogglePhase(phase)}
              >
                <ChevronDown className="cronograma-mob-phase-chevron" size={18} aria-hidden />
                <span className="cronograma-mob-phase-title">{phase}</span>
                <span className="cronograma-mob-phase-pct">{pct}%</span>
              </button>
              <div className="cronograma-mob-phase-bar" aria-hidden>
                <i style={{ width: `${pct}%` }} />
              </div>
              {open ? (
                <ul className="cronograma-mob-tasks">
                  {list.map((task) => (
                    <li key={task.id}>
                      <MobileTaskCard
                        task={task}
                        today={today}
                        ownerUserDirectory={ownerUserDirectory}
                        onOpen={() => onOpenTask(task)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MobileTaskCard({ task, today, ownerUserDirectory, onOpen }) {
  const late = isLate(task, today);
  const sk = statusKey(task, today);
  const statusLabel = STATUS_LABELS[sk] ?? task.status;
  const pct = taskProgress(task);
  const owners = ownersFromTask(task, ownerUserDirectory);

  return (
    <button type="button" className={`cronograma-mob-card cronograma-mob-card--${task.status}`} onClick={onOpen}>
      <div className="cronograma-mob-card-top">
        {task.isMilestone ? (
          <Flag className="cronograma-mob-milestone-icon" size={16} aria-hidden />
        ) : (
          <span className={`cronograma-mob-dot cronograma-mob-dot--${late ? 'late' : task.status}`} aria-hidden />
        )}
        <span className={`cronograma-mob-name${task.status === 'cancelled' ? ' cronograma-mob-name--cancelled' : ''}`}>
          {task.name}
        </span>
        <span className={`cronograma-mob-status cronograma-mob-status--${sk}`}>{statusLabel}</span>
      </div>
      <p className="cronograma-mob-dates muted">
        {task.isMilestone
          ? `Marco · ${fmtPtShort(task.endDate)}`
          : `${fmtPtShort(task.startDate)} → ${fmtPtShort(task.endDate)}`}
        {!task.isMilestone && task.status !== 'done' && task.status !== 'cancelled' ? ` · ${pct}%` : ''}
      </p>
      {!task.isMilestone ? (
        <div className="cronograma-mob-progress" aria-hidden>
          <i className={`cronograma-mob-progress-fill cronograma-mob-progress-fill--${task.status}`} style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      <div className="cronograma-mob-owners">
        <CronogramaOwnerAvatars entries={owners} />
      </div>
    </button>
  );
}