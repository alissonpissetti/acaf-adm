import { Columns3, Copy, Eye, Pencil, Trash2 } from 'lucide-react';

export function CrudRowActions({
  onOpen,
  openLabel = 'Abrir funil',
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  disabled = false,
}) {
  return (
    <div className="crud-row-actions">
      {onOpen ? (
        <button
          type="button"
          className="crud-icon-btn crud-icon-btn-accent"
          disabled={disabled}
          aria-label={openLabel}
          title={openLabel}
          onClick={(ev) => {
            ev.stopPropagation();
            onOpen();
          }}
        >
          <Columns3 size={15} strokeWidth={2} aria-hidden="true" />
          <span className="crud-action-label">Abrir</span>
        </button>
      ) : null}
      {onView ? (
        <button
          type="button"
          className="crud-icon-btn"
          disabled={disabled}
          aria-label="Visualizar"
          title="Visualizar"
          onClick={(ev) => {
            ev.stopPropagation();
            onView();
          }}
        >
          <Eye size={15} strokeWidth={2} aria-hidden="true" />
          <span className="crud-action-label">Ver</span>
        </button>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          className="crud-icon-btn"
          disabled={disabled}
          aria-label="Editar"
          title="Editar"
          onClick={(ev) => {
            ev.stopPropagation();
            onEdit();
          }}
        >
          <Pencil size={15} strokeWidth={2} aria-hidden="true" />
          <span className="crud-action-label">Editar</span>
        </button>
      ) : null}
      {onDuplicate ? (
        <button
          type="button"
          className="crud-icon-btn"
          disabled={disabled}
          aria-label="Duplicar"
          title="Duplicar"
          onClick={(ev) => {
            ev.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy size={15} strokeWidth={2} aria-hidden="true" />
          <span className="crud-action-label">Duplicar</span>
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          className="crud-icon-btn crud-icon-btn-danger"
          disabled={disabled}
          aria-label="Excluir"
          title="Excluir"
          onClick={(ev) => {
            ev.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
          <span className="crud-action-label">Excluir</span>
        </button>
      ) : null}
    </div>
  );
}
