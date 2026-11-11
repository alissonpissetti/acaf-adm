import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchNavigation } from '../api/navigation.js';
import { isExternalRoute } from './routeUtils.js';
import { hasFunnelBoardContext, isCommercialLeadsBoardPath } from './navActive.js';
import { useAuth } from '../auth/AuthContext.jsx';

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const { isAuthenticated, hasPermission } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setModules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchNavigation()
      .then(setModules)
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      modules,
      loading,
      reloadNavigation: async () => {
        const next = await fetchNavigation();
        setModules(next);
        return next;
      },
      canManage: (viewKey) => hasPermission(`${viewKey}.manage`),
    }),
    [modules, loading, hasPermission],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation deve ser usado dentro de NavigationProvider.');
  }
  return context;
}

function matchesInternalRoute(route, pathname) {
  const routePath = String(route ?? '').split('?')[0];
  if (!routePath) return false;
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

export function useActiveModuleItem(pathname, search = '') {
  const { modules } = useNavigation();

  if (isCommercialLeadsBoardPath(pathname) && hasFunnelBoardContext(search)) {
    for (const module of modules) {
      const funisItem = module.items.find((entry) => entry.slug === 'funis');
      if (funisItem) {
        return { module, item: funisItem };
      }
    }
  }

  let bestModule = null;
  let bestItem = null;
  let bestScore = 0;

  for (const module of modules) {
    for (const item of module.items) {
      if (isExternalRoute(item.route)) continue;
      const routePath = item.route.split('?')[0];
      if (!matchesInternalRoute(item.route, pathname)) continue;
      if (routePath.length >= bestScore) {
        bestScore = routePath.length;
        bestModule = module;
        bestItem = item;
      }
    }
  }

  if (bestModule) {
    return { module: bestModule, item: bestItem };
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'm' && segments[1]) {
    const module = modules.find((entry) => entry.slug === segments[1]);
    if (module) {
      return { module, item: null };
    }
  }

  return { module: null, item: null };
}
