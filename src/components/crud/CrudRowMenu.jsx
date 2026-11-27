import { useEffect, useId, useRef } from 'react';
import { Eye, Pencil, Trash2, MoreVertical } from 'lucide-react';

/**
 * Menu ⋮ de ações por linha — padrão mobile das listagens (Parceiros, Planos, etc.).
 * No desktop, use `CrudRowActions` na coluna de ações.
 *
 * @param {{
 *   isOpen?: boolean,
 *   onToggle?: () => void,
 *   onClose?: () => void,
 *   onView?: () => void,
 *   onEdit?: () => void,
 *   onDelete?: () => void,
 *   extraItems?: Array<{
 *     key: string,
 *     label: string,
 *     icon: import('react').ComponentType<{ size?: number, strokeWidth?: number, 'aria-hidden'?: string }>,
 *     onClick?: () => void,
 *     disabled?: boolean,
 *     danger?: boolean,
 *   }>,
 * }} props
 */
export function CrudRowMenu({
  isOpen,
  onToggle,
  onClose,
  onView,
  onEdit,
  onDelete,
  extraItems = [],
}) {
  const menuId = useId();
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDoc = (ev) => {
      if (rootRef.current?.contains(ev.target)) return;
      onClose?.();
    };
    const onKey = (ev) => {
      if (ev.key === 'Escape') onClose?.();
    };
    document.addEventListener('click', onDoc, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const items = [];
  if (onView) {
    items.push({ key: 'view', label: 'Visualizar', icon: Eye, onClick: onView });
  }
  if (onEdit) {
    items.push({ key: 'edit', label: 'Editar', icon: Pencil, onClick: onEdit });
  }
  for (const item of extraItems) {
    items.push(item);
  }
  if (onDelete) {
    items.push({
      key: 'delete',
      label: 'Excluir',
      icon: Trash2,
      onClick: onDelete,
      danger: true,
    });
  }

  if (!items.length) return null;

  return (
    <div className="crud-row-menu" ref={rootRef} onClick={(ev) => ev.stopPropagation()}>
      <button
        type="button"
        className="crud-row-menu__trigger crud-icon-btn"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        title="Mais ações"
        onClick={(ev) => {
          ev.stopPropagation();
          onToggle?.();
        }}
      >
        <MoreVertical size={18} strokeWidth={2} aria-hidden="true" />
        <span className="visually-hidden">Mais ações</span>
      </button>
      {isOpen ? (
        <ul className="crud-row-menu__dropdown" id={menuId} role="menu">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={`crud-row-menu__item${item.danger ? ' crud-row-menu__item--danger' : ''}`}
                  disabled={item.disabled}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onClose?.();
                    if (!item.disabled) item.onClick?.();
                  }}
                >
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}