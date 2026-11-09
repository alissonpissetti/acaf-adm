import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useNavigation, useActiveModuleItem } from '../navigation/NavigationContext.jsx';
import { ModuleIcon } from '../utils/icons.jsx';

function isNavItemActive(route, location) {
  const [routePath, routeSearch = ''] = route.split('?');
  if (location.pathname !== routePath) return false;
  if (!routeSearch) {
    return !new URLSearchParams(location.search).get('queue');
  }
  const expected = new URLSearchParams(routeSearch);
  const current = new URLSearchParams(location.search);
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

export function ModuleSidebar({ onNavigate }) {
  const { modules, loading } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const { module: activeModule } = useActiveModuleItem(location.pathname);

  if (loading) {
    return (
      <div className="module-sidebar-loading">
        <span>Carregando módulos…</span>
      </div>
    );
  }

  if (!modules.length) {
    return (
      <div className="module-sidebar-empty">
        <span>Nenhum módulo disponível para seu grupo.</span>
      </div>
    );
  }

  return (
    <nav className="module-sidebar-nav" aria-label="Módulos">
      <div className="module-sidebar-section-label">Módulos</div>
      {modules.map((module) => {
        const isOpen = activeModule?.id === module.id;
        const hasItems = module.items.length > 0;

        return (
          <div
            key={module.id}
            className={`module-sidebar-group${isOpen ? ' is-open' : ''}`}
          >
            <button
              type="button"
              className={isOpen ? 'module-sidebar-toggle active' : 'module-sidebar-toggle'}
              title={module.name}
              aria-expanded={isOpen}
              aria-controls={`module-items-${module.id}`}
              onClick={() => {
                if (hasItems) {
                  navigate(module.items[0].route);
                }
              }}
            >
              <span className="module-sidebar-icon" aria-hidden="true">
                <ModuleIcon name={module.icon} size={18} />
              </span>
              <span className="module-sidebar-label">{module.name}</span>
              <span className="module-sidebar-chevron" aria-hidden="true">
                <ChevronRight size={18} strokeWidth={2} />
              </span>
            </button>

            {isOpen && hasItems ? (
              <div
                className="module-sidebar-children"
                id={`module-items-${module.id}`}
                role="group"
                aria-label={`Telas: ${module.name}`}
              >
                {module.items.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.route}
                    className={() =>
                      isNavItemActive(item.route, location)
                        ? 'module-sidebar-child-link active'
                        : 'module-sidebar-child-link'
                    }
                    onClick={onNavigate}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
