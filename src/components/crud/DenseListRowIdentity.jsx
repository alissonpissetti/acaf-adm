/**
 * Bloco de identidade no card ≤1200px (referência: Operação → Parceiros).
 * Linha 1: título + badge lado a lado · linha 2: meta (e-mail, CNPJ, …).
 */
export function DenseListRowIdentity({
  title,
  badge,
  badgeClassName = '',
  meta,
  metaClassName = '',
  metaHref,
}) {
  const metaText = meta?.trim() ? meta : '—';
  const metaClass = `dense-list-meta--mobile networks-partners-mobile-email${
    metaClassName ? ` ${metaClassName}` : ''
  }`;

  return (
    <div className="dense-list-identity networks-partners-identity">
      <div className="dense-list-headline">
        <strong className="dense-list-title networks-partners-name">{title}</strong>
        {badge ? (
          <span
            className={`dense-list-badge--mobile networks-partners-portal-badge badge networks-partners-portal-badge--mobile ${badgeClassName}`.trim()}
          >
            {badge}
          </span>
        ) : null}
      </div>
      {metaHref ? (
        <a
          href={metaHref}
          className={`${metaClass} dense-list-meta--link`}
          title={metaText}
          onClick={(ev) => ev.stopPropagation()}
        >
          {metaText}
        </a>
      ) : (
        <span className={metaClass} title={metaText}>
          {metaText}
        </span>
      )}
    </div>
  );
}