import { useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { hasFilterValue } from '../../crud/filterUtils.js';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function MobileFilterField({ definition, active, onApply, onRemove }) {
  const current = active?.value;

  if (definition.type === 'select' && !definition.multiple) {
    return (
      <label className="crud-toolbar-sheet-field">
        <span className="crud-toolbar-sheet-label">{definition.label}</span>
        <select
          className="input crud-toolbar-sheet-select"
          value={current ?? ''}
          aria-label={definition.label}
          onChange={(ev) => {
            const value = ev.target.value;
            if (!value) onRemove?.(definition.id);
            else onApply?.({ id: definition.id, value });
          }}
        >
          <option value="">{definition.placeholder ?? 'Todos'}</option>
          {(definition.options ?? []).map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return null;
}

export function CrudListToolbarMobileSheetTrigger({
  open,
  onToggle,
  activeFilterCount = 0,
}) {
  return (
    <button
      type="button"
      className={`crud-toolbar-mobile-trigger${open ? ' is-open' : ''}`}
      aria-expanded={open}
      onClick={onToggle}
    >
      <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
      <span>Filtros e ordenação</span>
      {activeFilterCount > 0 ? (
        <span className="crud-toolbar-mobile-trigger-badge" aria-label={`${activeFilterCount} filtro(s)`}>
          {activeFilterCount}
        </span>
      ) : null}
    </button>
  );
}

export function CrudListToolbarMobileSheet({
  open,
  onClose,
  pageSize,
  onPageSizeChange,
  showPageSize = true,
  sortKey,
  sortDirection,
  sortOptions = [],
  onSortChange,
  filterDefinitions = [],
  fieldFilters = [],
  onApplyFieldFilter,
  onRemoveFieldFilter,
  onClearFieldFilters,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (ev) => {
      if (ev.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const activeCount = fieldFilters.filter((filter) => {
    const def = filterDefinitions.find((d) => d.id === filter.id);
    return def && hasFilterValue(filter, def);
  }).length;

  return (
    <div className="crud-toolbar-sheet-root" role="presentation">
      <button type="button" className="crud-toolbar-sheet-backdrop" aria-label="Fechar" onClick={onClose} />
      <section className="crud-toolbar-sheet" role="dialog" aria-modal="true" aria-labelledby="crud-toolbar-sheet-title">
        <header className="crud-toolbar-sheet-header">
          <h2 id="crud-toolbar-sheet-title" className="crud-toolbar-sheet-title">
            Filtros e ordenação
          </h2>
          <button type="button" className="crud-toolbar-sheet-close crud-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>
        <div className="crud-toolbar-sheet-body">
          {showPageSize && onPageSizeChange ? (
            <label className="crud-toolbar-sheet-field">
              <span className="crud-toolbar-sheet-label">Registros por página</span>
              <select
                className="input crud-toolbar-sheet-select"
                value={pageSize}
                aria-label="Registros por página"
                onChange={(ev) => onPageSizeChange(ev.target.value)}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {sortOptions.length && onSortChange ? (
            <label className="crud-toolbar-sheet-field">
              <span className="crud-toolbar-sheet-label">Ordenar por</span>
              <select
                className="input crud-toolbar-sheet-select"
                value={`${sortKey}:${sortDirection}`}
                aria-label="Ordenar listagem"
                onChange={(ev) => {
                  const [key, direction] = ev.target.value.split(':');
                  onSortChange(key, direction);
                }}
              >
                {sortOptions.map((option) => (
                  <option key={`${option.key}:${option.direction}`} value={`${option.key}:${option.direction}`}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {filterDefinitions.length ? (
            <div className="crud-toolbar-sheet-filters">
              <p className="crud-toolbar-sheet-section-title">Filtros</p>
              {filterDefinitions.map((definition) => (
                <MobileFilterField
                  key={definition.id}
                  definition={definition}
                  active={fieldFilters.find((f) => f.id === definition.id)}
                  onApply={onApplyFieldFilter}
                  onRemove={onRemoveFieldFilter}
                />
              ))}
              {activeCount > 0 ? (
                <button type="button" className="btn-ghost btn-sm crud-toolbar-sheet-clear" onClick={onClearFieldFilters}>
                  Limpar filtros
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <footer className="crud-toolbar-sheet-footer">
          <button type="button" className="btn-primary crud-toolbar-sheet-apply" onClick={onClose}>
            Aplicar
          </button>
        </footer>
      </section>
    </div>
  );
}