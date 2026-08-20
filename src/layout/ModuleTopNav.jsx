import { NavLink, useLocation } from 'react-router-dom';
import { useActiveModuleItem } from '../navigation/NavigationContext.jsx';

export function ModuleTopNav() {
  const location = useLocation();
  const { module } = useActiveModuleItem(location.pathname);

  if (!module?.items?.length) return null;

  return (
    <nav className="module-top-nav">
      {module.items.map((item) => (
        <NavLink
          key={item.id}
          to={item.route}
          end
          className={({ isActive }) =>
            isActive ? 'module-top-nav-link active' : 'module-top-nav-link'
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
