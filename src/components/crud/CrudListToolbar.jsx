import { CrudActiveFilterChips, CrudFieldFilterMenu } from './CrudFieldFilters.jsx';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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
}) {
  return (
    <div className="crud-list-toolbar-wrap">
      <div className="crud-list-toolbar">
        <label className="crud-toolbar-field crud-search">
          <span className="crud-toolbar-label">Buscar</span>
          <input
            className="crud-toolbar-input"
            value={query}
            onChange={(ev) => onQueryChange(ev.target.value)}
            placeholder={placeholder}
          />
        </label>

        {sortOptions.length ? (
          <label className="crud-toolbar-field crud-sort">
            <span className="crud-toolbar-label">Ordenar por</span>
            <select
              className="crud-toolbar-select"
              value={`${sortKey}:${sortDirection}`}
              onChange={(ev) => {
                const [key, direction] = ev.target.value.split(':');
                onSortChange(key, direction);
              }}
            >
              {sortOptions.map((option) => (
                <option
                  key={`${option.key}:${option.direction}`}
                  value={`${option.key}:${option.direction}`}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {showPageSize && onPageSizeChange ? (
          <label className="crud-toolbar-field crud-page-size">
            <span className="crud-toolbar-label">Por página</span>
            <select
              className="crud-toolbar-select"
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

        {filterDefinitions.length ? (
          <CrudFieldFilterMenu
            definitions={filterDefinitions}
            activeFilters={fieldFilters}
            onApplyFilter={onApplyFieldFilter}
          />
        ) : null}

        {filters ? <div className="crud-toolbar-extra">{filters}</div> : null}
      </div>

      {filterDefinitions.length ? (
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
