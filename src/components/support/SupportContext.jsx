import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { SupportTicketModal } from './SupportTicketModal.jsx';

const SupportContext = createContext(null);

function buildContext(location, pageLabel) {
  return {
    contextUrl: `${location.pathname}${location.search}`,
    contextLabel: pageLabel || document.title || 'Painel Admin',
    source: 'admin',
  };
}

export function SupportProvider({ children }) {
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pageLabel, setPageLabel] = useState('');
  const [overrideContext, setOverrideContext] = useState(null);

  const openSupport = useCallback((options = {}) => {
    setOverrideContext(options.context ?? null);
    if (options.pageLabel) setPageLabel(options.pageLabel);
    setOpen(true);
  }, []);

  const closeSupport = useCallback(() => {
    setOpen(false);
    setOverrideContext(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      openSupport,
      closeSupport,
    }),
    [openSupport, closeSupport],
  );

  const ticketContext = overrideContext ?? buildContext(location, pageLabel);

  return (
    <SupportContext.Provider value={contextValue}>
      {children}
      {user ? (
        <SupportTicketModal
          open={open}
          onClose={closeSupport}
          context={ticketContext}
          apiPrefix="/api/admin/support"
        />
      ) : null}
    </SupportContext.Provider>
  );
}

export function useSupport() {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport deve ser usado dentro de SupportProvider.');
  return ctx;
}
