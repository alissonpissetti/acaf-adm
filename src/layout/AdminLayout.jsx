import { NavLink, Outlet } from 'react-router-dom';
import './AdminLayout.css';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/networks', label: 'Redes' },
  { to: '/units', label: 'Unidades' },
  { to: '/connect', label: 'Connect' },
  { to: '/settings', label: 'Configurações' },
];

export function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">A</span>
          <div>
            <strong>ACAF</strong>
            <span>Administração</span>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
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

        <footer className="admin-sidebar-footer">
          <small>Painel interno ACAF</small>
        </footer>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1>Área administrativa</h1>
            <p>Gestão do produto ACAF Connect</p>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
