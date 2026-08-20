import { Link } from 'react-router-dom';

export function PageHeader({ breadcrumbs = [], title, subtitle, actions = null }) {
  const showHeadingRow = Boolean(title || subtitle || actions);

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
                <span>{item.label}</span>
              )}
              {index < breadcrumbs.length - 1 ? <span className="breadcrumb-sep">/</span> : null}
            </span>
          ))}
        </nav>
      ) : null}
      {showHeadingRow ? (
        <div
          className={`page-header-row${!title && !subtitle ? ' page-header-row--actions-only' : ''}`}
        >
          {title || subtitle ? (
            <div>
              {title ? <h1 className="page-title">{title}</h1> : null}
              {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
            </div>
          ) : null}
          {actions ? <div className="page-header-actions">{actions}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
