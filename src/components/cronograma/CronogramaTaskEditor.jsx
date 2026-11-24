import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Trash2 } from 'lucide-react';
import { ModalCloseButton } from '../ModalCloseButton.jsx';
import { Avatar } from '../Avatar.jsx';
import { PROJECT_PHASES, normalizeStatusProgress } from '../../lib/cronogramaMetrics.js';
import {
  buildOwnerUserDirectory,
  formatOwnerDisplay,
  ownerFormStateFromTask,
} from '../../lib/cronogramaOwners.js';
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  formatDurationSeconds,
  parseTagsInput,
} from '../../lib/cronogramaTaskLabels.js';
import { CronogramaOwnerPicker } from './CronogramaOwnerPicker.jsx';
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

function formatYmdPt(ymd) {
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
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
  onSubmitComment,
  onClose,
  onSave,
  onDelete,
  adminUsers,
  currentUserId,
  onAttachmentError,
  onActivityRefresh,
}) {
  const [form, setForm] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerBaseRef = useRef(0);
  const timerStartedAtRef = useRef(null);
  const ownerDirectory = useMemo(() => buildOwnerUserDirectory(adminUsers), [adminUsers]);

  useEffect(() => {
    if (!open) {
      setTimerRunning(false);
      timerStartedAtRef.current = null;
      return;
    }
    if (task) {
      const owners = ownerFormStateFromTask(task, ownerDirectory);
      setForm({
        name: task.name,
        phase: task.phase,
        startDate: task.startDate,
        endDate: task.endDate,
        status: task.status,
        priority: task.priority ?? 'medium',
        tagsInput: (task.tags ?? []).join(', '),
        estimatedHours: task.estimatedHours ?? 0,
        timeTrackedSeconds: task.timeTrackedSeconds ?? 0,
        requesterUserId: task.requesterUserId ?? currentUserId ?? '',
        progress: task.progress ?? 0,
        ownerUserIds: owners.ownerUserIds,
        ownerExtra: owners.ownerExtra,
        notes: task.notes ?? '',
        isMilestone: Boolean(task.isMilestone),
      });
    } else {
      setForm(EMPTY_FORM(phases, currentUserId));
    }
  }, [open, task, phases, ownerDirectory, currentUserId]);

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

  if (!open || !form) return null;

  const requesterUser = adminUsers.find((u) => u.id === form.requesterUserId);
  const titleCode = task?.code ? `#${task.code}` : task ? '—' : 'Nova';
  const breadcrumb = `Movly / ${form.phase}`;

  const toggleTimer = () => {
    if (!canManage) return;
    if (timerRunning) {
      setTimerRunning(false);
      timerStartedAtRef.current = null;
      return;
    }
    timerBaseRef.current = form.timeTrackedSeconds;
    timerStartedAtRef.current = Date.now();
    setTimerRunning(true);
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
      requesterUserId: form.requesterUserId?.trim() || null,
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
    const payload = buildPayload();
    if (payload.endDate < payload.startDate) return;
    if (timerRunning) {
      setTimerRunning(false);
      timerStartedAtRef.current = null;
    }
    onSave(payload);
  };

  return (
    <div
      className="cronograma-overlay cronograma-overlay--task-detail"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="cronograma-dialog cronograma-dialog--task-detail panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cronograma-editor-title"
        onSubmit={onSubmit}
      >
        <header className="cronograma-task-head">
          <div className="cronograma-task-head-main">
            <p className="cronograma-task-breadcrumb">{breadcrumb}</p>
            <h2 id="cronograma-editor-title">
              {form.name?.trim() || (task ? 'Sem título' : 'Nova tarefa')}{' '}
              <span className="cronograma-task-code">{titleCode}</span>
            </h2>
            {task?.updatedAt ? (
              <p className="muted cronograma-task-updated">
                Atualizado por {task.updatedByName || '—'} em {formatPtDateTime(task.updatedAt)}
              </p>
            ) : null}
          </div>
          <ModalCloseButton onClick={onClose} className="cronograma-task-close" />
        </header>

        <div className="cronograma-task-layout">
          <div className="cronograma-task-main">
            <motionMetaGrid
              form={form}
              setForm={setForm}
              canManage={canManage}
              phases={phases}
              adminUsers={adminUsers}
              requesterUser={requesterUser}
              toggleTimer={toggleTimer}
              timerRunning={timerRunning}
            />

            <div className="cronograma-field cronograma-field--wide cronograma-field--owners cronograma-task-owners">
              <span className="cronograma-task-field-label">Responsáveis</span>
              <CronogramaOwnerPicker
                users={adminUsers}
                currentUserId={currentUserId}
                selectedIds={form.ownerUserIds}
                ownerExtra={form.ownerExtra}
                onChangeIds={(ownerUserIds) => setForm((f) => ({ ...f, ownerUserIds }))}
                onChangeExtra={(ownerExtra) => setForm((f) => ({ ...f, ownerExtra }))}
                disabled={!canManage}
              />
            </div>

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

            <motionProgress
              value={form.progress}
              disabled={!canManage}
              onChange={(progress) => setForm((f) => ({ ...f, progress }))}
            />

            <label className="cronograma-field cronograma-field--wide cronograma-checkbox">
              <input
                type="checkbox"
                checked={form.isMilestone}
                onChange={(e) => setForm((f) => ({ ...f, isMilestone: e.target.checked }))}
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
          </div>

          <CronogramaTaskActivityPanel
            taskId={task?.id}
            canManage={canManage}
            events={events}
            loadingEvents={loadingEvents}
            comments={comments}
            loadingComments={loadingComments}
            onSubmitComment={onSubmitComment}
            submittingComment={submittingComment}
            adminUsers={adminUsers}
          />
        </div>

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
      </form>
    </div>
  );
}

function motionMetaGrid({
  form,
  setForm,
  canManage,
  phases,
  adminUsers,
  requesterUser,
  toggleTimer,
  timerRunning,
}) {
  return (
    <div className="cronograma-task-meta-grid">
      <label className="cronograma-field cronograma-field--wide">
        <span className="cronograma-task-field-label">Nome</span>
        <input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          disabled={!canManage}
        />
      </label>

      <div className="cronograma-field">
        <span className="cronograma-task-field-label">Solicitante</span>
        <motionRequester form={form} setForm={setForm} canManage={canManage} adminUsers={adminUsers} requesterUser={requesterUser} />
      </div>

      <label className="cronograma-field">
        <span className="cronograma-task-field-label">Status</span>
        <select
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          disabled={!canManage}
        >
          {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="cronograma-field">
        <span className="cronograma-task-field-label">Prioridade</span>
        <select
          value={form.priority}
          onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
          disabled={!canManage}
        >
          {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="cronograma-field">
        <span className="cronograma-task-field-label">Início</span>
        <input
          type="date"
          required
          value={form.startDate}
          onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          disabled={!canManage}
        />
      </label>

      <label className="cronograma-field">
        <span className="cronograma-task-field-label">Vencimento</span>
        <input
          type="date"
          required
          value={form.isMilestone ? form.startDate : form.endDate}
          onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
          disabled={!canManage || form.isMilestone}
        />
      </label>

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

      <label className="cronograma-field cronograma-field--wide">
        <span className="cronograma-task-field-label">Tags</span>
        <input
          value={form.tagsInput}
          onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
          disabled={!canManage}
          placeholder="Buscar ou criar tags… (separe por vírgula)"
        />
      </label>

      {!form.isMilestone ? (
        <p className="muted cronograma-task-date-hint cronograma-field--wide">
          Prazo visível: {formatYmdPt(form.endDate)}
        </p>
      ) : null}
    </div>
  );
}

function motionProgress({ value, disabled, onChange }) {
  return (
    <div className="cronograma-task-progress">
      <span className="cronograma-task-field-label">Progresso</span>
      <div className="cronograma-task-progress-row">
        <input
          type="range"
          className="cronograma-task-progress-range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        <span className="cronograma-task-progress-value" aria-hidden="true">
          {value}%
        </span>
      </div>
    </div>
  );
}

function motionRequester({ form, setForm, canManage, adminUsers, requesterUser }) {
  return (
    <div className="cronograma-task-requester">
      {requesterUser ? (
        <div className="cronograma-task-requester-chip">
          <Avatar
            name={requesterUser.name}
            src={requesterUser.avatarUrl}
            color={requesterUser.avatarColor}
            size="sm"
          />
          <span>{requesterUser.name}</span>
        </div>
      ) : null}
      <select
        value={form.requesterUserId}
        onChange={(e) => setForm((f) => ({ ...f, requesterUserId: e.target.value }))}
        disabled={!canManage}
        className="cronograma-task-requester-select"
      >
        <option value="">—</option>
        {adminUsers.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  );
}