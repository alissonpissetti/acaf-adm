import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarRange, Pencil } from 'lucide-react';

function formatYmdPt(ymd) {
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

export function CronogramaTaskPeriodField({
  form,
  setForm,
  canManage,
  taskId,
  onPatchDates,
  inBand = false,
}) {
  const rootRef = useRef(null);
  const startInputRef = useRef(null);
  const snapshotRef = useRef({ startDate: '', endDate: '' });
  const [editing, setEditing] = useState(false);

  const isMilestone = Boolean(form.isMilestone);
  const display = isMilestone
    ? `Marco · ${formatYmdPt(form.startDate)}`
    : `${formatYmdPt(form.startDate)} → ${formatYmdPt(form.endDate)}`;

  const close = useCallback(() => setEditing(false), []);

  const commit = useCallback(() => {
    setEditing(false);
    let startDate = form.startDate;
    let endDate = isMilestone ? startDate : form.endDate;
    if (!startDate) {
      setForm((f) =>
        f
          ? {
              ...f,
              startDate: snapshotRef.current.startDate,
              endDate: snapshotRef.current.endDate,
            }
          : f,
      );
      return;
    }
    if (!isMilestone && endDate < startDate) {
      endDate = startDate;
    }
    setForm((f) => (f ? { ...f, startDate, endDate } : f));
    const prev = snapshotRef.current;
    if (
      taskId &&
      onPatchDates &&
      (startDate !== prev.startDate || endDate !== prev.endDate)
    ) {
      onPatchDates({ startDate, endDate });
    }
  }, [form.startDate, form.endDate, isMilestone, setForm, taskId, onPatchDates]);

  const startEdit = () => {
    if (!canManage) return;
    snapshotRef.current = { startDate: form.startDate ?? '', endDate: form.endDate ?? '' };
    setEditing(true);
  };

  useEffect(() => {
    if (!editing) return undefined;
    const id = requestAnimationFrame(() => startInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [editing]);

  useEffect(() => {
    if (!editing) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      commit();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setForm((f) =>
          f
            ? {
                ...f,
                startDate: snapshotRef.current.startDate,
                endDate: snapshotRef.current.endDate,
              }
            : f,
        );
        close();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [editing, commit, close, setForm]);

  return (
    <div
      className={`cronograma-task-period-compact${inBand ? ' cronograma-task-period-compact--in-band' : ''}`}
      ref={rootRef}
    >
      <span
        className={`cronograma-task-field-label${inBand ? '' : ' cronograma-task-field-label--compact'}`}
      >
        Período
      </span>
      {editing ? (
        <div className="cronograma-task-period-edit">
          <input
            ref={startInputRef}
            type="date"
            className="cronograma-task-period-edit-input"
            value={form.startDate}
            onChange={(e) =>
              setForm((f) => {
                const startDate = e.target.value;
                return isMilestone
                  ? { ...f, startDate, endDate: startDate }
                  : { ...f, startDate };
              })
            }
            disabled={!canManage}
            aria-label={isMilestone ? 'Data do marco' : 'Data de início'}
          />
          {!isMilestone ? (
            <>
              <span className="cronograma-task-period-sep" aria-hidden="true">
                →
              </span>
              <input
                type="date"
                className="cronograma-task-period-edit-input"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                disabled={!canManage}
                aria-label="Data de vencimento"
              />
            </>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          className="cronograma-task-period-chip"
          onClick={startEdit}
          disabled={!canManage}
          title={canManage ? 'Clique para editar o período' : display}
          aria-label={`Período: ${display}. ${canManage ? 'Editar' : ''}`}
        >
          <CalendarRange size={14} aria-hidden="true" className="cronograma-task-period-chip-icon" />
          <span className="cronograma-task-period-chip-text">{display}</span>
          {canManage ? <Pencil size={12} aria-hidden="true" className="cronograma-task-period-chip-edit" /> : null}
        </button>
      )}
    </div>
  );
}