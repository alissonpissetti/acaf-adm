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
  toolbarTitle = null,
  /** @type {'default' | 'compact'} */
  toolbarLayout = 'default',
  toolbarWrapClassName = '',
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  panelTitle,
  /** Se false, o painel não repete o título em um segundo cabeçalho (evita duplicar o PageHeader). */
  showPanelHeading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  columns = [],
  rows = [],
  rowKey = 'id',
  onRowClick,
  onOpen,
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
  /** `{ selectedIds, onToggleRow, onTogglePage }` — checkbox na primeira coluna; não altera `onRowClick` nas outras células. */
  selection = null,
}) {
  const showActions = Boolean(onView || onEdit || onDuplicate || onDelete || onOpen);
  const selectRowKey = selection?.rowKey ?? rowKey;
  const pageIds = rows.map((r) => r[selectRowKey]).filter(Boolean);
  const selectedOnPage = pageIds.filter((id) => selection?.selectedIds?.has(id));
  const allPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const somePageSelected = selectedOnPage.length > 0 && !allPageSelected;

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
          toolbarTitle={toolbarTitle}
          layout={toolbarLayout}
          wrapClassName={toolbarWrapClassName}
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
                  {selection ? (
                    <th className="data-table-col-select col-select" scope="col">
                      <input
                        type="checkbox"
                        className="data-table-select-all"
                        checked={allPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = somePageSelected;
                        }}
                        onChange={() => selection.onTogglePage?.()}
                        aria-label="Selecionar todos nesta página"
                      />
                    </th>
                  ) : null}
                  {columns.map((column) => {
                    const headerHint = column.headerHint ?? column.label;
                    const headerLabel = column.headerLabel ?? column.label;
                    const useAbbr = Boolean(column.headerAbbr);
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        className={column.className ?? ''}
                        title={useAbbr ? undefined : headerHint}
                      >
                        {useAbbr ? (
                          <abbr title={headerHint} aria-label={headerHint} className="data-table-header-abbr">
                            {column.headerAbbr}
                          </abbr>
                        ) : (
                          headerLabel
                        )}
                      </th>
                    );
                  })}
                  {showActions ? (
                    <th
                      className="col-actions"
                      scope="col"
                      aria-label="Ações"
                      title="Ver detalhes, editar ou excluir o cadastro"
                    />
                  ) : null}
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
                    {selection ? (
                      <td
                        className="data-table-col-select col-select"
                        data-label=""
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selection.selectedIds?.has(row[selectRowKey]) ?? false}
                          onChange={() => selection.onToggleRow?.(row[selectRowKey])}
                          aria-label={`Selecionar ${row.name ?? row[selectRowKey]}`}
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        data-label={column.mobileLabel ?? column.label}
                        className={column.className ?? ''}
                      >
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
                          onOpen={onOpen ? () => onOpen(row) : undefined}
                          onView={onView ? () => onView(row) : undefined}
                          onEdit={canManage && onEdit ? () => onEdit(row) : undefined}
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
        <div
          className={
            showPanelHeading
              ? 'panel-header'
              : 'panel-header panel-header--meta-only'
          }
        >
          {showPanelHeading ? <h2>{panelTitle ?? title}</h2> : null}
          <span className="panel-meta">{totalItems} registro(s)</span>
        </div>
        {tableSection}
      </section>
    </div>
  );
}
