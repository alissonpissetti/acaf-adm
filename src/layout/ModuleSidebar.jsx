import { NavLink, useLocation } from 'react-router-dom';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { ModuleIcon } from '../utils/icons.jsx';

export function ModuleSidebar({ onNavigate }) {
  const { modules, loading } = useNavigation();
  const location = useLocation();

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
    <nav className="module-sidebar-nav">
      {modules.map((module) => {
        const isActive = module.items.some((item) =>
          location.pathname.startsWith(item.route.split('?')[0]),
        );
        const target = module.items[0]?.route.split('?')[0] ?? '#';

        return (
          <NavLink
            key={module.id}
            to={target}
            className={isActive ? 'module-sidebar-link active' : 'module-sidebar-link'}
            title={module.name}
            onClick={onNavigate}
          >
            <span className="module-sidebar-icon" aria-hidden="true">
              <ModuleIcon name={module.icon} size={18} />
            </span>
            <span className="module-sidebar-label">{module.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
