import { CrudActiveFilterChips, CrudFieldFilterMenu } from './CrudFieldFilters.jsx';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * Barra de listagem CRUD.
 *
 * @typedef {'default' | 'compact'} CrudListToolbarLayout
 *
 * **layout `compact` (padrão Formo):** uma linha — busca + pills
 * `Por página | Ordenar por | Filtrar` (popover de critérios via `filterDefinitions`).
 * Sem card “Filtros” nem grid de labels.
 *
 * @typedef {Object} CrudListToolbarProps
 * @property {string} query
 * @property {(value: string) => void} onQueryChange
 * @property {string} [placeholder]
 * @property {string} [sortKey]
 * @property {'asc' | 'desc'} [sortDirection]
 * @property {Array<{ key: string, direction: 'asc' | 'desc', label: string }>} [sortOptions]
 * @property {(key: string, direction: 'asc' | 'desc') => void} [onSortChange]
 * @property {number} [pageSize]
 * @property {(value: string) => void} [onPageSizeChange]
 * @property {boolean} [showPageSize]
 * @property {import('../../crud/filterUtils.js').FilterDefinition[]} [filterDefinitions]
 * @property {Array<{ id: string, value?: unknown }>} [fieldFilters]
 * @property {(filter: { id: string, value?: unknown }) => void} [onApplyFieldFilter]
 * @property {(id: string) => void} [onRemoveFieldFilter]
 * @property {() => void} [onClearFieldFilters]
 * @property {import('react').ReactNode} [filters] Slots legados no layout `default`; prefira `filterDefinitions`
 * @property {string | null} [toolbarTitle]
 * @property {string} [wrapClassName]
 * @property {CrudListToolbarLayout} [layout]
 */

export function CrudPagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}) {
  if (totalItems <= 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <footer className="crud-pagination" aria-label="Paginação da listagem">
      <p className="crud-pagination-meta">
        Exibindo {start}–{end} de {totalItems}
      </p>

      <div className="crud-pagination-nav" role="group" aria-label="Navegação entre páginas">
        <button
          type="button"
          className="crud-pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>
        <span className="crud-pagination-page">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          className="crud-pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </footer>
  );
}

function CrudToolbarPageSize({ pageSize, onPageSizeChange, compact }) {
  if (!onPageSizeChange) return null;

  const control = (
    <select
      className={compact ? 'crud-toolbar-compact-select' : 'crud-toolbar-select'}
      value={pageSize}
      aria-label="Registros por página"
      onChange={(ev) => onPageSizeChange(ev.target.value)}
    >
      {PAGE_SIZE_OPTIONS.map((size) => (
        <option key={size} value={size}>
          {compact ? size : size}
        </option>
      ))}
    </select>
  );

  if (compact) {
    return (
      <label className="crud-toolbar-compact-pill">
        <span className="crud-toolbar-compact-pill-label">Por página</span>
        {control}
      </label>
    );
  }

  return (
    <label className="crud-toolbar-field crud-page-size">
      <span className="crud-toolbar-label">Por página</span>
      {control}
    </label>
  );
}

function CrudToolbarSort({ sortKey, sortDirection, sortOptions, onSortChange, compact }) {
  if (!sortOptions.length || !onSortChange) return null;

  const control = (
    <select
      className={compact ? 'crud-toolbar-compact-select' : 'crud-toolbar-select'}
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
  );

  if (compact) {
    return (
      <label className="crud-toolbar-compact-pill crud-toolbar-compact-pill--sort">
        <span className="crud-toolbar-compact-pill-label">Ordenar por</span>
        {control}
      </label>
    );
  }

  return (
    <label className="crud-toolbar-field crud-sort">
      <span className="crud-toolbar-label">Ordenar por</span>
      {control}
    </label>
  );
}

export function CrudListToolbar({
  query,
  onQueryChange,
  placeholder = 'Buscar…',
  sortKey,
  sortDirection,
  sortOptions = [],
  onSortChange,
  pageSize,
  onPageSizeChange,
  showPageSize = true,
  filterDefinitions = [],
  fieldFilters = [],
  onApplyFieldFilter,
  onRemoveFieldFilter,
  onClearFieldFilters,
  filters = null,
  toolbarTitle = null,
  wrapClassName = '',
  layout = 'default',
}) {
  const compact = layout === 'compact';
  const wrapClasses = [
    'crud-list-toolbar-wrap',
    compact ? 'crud-list-toolbar-wrap--compact' : '',
    wrapClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const toolbarClasses = ['crud-list-toolbar', compact ? 'crud-list-toolbar--compact' : '']
    .filter(Boolean)
    .join(' ');

  const showLegacyExtras = !compact && filters;
  const showFilterMenu = filterDefinitions.length > 0;

  return (
    <div className={wrapClasses}>
      {!compact && toolbarTitle ? <p className="crud-list-toolbar-title">{toolbarTitle}</p> : null}

      <div className={toolbarClasses}>
        {compact ? (
          <label className="crud-toolbar-search-compact">
            <span className="sr-only">Buscar</span>
            <input
              className="crud-toolbar-input crud-toolbar-input--compact-inline"
              type="search"
              value={query}
              onChange={(ev) => onQueryChange(ev.target.value)}
              placeholder={placeholder}
            />
          </label>
        ) : (
          <label className="crud-toolbar-field crud-search">
            <span className="crud-toolbar-label">Buscar</span>
            <input
              className="crud-toolbar-input"
              value={query}
              onChange={(ev) => onQueryChange(ev.target.value)}
              placeholder={placeholder}
            />
          </label>
        )}

        {showPageSize ? (
          <CrudToolbarPageSize
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            compact={compact}
          />
        ) : null}

        <CrudToolbarSort
          sortKey={sortKey}
          sortDirection={sortDirection}
          sortOptions={sortOptions}
          onSortChange={onSortChange}
          compact={compact}
        />

        {showFilterMenu ? (
          <CrudFieldFilterMenu
            definitions={filterDefinitions}
            activeFilters={fieldFilters}
            onApplyFilter={onApplyFieldFilter}
            compact={compact}
          />
        ) : null}

        {showLegacyExtras ? <div className="crud-toolbar-extra">{filters}</div> : null}
      </div>

      {showFilterMenu ? (
        <CrudActiveFilterChips
          definitions={filterDefinitions}
          activeFilters={fieldFilters}
          onRemoveFilter={onRemoveFieldFilter}
          onClearFilters={onClearFieldFilters}
        />
      ) : null}
    </div>
  );
}
