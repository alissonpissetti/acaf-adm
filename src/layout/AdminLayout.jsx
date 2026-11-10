import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { NavigationProvider, useActiveModuleItem } from '../navigation/NavigationContext.jsx';
import { ModuleSidebar } from './ModuleSidebar.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { NotificationBell } from '../components/NotificationBell.jsx';
import { WhatsAppNavButton } from '../components/WhatsAppNavButton.jsx';
import { UserProfilePanel } from '../components/UserProfilePanel.jsx';
import { MOVLY_WORDMARK } from '../brand/displayName.js';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { FlashMessageProvider } from '../components/flash/FlashMessageProvider.jsx';
import './AdminLayout.css';

function AdminLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, avatarImageVersion } = useAuth();
  const { module, item } = useActiveModuleItem(location.pathname);
  const topTitle = item?.label ?? module?.name ?? `${MOVLY_WORDMARK} Admin`;
  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    setNavOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileOpen) return undefined;

    const onPointerDown = (ev) => {
      if (profileRef.current && !profileRef.current.contains(ev.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [profileOpen]);

  useEffect(() => {
    document.body.classList.toggle('admin-nav-open', navOpen);
    return () => document.body.classList.remove('admin-nav-open');
  }, [navOpen]);

  const onLogout = () => {
    setNavOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className={`admin-shell${navOpen ? ' admin-shell-nav-open' : ''}`}>
      <header className="admin-mobile-bar" aria-label="Barra principal mobile">
        <button
          type="button"
          className="admin-menu-toggle"
          aria-expanded={navOpen}
          aria-controls="admin-sidebar"
          aria-label={navOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setNavOpen((open) => !open)}
        >
          {navOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>

        <div className="admin-mobile-bar-copy">
          <div className="admin-mobile-bar-title">{topTitle}</div>
          {module && !item ? <div className="admin-mobile-bar-meta">{module.name}</div> : null}
        </div>

        <WhatsAppNavButton className="whatsapp-nav-btn--compact" />
        <button type="button" className="admin-mobile-logout btn-ghost btn-sm" onClick={onLogout}>
          Sair
        </button>
      </header>

      <button
        type="button"
        className="admin-nav-backdrop"
        aria-label="Fechar menu"
        tabIndex={navOpen ? 0 : -1}
        onClick={() => setNavOpen(false)}
      />

      <aside id="admin-sidebar" className="admin-sidebar movly-grain" aria-label="Navegação">
        <div className="admin-sidebar-head">
          <NavLink
            to="/m/operacao/dashboard"
            className="admin-brand"
            title="Ir para o dashboard de operação"
            onClick={() => setNavOpen(false)}
          >
            <BrandLogo variant="lime" height={24} />
            <span className="admin-brand-copy">
              <strong className="admin-brand-title">{MOVLY_WORDMARK}</strong>
              <span className="admin-brand-sub">Console admin</span>
            </span>
          </NavLink>

          <button
            type="button"
            className="admin-sidebar-close"
            aria-label="Fechar menu"
            onClick={() => setNavOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <ModuleSidebar onNavigate={() => setNavOpen(false)} />

        <footer className="admin-sidebar-footer">
          <div className="admin-sidebar-user-card">
            <Avatar
              name={user?.name}
              src={user?.avatarUrl}
              color={user?.avatarColor}
              size="sm"
              cacheBust={avatarImageVersion}
            />
            <div className="admin-sidebar-user-text">
              {user?.name ? <div className="admin-sidebar-user-name">{user.name}</div> : null}
              <div className="admin-env-badge">Sessão ativa</div>
            </div>
          </div>
        </footer>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <div className="admin-topbar-title">{topTitle}</div>
            {module && !item ? <div className="admin-topbar-meta">{module.name}</div> : null}
          </div>
          <div className="admin-topbar-actions">
            <WhatsAppNavButton className="whatsapp-nav-btn--topbar" />
            <NotificationBell />
            <div className="admin-user-menu" ref={profileRef}>
              <button
                type="button"
                className="admin-user-chip"
                aria-expanded={profileOpen}
                aria-haspopup="dialog"
                onClick={() => setProfileOpen((open) => !open)}
              >
                <Avatar
                  name={user?.name}
                  src={user?.avatarUrl}
                  color={user?.avatarColor}
                  size="sm"
                  cacheBust={avatarImageVersion}
                />
                <span>{user?.name}</span>
              </button>

              {profileOpen ? (
                <>
                  <button
                    type="button"
                    className="admin-user-menu-backdrop"
                    aria-label="Fechar perfil"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="admin-user-menu-panel" role="dialog" aria-label="Meu perfil">
                    <UserProfilePanel onClose={() => setProfileOpen(false)} />
                  </div>
                </>
              ) : null}
            </div>
            <button type="button" className="btn-ghost btn-sm" onClick={onLogout}>
              Sair
            </button>
          </div>
        </header>

        <main className="admin-content">
          <FlashMessageProvider hostClassName="flash-message-host--admin-main">
            <Outlet />
          </FlashMessageProvider>
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <NavigationProvider>
      <AdminLayoutInner />
    </NavigationProvider>
  );
}
