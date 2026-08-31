import { NavLink, useLocation } from 'react-router-dom';
import { useActiveModuleItem } from '../navigation/NavigationContext.jsx';

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
          className={() =>
            isNavItemActive(item.route, location)
              ? 'module-top-nav-link active'
              : 'module-top-nav-link'
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
