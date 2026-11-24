import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'movly-admin-sidebar-collapsed';

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function useAdminSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(() => readStored());

  const setCollapsed = useCallback((next) => {
    setCollapsedState(Boolean(next));
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.body.classList.toggle('admin-sidebar-collapsed', collapsed);
    return () => document.body.classList.remove('admin-sidebar-collapsed');
  }, [collapsed]);

  return { collapsed, setCollapsed, toggleCollapsed };
}