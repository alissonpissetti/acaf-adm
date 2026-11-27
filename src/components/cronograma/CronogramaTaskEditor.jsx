import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pause, Pencil, Play, Share2, Trash2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ModalCloseButton } from '../ModalCloseButton.jsx';
import { Avatar } from '../Avatar.jsx';
import { PROJECT_PHASES, normalizeStatusProgress } from '../../lib/cronogramaMetrics.js';
import {
  buildOwnerUserDirectory,
  formatOwnerDisplay,
  ownerFormStateFromTask,
} from '../../lib/cronogramaOwners.js';
import {
  clearActiveTimer,
  computeRunningTotal,
  readActiveTimer,
  writeActiveTimer,
} from '../../lib/cronogramaTaskTimer.js';
import {
  TASK_STATUS_LABELS,
  formatDurationSeconds,
  parseTagsInput,
} from '../../lib/cronogramaTaskLabels.js';
import { CronogramaOwnerPicker } from './CronogramaOwnerPicker.jsx';
import { CronogramaTaskPeriodField } from './CronogramaTaskPeriodField.jsx';
import { CronogramaTaskPriorityPicker } from './CronogramaTaskPriorityPicker.jsx';
import { CronogramaTaskActivityPanel } from './CronogramaTaskActivityPanel.jsx';
import { CronogramaTaskAttachments } from './CronogramaTaskAttachments.jsx';

function formatPtDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PROGRESS_STEPS = Array.from({ length: 21 }, (_, i) => i * 5);

function progressSelectValue(progress, status) {
  if (status === 'done') return 100;
  const n = Math.max(0, Math.min(100, Math.floor(Number(progress) || 0)));
  return Math.round(n / 5) * 5;
}

const EMPTY_FORM = (phases, defaultRequesterId) => {
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 13 * 86_400_000).toISOString().slice(0, 10);
  return {
    name: '',
    phase: phases[3] ?? PROJECT_PHASES[3],
    startDate: today,
    endDate: end,
    status: 'todo',
    priority: 'medium',
    tagsInput: '',
    estimatedHours: 0,
    timeTrackedSeconds: 0,
    requesterUserId: defaultRequesterId ?? '',
    progress: 0,
    ownerUserIds: [],
    ownerExtra: '',
    notes: '',
    isMilestone: false,
  };
};

export function CronogramaTaskEditor({
  open,
  task,
  canManage,
  phases,
  events,
  loadingEvents,
  comments,
  loadingComments,
  submittingComment,
  deletingCommentId,
  onSubmitComment,
  onDeleteComment,
  onClose,
  onSave,
  /** Grava campos pontuais (progresso/status) sem fechar o painel — gera eventos no log. */
  onPatchPartial,
  onDelete,
  adminUsers,
  currentUserId,
  defaultRequesterUserId,
  onAttachmentError,
  onActivityRefresh,
  onShareLinkCopied,
  mobileLayout = false,
}) {
  const location = useLocation();
  const [form, setForm] = useState(null);
  const [mobilePanel, setMobilePanel] = useState('details');
  const [timerRunning, setTimerRunning] = useState(false);
  const timerBaseRef = useRef(0);
  const timerStartedAtRef = useRef(null);
  const mobileScrollRef = useRef(null);
  const desktopMainScrollRef = useRef(null);
  const titleInputRef = useRef(null);
  const titleWrapRef = useRef(null);
  const titleSnapshotRef = useRef('');
  const commitTitleEditRef = useRef(() => {});
  const [titleEditing, setTitleEditing] = useState(false);
  const ownerDirectory = useMemo(() => buildOwnerUserDirectory(adminUsers), [adminUsers]);
  const taskIdRef = useRef(task?.id);
  const onPatchPartialRef = useRef(onPatchPartial);
  taskIdRef.current = task?.id;
  onPatchPartialRef.current = onPatchPartial;

  const pauseTimerAndPersist = useCallback((persistToServer = true) => {
    const started = timerStartedAtRef.current;
    if (!started) {
      return timerBaseRef.current;
    }
    const total = computeRunningTotal(timerBaseRef.current, started);
    timerBaseRef.current = total;
    timerStartedAtRef.current = null;
    setTimerRunning(false);
    setForm((f) => (f ? { ...f, timeTrackedSeconds: total } : f));
    const taskId = taskIdRef.current;
    if (taskId) {
      clearActiveTimer(taskId);
      if (persistToServer && onPatchPartialRef.current) {
        void onPatchPartialRef.current({ timeTrackedSeconds: total });
      }
    }
    return total;
  }, []);

  useEffect(() => {
    if (!open) {
      const started = timerStartedAtRef.current;
      if (started && taskIdRef.current) {
        const total = computeRunningTotal(timerBaseRef.current, started);
        clearActiveTimer(taskIdRef.current);
        if (onPatchPartialRef.current) {
          void onPatchPartialRef.current({ timeTrackedSeconds: total });
        }
      }
      setTimerRunning(false);
      timerStartedAtRef.current = null;
      setMobilePanel('details');
      setTitleEditing(false);
      return;
    }
    setMobilePanel('details');
    if (mobileScrollRef.current) {
      mobileScrollRef.current.scrollTop = 0;
    }
    if (task) {
      const owners = ownerFormStateFromTask(task, ownerDirectory);
      const stored = readActiveTimer(task.id);
      const baseFromServer = task.timeTrackedSeconds ?? 0;
      let timeTrackedSeconds = baseFromServer;
      let resumeTimer = false;
      if (stored) {
        timerBaseRef.current = stored.baseSeconds;
        timerStartedAtRef.current = stored.startedAt;
        timeTrackedSeconds = computeRunningTotal(stored.baseSeconds, stored.startedAt);
        resumeTimer = true;
      } else {
        timerBaseRef.current = baseFromServer;
        timerStartedAtRef.current = null;
        resumeTimer = false;
      }
      setForm({
        name: task.name,
        phase: task.phase,
        startDate: task.startDate,
        endDate: task.endDate,
        status: task.status,
        priority: task.priority ?? 'medium',
        tagsInput: (task.tags ?? []).join(', '),
        estimatedHours: task.estimatedHours ?? 0,
        timeTrackedSeconds,
        requesterUserId: task.requesterUserId ?? defaultRequesterUserId ?? currentUserId ?? '',
        progress: task.progress ?? 0,
        ownerUserIds: owners.ownerUserIds,
        ownerExtra: owners.ownerExtra,
        notes: task.notes ?? '',
        isMilestone: Boolean(task.isMilestone),
      });
      setTimerRunning(resumeTimer);
    } else {
      timerBaseRef.current = 0;
      timerStartedAtRef.current = null;
      setTimerRunning(false);
      setForm(EMPTY_FORM(phases, defaultRequesterUserId ?? currentUserId));
    }
  }, [open, task?.id, phases, ownerDirectory, currentUserId, defaultRequesterUserId]);

  useEffect(() => {
    if (!open || !timerRunning) return undefined;
    const onPageHide = () => {
      const started = timerStartedAtRef.current;
      const taskId = taskIdRef.current;
      if (!started || !taskId) return;
      writeActiveTimer({
        taskId,
        startedAt: started,
        baseSeconds: timerBaseRef.current,
      });
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [open, timerRunning]);

  const resetEditorScroll = () => {
    const el = mobileLayout ? mobileScrollRef.current : desktopMainScrollRef.current;
    if (el) el.scrollTop = 0;
  };

  useLayoutEffect(() => {
    if (!open) return;
    resetEditorScroll();
    const raf = requestAnimationFrame(() => {
      resetEditorScroll();
      requestAnimationFrame(resetEditorScroll);
    });
    const t1 = window.setTimeout(resetEditorScroll, 0);
    const t2 = window.setTimeout(resetEditorScroll, 80);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open, mobileLayout, task?.id]);

  useEffect(() => {
    if (!open || !mobileLayout) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, mobileLayout]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const id = window.setInterval(() => {
      const started = timerStartedAtRef.current;
      if (!started) return;
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setForm((f) =>
        f ? { ...f, timeTrackedSeconds: timerBaseRef.current + elapsed } : f,
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useLayoutEffect(() => {
    if (!titleEditing) return undefined;
    const id = requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [titleEditing]);

  useEffect(() => {
    if (!titleEditing) return undefined;
    const onPointerDown = (event) => {
      if (titleWrapRef.current?.contains(event.target)) return;
      commitTitleEditRef.current();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [titleEditing]);

  if (!open || !form) return null;

  const titleCode = task?.code ? `#${task.code}` : task ? '—' : 'Nova';
  const breadcrumb = `Movly / ${form.phase}`;

  const toggleTimer = () => {
    if (!canManage) return;
    if (timerRunning) {
      pauseTimerAndPersist(true);
      return;
    }
    timerBaseRef.current = Math.max(0, Math.floor(form.timeTrackedSeconds ?? 0));
    const startedAt = Date.now();
    timerStartedAtRef.current = startedAt;
    setTimerRunning(true);
    if (task?.id) {
      writeActiveTimer({
        taskId: task.id,
        startedAt,
        baseSeconds: timerBaseRef.current,
      });
    }
  };

  const applyStatusProgress = (nextStatus, nextProgress, persist) => {
    let status = nextStatus;
    let progress = nextProgress;
    if (status === 'done' && progress < 100) {
      progress = 100;
    }
    if (status !== 'done' && status !== 'cancelled' && progress === 100) {
      status = 'done';
      progress = 100;
    }
    const normalized = normalizeStatusProgress(status, progress);
    setForm((f) => (f ? { ...f, status: normalized.status, progress: normalized.progress } : f));
    if (persist && task?.id && onPatchPartial) {
      void onPatchPartial({ status: normalized.status, progress: normalized.progress });
    }
  };

  const buildPayload = () => {
    let { status, progress } = normalizeStatusProgress(form.status, form.progress);
    let startDate = form.startDate;
    let endDate = form.isMilestone ? startDate : form.endDate;
    const owner = formatOwnerDisplay(form.ownerUserIds, form.ownerExtra, ownerDirectory.byId);
    const ownerUserIds = form.ownerUserIds?.length ? form.ownerUserIds : null;
    return {
      name: form.name.trim(),
      phase: form.phase,
      startDate,
      endDate,
      status,
      priority: form.priority,
      tags: parseTagsInput(form.tagsInput),
      estimatedHours: Number(form.estimatedHours) || 0,
      timeTrackedSeconds: form.timeTrackedSeconds,
      ...(task?.id
        ? {}
        : { requesterUserId: form.requesterUserId?.trim() || null }),
      progress,
      owner,
      ownerUserIds,
      notes: form.notes.trim() || null,
      isMilestone: form.isMilestone,
    };
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!canManage) return;
    if (!form.name?.trim()) {
      startTitleEdit();
      return;
    }
    const timeTrackedSeconds = timerRunning
      ? pauseTimerAndPersist(true)
      : Math.max(0, Math.floor(form.timeTrackedSeconds ?? 0));
    const payload = { ...buildPayload(), timeTrackedSeconds };
    if (payload.endDate < payload.startDate) return;
    onSave(payload);
  };

  const copyTaskShareLink = async () => {
    if (!task?.id) return;
    const url = `${window.location.origin}${location.pathname}?task=${encodeURIComponent(task.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      onShareLinkCopied?.();
    } catch {
      onShareLinkCopied?.('Não foi possível copiar o link.');
    }
  };

  const taskTitle =
    form.name?.trim() || task?.name?.trim() || (task ? 'Sem título' : 'Nova tarefa');

  const onProgressSelect = (progress) => {
    let status = form.status;
    if (status === 'done' && progress < 100) status = 'in_progress';
    applyStatusProgress(status, progress, Boolean(task?.id));
  };

  const onPriorityChange = (priority) => {
    setForm((f) => (f ? { ...f, priority } : f));
    if (task?.id && onPatchPartial) {
      void onPatchPartial({ priority });
    }
  };

  const onPatchDates = ({ startDate, endDate }) => {
    if (task?.id && onPatchPartial) {
      void onPatchPartial({ startDate, endDate });
    }
  };

  const startTitleEdit = () => {
    if (!canManage) return;
    titleSnapshotRef.current = form.name ?? '';
    setTitleEditing(true);
  };

  const cancelTitleEdit = () => {
    setForm((f) => (f ? { ...f, name: titleSnapshotRef.current } : f));
    setTitleEditing(false);
  };

  const commitTitleEdit = () => {
    if (!titleEditing) return;
    setTitleEditing(false);
    const trimmed = form.name?.trim() ?? '';
    if (!trimmed) {
      setForm((f) => (f ? { ...f, name: titleSnapshotRef.current } : f));
      return;
    }
    setForm((f) => (f ? { ...f, name: trimmed } : f));
    const prev = (task?.name ?? titleSnapshotRef.current).trim();
    if (task?.id && onPatchPartial && trimmed !== prev) {
      void onPatchPartial({ name: trimmed });
    }
  };

  commitTitleEditRef.current = commitTitleEdit;

  const dialogClass = mobileLayout
    ? 'cronograma-dialog cronograma-dialog--task-detail cronograma-dialog--mobile panel'
    : 'cronograma-dialog cronograma-dialog--task-detail cronograma-dialog--desktop panel';

  const overlay = (
    <div
      className={`cronograma-overlay cronograma-overlay--task-detail${
        mobileLayout ? ' cronograma-overlay--mobile' : ''
      }`}
      role="presentation"
      onClick={(e) => !mobileLayout && e.target === e.currentTarget && onClose()}
    >
      <form
        className={dialogClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cronograma-editor-title"
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cronograma-task-head">
          <div className="cronograma-task-head-row">
            <div className="cronograma-task-head-main">
              {!mobileLayout ? <p className="cronograma-task-breadcrumb">{breadcrumb}</p> : null}
              <div className="cronograma-task-head-title-wrap" ref={titleWrapRef}>
                {titleEditing ? (
                  <>
                    <input
                      ref={titleInputRef}
                      type="text"
                      className="cronograma-task-title-input"
                      id="cronograma-editor-title"
                      value={form.name}
                      onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                      onBlur={() => commitTitleEdit()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitTitleEdit();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelTitleEdit();
                        }
                      }}
                      disabled={!canManage}
                      aria-label="Nome da tarefa"
                      autoComplete="off"
                    />
                    <span className="cronograma-task-code">{titleCode}</span>
                  </>
                ) : (
                  <h2 id="cronograma-editor-title">
                    {taskTitle} <span className="cronograma-task-code">{titleCode}</span>
                  </h2>
                )}
                <div className="cronograma-task-head-title-tools">
                  <CronogramaTaskPriorityPicker
                    value={form.priority}
                    onChange={onPriorityChange}
                    disabled={!canManage}
                    compact
                  />
                  {canManage && !titleEditing ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm cronograma-task-title-edit-btn"
                      onClick={startTitleEdit}
                      title="Editar nome"
                      aria-label="Editar nome da tarefa"
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>
              {task?.updatedAt ? (
                <p className="muted cronograma-task-updated">
                  Atualizado por {task.updatedByName || '—'} em {formatPtDateTime(task.updatedAt)}
                </p>
              ) : null}
            </div>
            <div className="cronograma-task-head-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm cronograma-task-share-icon"
                disabled={!task?.id}
                onClick={() => void copyTaskShareLink()}
                title={task?.id ? 'Copiar link desta tarefa' : 'Salve a tarefa para compartilhar'}
                aria-label="Compartilhar tarefa"
              >
                <Share2 size={18} aria-hidden="true" />
              </button>
              <ModalCloseButton onClick={onClose} className="cronograma-task-close" />
            </div>
          </div>
        </header>

        {mobileLayout ? (
          <>
            <div className="cronograma-task-mobile-scroll" ref={mobileScrollRef}>
              <div
                className="cronograma-task-mobile-tabs"
                role="tablist"
                aria-label="Seções da tarefa"
              >
                <button
                  type="button"
                  role="tab"
                  id="cronograma-task-tab-details"
                  className={`cronograma-task-mobile-tab${mobilePanel === 'details' ? ' is-active' : ''}`}
                  aria-selected={mobilePanel === 'details'}
                  aria-controls="cronograma-task-panel-details"
                  onClick={() => setMobilePanel('details')}
                >
                  Detalhes
                </button>
                <button
                  type="button"
                  role="tab"
                  id="cronograma-task-tab-activity"
                  className={`cronograma-task-mobile-tab${mobilePanel === 'activity' ? ' is-active' : ''}`}
                  aria-selected={mobilePanel === 'activity'}
                  aria-controls="cronograma-task-panel-activity"
                  onClick={() => setMobilePanel('activity')}
                >
                  Atividade
                  {(comments?.length ?? 0) > 0 ? (
                    <span className="cronograma-task-mobile-tab-badge">{comments.length}</span>
                  ) : null}
                </button>
              </div>

              {mobilePanel === 'details' ? (
                <div className="cronograma-task-main" id="cronograma-task-panel-details" role="tabpanel">
                  {motionTaskDetails({
                    form,
                    setForm,
                    canManage,
                    phases,
                    task,
                    timerRunning,
                    toggleTimer,
                    applyStatusProgress,
                    adminUsers,
                    currentUserId,
                    ownerUserIds: form.ownerUserIds,
                    ownerExtra: form.ownerExtra,
                    onAttachmentError,
                    onActivityRefresh,
                    onProgressSelect,
                    onPatchDates,
                  })}
                </div>
              ) : (
                <CronogramaTaskActivityPanel
                  taskId={task?.id}
                  canManage={canManage}
                  currentUserId={currentUserId}
                  events={events}
                  loadingEvents={loadingEvents}
                  comments={comments}
                  loadingComments={loadingComments}
                  onSubmitComment={onSubmitComment}
                  onDeleteComment={onDeleteComment}
                  submittingComment={submittingComment}
                  deletingCommentId={deletingCommentId}
                  adminUsers={adminUsers}
                  mobileLayout
                  panelId="cronograma-task-panel-activity"
                  tabLabelledBy="cronograma-task-tab-activity"
                />
              )}
            </div>
          </>
        ) : (
            <div className="cronograma-task-layout">
              <div
                className="cronograma-task-main cronograma-task-main--scroll"
                ref={desktopMainScrollRef}
              >
                {motionTaskDetails({
                  form,
                  setForm,
                  canManage,
                  phases,
                  task,
                  timerRunning,
                  toggleTimer,
                  applyStatusProgress,
                  adminUsers,
                  currentUserId,
                  ownerUserIds: form.ownerUserIds,
                  ownerExtra: form.ownerExtra,
                  onAttachmentError,
                  onActivityRefresh,
                  onProgressSelect,
                  onPatchDates,
                })}
              </div>

              <CronogramaTaskActivityPanel
                taskId={task?.id}
                canManage={canManage}
                currentUserId={currentUserId}
                events={events}
                loadingEvents={loadingEvents}
                comments={comments}
                loadingComments={loadingComments}
                onSubmitComment={onSubmitComment}
                onDeleteComment={onDeleteComment}
                submittingComment={submittingComment}
                deletingCommentId={deletingCommentId}
                adminUsers={adminUsers}
              />
            </div>
        )}

        {mobileLayout ? (
            <footer className="cronograma-dialog-actions cronograma-task-foot cronograma-task-foot--mobile">
              {task && canManage ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-danger cronograma-task-foot-icon"
                  onClick={onDelete}
                  title="Excluir tarefa"
                  aria-label="Excluir tarefa"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={!canManage}>
                {canManage ? 'Salvar' : 'Leitura'}
              </button>
            </footer>
        ) : (
            <footer className="cronograma-dialog-actions cronograma-task-foot">
              <button type="submit" className="btn btn-primary" disabled={!canManage}>
                {canManage ? 'Salvar' : 'Somente leitura'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              {task && canManage ? (
                <button type="button" className="btn btn-ghost btn-danger cronograma-dialog-delete" onClick={onDelete}>
                  <Trash2 size={16} aria-hidden="true" /> Excluir tarefa
                </button>
              ) : null}
            </footer>
        )}
      </form>
    </div>
  );

  return createPortal(overlay, document.body);
}

function motionTaskDetails({
  form,
  setForm,
  canManage,
  phases,
  task,
  timerRunning,
  toggleTimer,
  applyStatusProgress,
  adminUsers,
  currentUserId,
  ownerUserIds,
  ownerExtra,
  onAttachmentError,
  onActivityRefresh,
  onProgressSelect,
  onPatchDates,
}) {
  return (
    <>
      {motionMetaGrid({
        form,
        setForm,
        canManage,
        phases,
        toggleTimer,
        timerRunning,
        adminUsers,
        currentUserId,
        ownerUserIds,
        ownerExtra,
        onProgressSelect,
        onPatchDates,
        taskId: task?.id,
        onStatusChange: (status) =>
          applyStatusProgress(status, form.progress, Boolean(task?.id)),
      })}

      <label className="cronograma-field cronograma-field--wide cronograma-task-description">
        <span className="cronograma-task-field-label">Descrição</span>
        <textarea
          rows={4}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          disabled={!canManage}
          placeholder="Contexto, critérios de aceite, links…"
        />
      </label>

      <label className="cronograma-checkbox cronograma-task-milestone">
        <input
          type="checkbox"
          checked={form.isMilestone}
          onChange={(e) =>
            setForm((f) => {
              const isMilestone = e.target.checked;
              return isMilestone
                ? { ...f, isMilestone: true, endDate: f.startDate }
                : { ...f, isMilestone: false };
            })
          }
          disabled={!canManage}
        />
        É um marco (data única)
      </label>

      <CronogramaTaskAttachments
        taskId={task?.id}
        canManage={canManage}
        onError={onAttachmentError}
        onActivityRefresh={onActivityRefresh}
      />
    </>
  );
}

function motionMetaGrid({
  form,
  setForm,
  canManage,
  phases,
  toggleTimer,
  timerRunning,
  adminUsers,
  currentUserId,
  ownerUserIds,
  ownerExtra,
  onProgressSelect,
  onPatchDates,
  taskId,
  onStatusChange,
}) {
  return (
    <div className="cronograma-task-meta-grid">
      {motionTaskMetaTopRow({
        form,
        setForm,
        canManage,
        phases,
        toggleTimer,
        timerRunning,
      })}

      {motionTaskPeopleBand({
        form,
        setForm,
        canManage,
        adminUsers,
        currentUserId,
        ownerUserIds,
        ownerExtra,
        onProgressSelect,
        onStatusChange,
        taskId,
        onPatchDates,
      })}
    </div>
  );
}

function motionTaskMetaTopRow({ form, setForm, canManage, phases, toggleTimer, timerRunning }) {
  return (
    <div className="cronograma-task-meta-top cronograma-field--wide">
      <div className="cronograma-task-meta-top-line cronograma-task-body-row">
        <div className="cronograma-field cronograma-field--timer">
          <span className="cronograma-task-field-label">Tempo rastreado</span>
          <div className="cronograma-task-timer">
            <span className="cronograma-task-timer-display" aria-live="polite">
              {formatDurationSeconds(form.timeTrackedSeconds)}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm cronograma-task-timer-btn"
              onClick={toggleTimer}
              disabled={!canManage}
              aria-pressed={timerRunning}
            >
              {timerRunning ? <Pause size={16} /> : <Play size={16} />}
              {timerRunning ? 'Pausar' : 'Iniciar'}
            </button>
          </div>
        </div>

        <label className="cronograma-field">
          <span className="cronograma-task-field-label">Horas estimadas</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={form.estimatedHours}
            onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))}
            disabled={!canManage}
          />
        </label>

        <label className="cronograma-field">
          <span className="cronograma-task-field-label">Fase / projeto</span>
          <select
            value={form.phase}
            onChange={(e) => setForm((f) => ({ ...f, phase: e.target.value }))}
            disabled={!canManage}
          >
            {phases.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function motionTaskPeopleBand({
  form,
  setForm,
  canManage,
  adminUsers,
  currentUserId,
  ownerUserIds,
  ownerExtra,
  onProgressSelect,
  onStatusChange,
  taskId,
  onPatchDates,
}) {
  const progressValue = progressSelectValue(form.progress, form.status);
  const doneLocked = form.status === 'done';
  const requesterUser = adminUsers.find((u) => u.id === form.requesterUserId);

  return (
    <div
      className="cronograma-task-people-band cronograma-field--wide"
      role="group"
      aria-label="Pessoas, situação e status"
    >
      <div className="cronograma-task-people-band-line cronograma-task-body-row">
        <div className="cronograma-task-people-cell cronograma-task-people-cell--requester">
          <span className="cronograma-task-field-label">Solicitante</span>
          {motionRequesterDisplay(requesterUser)}
        </div>

        <label className="cronograma-task-people-cell cronograma-field">
          <span className="cronograma-task-field-label">Situação</span>
          <select
            value={progressValue}
            onChange={(e) => onProgressSelect(Number(e.target.value))}
            disabled={!canManage || doneLocked}
          >
            {PROGRESS_STEPS.map((pct) => (
              <option key={pct} value={pct}>
                {pct === 100 ? '100% · Finalizada' : `${pct}%`}
              </option>
            ))}
          </select>
        </label>

        <label className="cronograma-task-people-cell cronograma-field">
          <span className="cronograma-task-field-label">Status</span>
          <select
            value={form.status}
            onChange={(e) => onStatusChange?.(e.target.value)}
            disabled={!canManage}
          >
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="cronograma-task-people-band-line cronograma-task-body-row">
        <div className="cronograma-task-people-cell cronograma-task-people-cell--owners">
          <span className="cronograma-task-field-label">Responsáveis</span>
          <CronogramaOwnerPicker
            users={adminUsers}
            currentUserId={currentUserId}
            selectedIds={ownerUserIds}
            ownerExtra={ownerExtra}
            onChangeIds={(ids) => setForm((f) => ({ ...f, ownerUserIds: ids }))}
            onChangeExtra={(extra) => setForm((f) => ({ ...f, ownerExtra: extra }))}
            disabled={!canManage}
            stacked
          />
        </div>

        <div className="cronograma-task-people-cell cronograma-task-people-cell--period">
          <CronogramaTaskPeriodField
            form={form}
            setForm={setForm}
            canManage={canManage}
            taskId={taskId}
            onPatchDates={onPatchDates}
            inBand
          />
        </div>
      </div>
    </div>
  );
}

function motionRequesterDisplay(requesterUser, { size = 'sm' } = {}) {
  const displayName = requesterUser?.name ?? '—';

  return (
    <div
      className="cronograma-task-requester-avatar cronograma-task-requester-avatar--readonly"
      title={`Solicitante: ${displayName}`}
      aria-label={`Solicitante: ${displayName}`}
    >
      {requesterUser ? (
        <Avatar
          name={displayName}
          src={requesterUser.avatarUrl}
          color={requesterUser.avatarColor}
          size={size}
        />
      ) : (
        <span className="cronograma-assignee-placeholder" aria-hidden="true" title="Sem solicitante" />
      )}
    </div>
  );
}