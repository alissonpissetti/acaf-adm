import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigation, useActiveModuleItem } from '../navigation/NavigationContext.jsx';
import { isExternalRoute } from '../navigation/routeUtils.js';
import { ModuleIcon } from '../utils/icons.jsx';

function isNavItemActive(route, location) {
  if (isExternalRoute(route)) return false;
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

function moduleHasExternalItems(module) {
  return module.items.some((item) => isExternalRoute(item.route));
}

export function ModuleSidebar({ onNavigate }) {
  const { modules, loading } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const { module: activeModule } = useActiveModuleItem(location.pathname);
  const [openModuleId, setOpenModuleId] = useState(null);

  useEffect(() => {
    if (activeModule?.id) {
      setOpenModuleId(null);
    }
  }, [activeModule?.id]);

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
        const isOpen = activeModule?.id === module.id || openModuleId === module.id;
        const hasItems = module.items.length > 0;
        const externalModule = moduleHasExternalItems(module);

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
                if (!hasItems) return;
                if (externalModule) {
                  setOpenModuleId((prev) => (prev === module.id ? null : module.id));
                  return;
                }
                navigate(module.items[0].route);
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
                {module.items.map((item) =>
                  isExternalRoute(item.route) ? (
                    <a
                      key={item.id}
                      href={item.route}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="module-sidebar-child-link module-sidebar-child-link--external"
                      onClick={onNavigate}
                    >
                      <span>{item.label}</span>
                      <ExternalLink size={13} strokeWidth={2} className="module-sidebar-external-icon" aria-hidden="true" />
                    </a>
                  ) : (
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
                  ),
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
