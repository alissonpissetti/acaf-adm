import { CrudRowMenu } from './CrudRowMenu.jsx';

/**
 * Coluna ⋮ mobile para listagens catálogo (`crud-list-cards-table--simple`).
 */
export function catalogListRowMenuColumn({
  openRowMenuId,
  setOpenRowMenuId,
  onView,
  onEdit,
  onDelete,
  canManage,
}) {
  return {
    key: 'rowMenu',
    label: '',
    className: 'data-table-col-row-menu crud-col-mobile-only',
    render: (r) => (
      <CrudRowMenu
        isOpen={openRowMenuId === r.id}
        onToggle={() => setOpenRowMenuId((prev) => (prev === r.id ? null : r.id))}
        onClose={() => setOpenRowMenuId(null)}
        onView={onView ? () => onView(r) : undefined}
        onEdit={canManage && onEdit ? () => onEdit(r) : undefined}
        onDelete={canManage && onDelete ? () => onDelete(r) : undefined}
      />
    ),
  };
}