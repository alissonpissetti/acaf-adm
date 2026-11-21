import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { PROJECT_PHASES, normalizeStatusProgress } from '../../lib/cronogramaMetrics.js';
import {
  buildOwnerUserDirectory,
  formatOwnerDisplay,
  ownerFormStateFromTask,
} from '../../lib/cronogramaOwners.js';
import { CronogramaOwnerPicker } from './CronogramaOwnerPicker.jsx';

function formatPtDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function CronogramaTaskEditor({
  open,
  task,
  canManage,
  phases,
  events,
  loadingEvents,
  onClose,
  onSave,
  onDelete,
  adminUsers,
}) {
  const [form, setForm] = useState(null);
  const ownerDirectory = useMemo(() => buildOwnerUserDirectory(adminUsers), [adminUsers]);

  useEffect(() => {
    if (!open) return;
    if (task) {
      const owners = ownerFormStateFromTask(task, ownerDirectory);
      setForm({
        name: task.name,
        phase: task.phase,
        startDate: task.startDate,
        endDate: task.endDate,
        status: task.status,
        progress: task.progress ?? 0,
        ownerUserIds: owners.ownerUserIds,
        ownerExtra: owners.ownerExtra,
        notes: task.notes ?? '',
        isMilestone: Boolean(task.isMilestone),
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const end = new Date(Date.now() + 13 * 86_400_000).toISOString().slice(0, 10);
      setForm({
        name: '',
        phase: phases[3] ?? PROJECT_PHASES[3],
        startDate: today,
        endDate: end,
        status: 'todo',
        progress: 0,
        ownerUserIds: [],
        ownerExtra: '',
        notes: '',
        isMilestone: false,
      });
    }
  }, [open, task, phases, ownerDirectory]);

  if (!open || !form) return null;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!canManage) return;
    let { status, progress } = normalizeStatusProgress(form.status, form.progress);
    let startDate = form.startDate;
    let endDate = form.isMilestone ? startDate : form.endDate;
    if (endDate < startDate) return;
    const owner = formatOwnerDisplay(form.ownerUserIds, form.ownerExtra, ownerDirectory.byId);
    const ownerUserIds = form.ownerUserIds?.length ? form.ownerUserIds : null;
    onSave({
      name: form.name.trim(),
      phase: form.phase,
      startDate,
      endDate,
      status,
      progress,
      owner,
      ownerUserIds,
      notes: form.notes.trim() || null,
      isMilestone: form.isMilestone,
    });
  };

  return (
    <div className="cronograma-overlay" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="cronograma-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cronograma-editor-title"
        onSubmit={onSubmit}
      >
        <h2 id="cronograma-editor-title">{task ? 'Atualizar tarefa' : 'Nova tarefa'}</h2>
        <div className="cronograma-form-grid">
          <label className="cronograma-field cronograma-field--wide">
            Nome
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={!canManage}
            />
          </label>
          <label className="cronograma-field cronograma-field--wide">
            Fase
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
          <label className="cronograma-field">
            Início
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              disabled={!canManage}
            />
          </label>
          <label className="cronograma-field">
            Fim
            <input
              type="date"
              required
              value={form.isMilestone ? form.startDate : form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              disabled={!canManage || form.isMilestone}
            />
          </label>
          <label className="cronograma-field">
            Status
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              disabled={!canManage}
            >
              <option value="todo">A fazer</option>
              <option value="in_progress">Em andamento</option>
              <option value="blocked">Bloqueada</option>
              <option value="postponed">Adiada</option>
              <option value="cancelled">Cancelada</option>
              <option value="done">Concluída</option>
            </select>
          </label>
          <div className="cronograma-field cronograma-field--wide cronograma-field--owners">
            <CronogramaOwnerPicker
              users={adminUsers}
              selectedIds={form.ownerUserIds}
              ownerExtra={form.ownerExtra}
              onChangeIds={(ownerUserIds) => setForm((f) => ({ ...f, ownerUserIds }))}
              onChangeExtra={(ownerExtra) => setForm((f) => ({ ...f, ownerExtra }))}
              disabled={!canManage}
            />
          </div>
          <label className="cronograma-field cronograma-field--wide">
            Progresso: {form.progress}%
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.progress}
              onChange={(e) => setForm((f) => ({ ...f, progress: Number(e.target.value) }))}
              disabled={!canManage}
            />
          </label>
          <label className="cronograma-field cronograma-field--wide">
            Notas
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              disabled={!canManage}
            />
          </label>
          <label className="cronograma-field cronograma-field--wide cronograma-checkbox">
            <input
              type="checkbox"
              checked={form.isMilestone}
              onChange={(e) => setForm((f) => ({ ...f, isMilestone: e.target.checked }))}
              disabled={!canManage}
            />
            É um marco (data única)
          </label>
        </div>

        {task?.updatedAt ? (
          <p className="muted cronograma-meta">
            Atualizado por {task.updatedByName || '—'} em {formatPtDateTime(task.updatedAt)}
          </p>
        ) : null}

        {task && events?.length ? (
          <details className="cronograma-history">
            <summary>Histórico de alterações</summary>
            <ul>
              {loadingEvents ? (
                <li>Carregando…</li>
              ) : (
                events.map((ev) => (
                  <li key={ev.id}>
                    <strong>{ev.field}</strong>: {ev.oldValue ?? '—'} → {ev.newValue ?? '—'}
                    {ev.userName ? ` (${ev.userName})` : ''}{' '}
                    <span className="muted">{formatPtDateTime(ev.createdAt)}</span>
                  </li>
                ))
              )}
            </ul>
          </details>
        ) : null}

        <div className="cronograma-dialog-actions">
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
        </div>
      </form>
    </div>
  );
}