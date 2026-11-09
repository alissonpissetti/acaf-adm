import { Link } from 'react-router-dom';

function normalizeHeading(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function PageHeader({ breadcrumbs = [], title, subtitle, actions = null }) {
  const lastCrumb = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1]?.label : null;
  const titleDuplicatesLastCrumb =
    Boolean(title && lastCrumb) && normalizeHeading(title) === normalizeHeading(lastCrumb);
  /** Evita «breadcrumb … / Mesmo nome» + <h1> repetido na linha de baixo. */
  const headingTitle = titleDuplicatesLastCrumb ? undefined : title;
  const showHeadingRow = Boolean(headingTitle || subtitle || actions);

  return (
    <header className="page-header">
      {breadcrumbs.length > 0 ? (
        <nav className="breadcrumbs" aria-label="Navegação">
          {breadcrumbs.map((item, index) => (
            <span key={`${item.label}-${index}`} className="breadcrumb-item">
              {item.to ? (
                <Link to={item.to}>{item.label}</Link>
              ) : item.onClick ? (
                <button type="button" className="breadcrumb-link" onClick={item.onClick}>
                  {item.label}
                </button>
              ) : (
                <span className={index === breadcrumbs.length - 1 ? 'breadcrumb-current' : undefined}>
                  {item.label}
                </span>
              )}
              {index < breadcrumbs.length - 1 ? <span className="breadcrumb-sep">/</span> : null}
            </span>
          ))}
        </nav>
      ) : null}
      {showHeadingRow ? (
        <div
          className={`page-header-row${
            !headingTitle && !subtitle ? ' page-header-row--actions-only' : ''
          }`}
        >
          {headingTitle || subtitle ? (
            <div>
              {headingTitle ? <h1 className="page-title">{headingTitle}</h1> : null}
              {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
            </div>
          ) : null}
          {actions ? <div className="page-header-actions">{actions}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
