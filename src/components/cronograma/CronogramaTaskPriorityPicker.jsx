import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Flag } from 'lucide-react';
import { TASK_PRIORITY_LABELS } from '../../lib/cronogramaTaskLabels.js';

const TASK_PRIORITY_ORDER = ['low', 'medium', 'high', 'urgent'];

export function CronogramaTaskPriorityPicker({ value, onChange, disabled, compact = false }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selected = value ?? 'medium';
  const selectedLabel = TASK_PRIORITY_LABELS[selected] ?? selected;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const toggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const pick = (priority) => {
    if (disabled || priority === selected) {
      close();
      return;
    }
    onChange?.(priority);
    close();
  };

  return (
    <div
      className={`cronograma-priority-picker${compact ? ' cronograma-priority-picker--compact' : ''}`}
      ref={rootRef}
    >
      <button
        type="button"
        className={`cronograma-priority-picker-trigger cronograma-priority-flag cronograma-priority-flag--${selected} is-active`}
        onClick={toggle}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Prioridade: ${selectedLabel}`}
        title={selectedLabel}
      >
        <Flag
          size={18}
          strokeWidth={2.25}
          aria-hidden="true"
          className="cronograma-priority-flag-icon"
        />
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`cronograma-priority-picker-chevron${open ? ' is-open' : ''}`}
        />
      </button>

      {open ? (
        <ul className="cronograma-priority-picker-menu" role="listbox" aria-label="Prioridade">
          {TASK_PRIORITY_ORDER.map((priority) => {
            const label = TASK_PRIORITY_LABELS[priority] ?? priority;
            const active = priority === selected;
            return (
              <li key={priority}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`cronograma-priority-picker-option cronograma-priority-flag cronograma-priority-flag--${priority}${
                    active ? ' is-active' : ''
                  }`}
                  onClick={() => pick(priority)}
                >
                  <Flag
                    size={18}
                    strokeWidth={2.25}
                    aria-hidden="true"
                    className="cronograma-priority-flag-icon"
                  />
                  <span className="cronograma-priority-picker-option-label">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}