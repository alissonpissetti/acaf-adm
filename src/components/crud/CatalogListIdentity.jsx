/**
 * Coluna principal em listagens `crud-list-cards-table--simple`.
 */
export function CatalogListIdentity({ title, meta, metaClassName = '' }) {
  const metaText = meta?.trim() ? meta : '—';
  return (
    <div className="crud-list-identity">
      <strong className="crud-list-identity__title">{title}</strong>
      <span
        className={`crud-list-identity__meta--mobile crud-list-identity__meta-line${
          metaClassName ? ` ${metaClassName}` : ''
        }`}
      >
        {metaText}
      </span>
    </div>
  );
}