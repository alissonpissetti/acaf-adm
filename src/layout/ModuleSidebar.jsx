import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigation, useActiveModuleItem } from '../navigation/NavigationContext.jsx';
import { isExternalRoute } from '../navigation/routeUtils.js';
import { isNavigationItemActive } from '../navigation/navActive.js';
import { ModuleIcon } from '../utils/icons.jsx';

function moduleHasExternalItems(module) {
  return module.items.some((item) => isExternalRoute(item.route));
}

function ModuleChildLinks({ module, location, onNavigate, className }) {
  return (
    <div
      className={className}
      id={`module-items-${module.id}`}
      role="group"
      aria-label={`Telas: ${module.name}`}
    >
      {module.items.map((item) => {
        const external = isExternalRoute(item.route);

        if (external) {
          return (
            <a
              key={item.id}
              href={item.route}
              target="_blank"
              rel="noopener noreferrer"
              className="module-sidebar-child-link module-sidebar-child-link--external"
              onClick={onNavigate}
            >
              <span>{item.label}</span>
              <ExternalLink
                size={13}
                strokeWidth={2}
                className="module-sidebar-external-icon"
                aria-hidden="true"
              />
            </a>
          );
        }

        return (
          <NavLink
            key={item.id}
            to={item.route}
            className={() =>
              isNavigationItemActive(item, location)
                ? 'module-sidebar-child-link active'
                : 'module-sidebar-child-link'
            }
            onClick={onNavigate}
          >
            {item.label}
          </NavLink>
        );
      })}
    </div>
  );
}

export function ModuleSidebar({ onNavigate, collapsed = false }) {
  const { modules, loading } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const { module: activeModule } = useActiveModuleItem(location.pathname, location.search);
  const [expandedModuleIds, setExpandedModuleIds] = useState(() => new Set());
  const navRef = useRef(null);

  useEffect(() => {
    if (!activeModule?.id) return;
    setExpandedModuleIds((prev) => {
      if (prev.has(activeModule.id)) return prev;
      const next = new Set(prev);
      next.add(activeModule.id);
      return next;
    });
  }, [activeModule?.id]);

  useEffect(() => {
    if (collapsed) return;
    if (!navRef.current) return;
    const activeLink = navRef.current.querySelector('.module-sidebar-child-link.active');
    activeLink?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [location.pathname, activeModule?.id, collapsed]);

  useEffect(() => {
    if (!collapsed) return undefined;
    const onPointerDown = (ev) => {
      if (!navRef.current?.contains(ev.target)) {
        setExpandedModuleIds(new Set());
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [collapsed]);

  useEffect(() => {
    if (!collapsed) return;
    setExpandedModuleIds(new Set());
  }, [collapsed, location.pathname]);

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

  const handleNavigate = () => {
    if (collapsed) setExpandedModuleIds(new Set());
    onNavigate?.();
  };

  return (
    <nav
      className={`module-sidebar-nav${collapsed ? ' is-collapsed' : ''}`}
      aria-label="Módulos"
      ref={navRef}
    >
      <div className="module-sidebar-section-label">Módulos</div>
      {modules.map((module) => {
        const isActiveModule = activeModule?.id === module.id;
        const isOpen = expandedModuleIds.has(module.id);
        const hasItems = module.items.length > 0;
        const externalModule = moduleHasExternalItems(module);

        const onModuleClick = () => {
          if (!hasItems) return;

          if (collapsed) {
            setExpandedModuleIds((prev) => {
              if (prev.has(module.id)) return new Set();
              return new Set([module.id]);
            });
            return;
          }

          if (externalModule) {
            setExpandedModuleIds((prev) => {
              const next = new Set(prev);
              if (next.has(module.id)) next.delete(module.id);
              else next.add(module.id);
              return next;
            });
            return;
          }

          if (isActiveModule) {
            setExpandedModuleIds((prev) => new Set(prev).add(module.id));
            return;
          }

          if (isOpen) {
            setExpandedModuleIds((prev) => {
              const next = new Set(prev);
              next.delete(module.id);
              return next;
            });
            return;
          }

          setExpandedModuleIds((prev) => new Set(prev).add(module.id));
          const firstInternal = module.items.find((item) => !isExternalRoute(item.route));
          if (firstInternal) navigate(firstInternal.route);
        };

        return (
          <div
            key={module.id}
            className={`module-sidebar-group${isOpen ? ' is-open' : ''}${isActiveModule ? ' is-active-module' : ''}`}
          >
            <button
              type="button"
              className={isOpen || isActiveModule ? 'module-sidebar-toggle active' : 'module-sidebar-toggle'}
              title={collapsed ? module.name : module.name}
              aria-expanded={isOpen}
              aria-controls={`module-items-${module.id}`}
              aria-current={isActiveModule ? 'true' : undefined}
              onClick={onModuleClick}
            >
              <span className="module-sidebar-icon" aria-hidden="true">
                <ModuleIcon name={module.icon} size={18} />
              </span>
              <span className="module-sidebar-label">{module.name}</span>
              <span className="module-sidebar-chevron" aria-hidden="true">
                <ChevronRight size={18} strokeWidth={2} />
              </span>
            </button>

            {isOpen && hasItems && !collapsed ? (
              <ModuleChildLinks
                module={module}
                location={location}
                onNavigate={handleNavigate}
                className="module-sidebar-children"
              />
            ) : null}

            {isOpen && hasItems && collapsed ? (
              <ModuleChildLinks
                module={module}
                location={location}
                onNavigate={handleNavigate}
                className="module-sidebar-children module-sidebar-flyout"
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}