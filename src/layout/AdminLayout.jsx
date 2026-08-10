import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import './AdminLayout.css';

const navSections = [
  {
    label: 'Operação',
    items: [
      { to: '/', label: 'Dashboard', end: true },
      { to: '/networks', label: 'Redes parceiras' },
      { to: '/modalities', label: 'Modalidades' },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { to: '/connect', label: 'Planos Connect' },
      { to: '/users', label: 'Usuários' },
    ],
  },
  {
    label: 'Corporativo',
    items: [{ to: '/companies', label: 'Empresas' }],
  },
];

const pageTitles = {
  '/': 'Dashboard',
  '/networks': 'Redes parceiras',
  '/modalities': 'Modalidades',
  '/connect': 'Planos Connect',
  '/users': 'Usuários',
  '/companies': 'Empresas corporativas',
};

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const topTitle = pageTitles[location.pathname] ?? 'ACAF Admin';

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">A</span>
          <div>
            <strong>ACAF</strong>
            <span>Console administrativo</span>
          </div>
        </div>

        {navSections.map((section) => (
          <div key={section.label} className="admin-nav-section">
            <span className="admin-nav-label">{section.label}</span>
            <nav className="admin-nav">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive ? 'admin-nav-link active' : 'admin-nav-link'
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <footer className="admin-sidebar-footer">
          <div className="admin-env-badge">Área logada</div>
          <small>{user?.email ?? 'Equipe ACAF Connect'}</small>
        </footer>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-title">{topTitle}</div>
          <div className="admin-topbar-actions">
            <span className="admin-user-chip">{user?.name}</span>
            <button type="button" className="btn-ghost btn-sm" onClick={onLogout}>
              Sair
            </button>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
