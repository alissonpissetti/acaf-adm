export function CrudFormActions({
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  deleteLabel = 'Excluir',
  busy = false,
  busyLabel = 'Salvando…',
  onCancel,
  onDelete,
  showDelete = false,
  deleteDisabled = false,
}) {
  return (
    <div className="crud-form-actions">
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? busyLabel : submitLabel}
      </button>
      {onCancel ? (
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
      ) : null}
      {showDelete && onDelete ? (
        <button
          type="button"
          className="btn-ghost btn-danger"
          onClick={onDelete}
          disabled={busy || deleteDisabled}
        >
          {deleteLabel}
        </button>
      ) : null}
    </div>
  );
}

export function CrudViewActions({
  onBack,
  onEdit,
  onDuplicate,
  editLabel = 'Editar',
  duplicateLabel = 'Duplicar',
  extraActions = null,
}) {
  return (
    <div className="crud-view-actions">
      <div className="crud-view-actions-primary">
        {extraActions}
        {onEdit ? (
          <button type="button" className="btn-primary" onClick={onEdit}>
            {editLabel}
          </button>
        ) : null}
        {onDuplicate ? (
          <button type="button" className="btn-ghost" onClick={onDuplicate}>
            {duplicateLabel}
          </button>
        ) : null}
      </div>
      {onBack ? (
        <div className="crud-view-actions-secondary">
          <button type="button" className="btn-ghost" onClick={onBack}>
            Voltar para lista
          </button>
        </div>
      ) : null}
    </div>
  );
}
