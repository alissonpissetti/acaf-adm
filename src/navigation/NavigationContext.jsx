import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchNavigation } from '../api/navigation.js';
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

export function useActiveModuleItem(pathname) {
  const { modules } = useNavigation();

  for (const module of modules) {
    const item = module.items.find((entry) =>
      pathname.startsWith(entry.route.split('?')[0]),
    );
    if (item) {
      return { module, item };
    }
  }

  return { module: null, item: null };
}
