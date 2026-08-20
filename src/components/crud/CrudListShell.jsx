import { PageHeader } from '../PageHeader.jsx';
import { AppLoading } from './AppLoading.jsx';
import { CrudAlerts } from './CrudAlerts.jsx';
import { CrudListToolbar } from './CrudListToolbar.jsx';
import { CrudPagination } from './CrudListToolbar.jsx';
import { CrudRowActions } from './CrudRowActions.jsx';

export function CrudListShell({
  title,
  subtitle,
  breadcrumbs = [],
  addLabel = 'Adicionar',
  onAdd,
  canAdd = true,
  loading = false,
  error = '',
  message = '',
  query,
  onQueryChange,
  searchPlaceholder,
  sortKey,
  sortDirection,
  sortOptions = [],
  onSortChange,
  filterDefinitions = [],
  fieldFilters = [],
  onApplyFieldFilter,
  onRemoveFieldFilter,
  onClearFieldFilters,
  filters = null,
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  panelTitle,
  emptyMessage = 'Nenhum registro encontrado.',
  columns = [],
  rows = [],
  rowKey = 'id',
  onRowClick,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  canDeleteRow,
  canManage = true,
  renderCell,
  children,
  tableClassName = '',
  tableFooter = null,
  embedded = false,
}) {
  const showActions = canManage && (onView || onEdit || onDuplicate || onDelete);

  const tableSection = (
    <>
      <div className={embedded ? 'panel-body' : 'panel-body'}>
        <CrudListToolbar
          query={query}
          onQueryChange={onQueryChange}
          placeholder={searchPlaceholder}
          sortKey={sortKey}
          sortDirection={sortDirection}
          sortOptions={sortOptions}
          onSortChange={onSortChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          showPageSize={Boolean(onPageSizeChange)}
          filterDefinitions={filterDefinitions}
          fieldFilters={fieldFilters}
          onApplyFieldFilter={onApplyFieldFilter}
          onRemoveFieldFilter={onRemoveFieldFilter}
          onClearFieldFilters={onClearFieldFilters}
          filters={filters}
        />
      </div>

      <div className="panel-body panel-body-flush">
        {loading ? (
          <AppLoading label="Carregando registros…" />
        ) : children ? (
          children
        ) : rows.length === 0 ? (
          <div className="empty-state">{emptyMessage}</div>
        ) : (
          <div className="table-wrap table-wrap-responsive">
            <table className={`data-table data-table-enterprise data-table-compact ${tableClassName}`.trim()}>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  {showActions ? <th className="col-actions" aria-label="Ações" /> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row[rowKey]}
                    className={onRowClick || onView || onEdit ? 'data-table-row-clickable' : undefined}
                    onClick={
                      onRowClick
                        ? () => onRowClick(row)
                        : onView
                          ? () => onView(row)
                          : onEdit
                            ? () => onEdit(row)
                            : undefined
                    }
                  >
                    {columns.map((column) => (
                      <td key={column.key} data-label={column.label}>
                        {renderCell
                          ? renderCell(row, column.key)
                          : column.render
                            ? column.render(row)
                            : (row[column.key] ?? '—')}
                      </td>
                    ))}
                    {showActions ? (
                      <td className="table-actions col-actions">
                        <CrudRowActions
                          onView={onView ? () => onView(row) : undefined}
                          onEdit={onEdit ? () => onEdit(row) : undefined}
                          onDuplicate={onDuplicate ? () => onDuplicate(row) : undefined}
                          onDelete={
                            onDelete && (!canDeleteRow || canDeleteRow(row))
                              ? () => onDelete(row)
                              : undefined
                          }
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && tableFooter ? (
        <div className="panel-body panel-body-flush crud-table-footer">{tableFooter}</div>
      ) : null}

        {!loading && totalItems > 0 ? (
          <div className="panel-body crud-pagination-wrap">
            <CrudPagination
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return tableSection;
  }

  return (
    <div className="page-stack">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={title}
        subtitle={subtitle}
        actions={
          canAdd && onAdd ? (
            <button type="button" className="btn-primary" onClick={onAdd}>
              {addLabel}
            </button>
          ) : null
        }
      />

      <CrudAlerts error={error} message={message} />

      <section className="panel">
        <div className="panel-header">
          <h2>{panelTitle ?? title}</h2>
          <span className="panel-meta">{totalItems} registro(s)</span>
        </div>
        {tableSection}
      </section>
    </div>
  );
}
