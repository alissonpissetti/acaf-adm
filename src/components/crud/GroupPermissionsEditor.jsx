import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { ModuleIcon } from '../../utils/icons.jsx';
import '../../styles/group-permissions.css';

const FILTER_ALL = 'all';
const FILTER_SELECTED = 'selected';
const FILTER_UNSELECTED = 'unselected';

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toggleIds(selectedIds, ids, checked) {
  if (checked) return [...new Set([...selectedIds, ...ids])];
  const remove = new Set(ids);
  return selectedIds.filter((id) => !remove.has(id));
}

function collectItemPermissionIds(item) {
  return [item.permissions?.view?.id, item.permissions?.manage?.id].filter(Boolean);
}

function collectModulePermissionIds(module) {
  return module.items.flatMap((item) => collectItemPermissionIds(item));
}

function moduleStats(module, selectedIds) {
  const ids = collectModulePermissionIds(module);
  const selected = ids.filter((id) => selectedIds.includes(id));
  return { total: ids.length, selected: selected.length };
}

function applyPermissionChange(selectedIds, permissionId, checked, viewId, manageId, isManage) {
  let next = [...selectedIds];

  if (isManage) {
    if (checked) {
      if (viewId) next = toggleIds(next, [viewId], true);
      next = toggleIds(next, [permissionId], true);
    } else {
      next = toggleIds(next, [permissionId], false);
    }
    return next;
  }

  if (checked) {
    return toggleIds(next, [permissionId], true);
  }

  if (manageId) next = toggleIds(next, [manageId], false);
  return toggleIds(next, [permissionId], false);
}

function itemMatchesSearch(item, query) {
  if (!query) return true;
  const haystack = [
    item.label,
    item.slug,
    item.permissions?.view?.key,
    item.permissions?.manage?.key,
    item.permissions?.view?.label,
    item.permissions?.manage?.label,
  ]
    .filter(Boolean)
    .map(normalize)
    .join(' ');
  return haystack.includes(query);
}

function moduleMatchesSearch(module, query) {
  if (!query) return true;
  if (normalize(module.name).includes(query) || normalize(module.description).includes(query)) {
    return true;
  }
  return module.items.some((item) => itemMatchesSearch(item, query));
}

function itemMatchesFilter(item, selectedIds, filter) {
  const ids = collectItemPermissionIds(item);
  if (!ids.length) return false;

  const selectedCount = ids.filter((id) => selectedIds.includes(id)).length;
  if (filter === FILTER_SELECTED) return selectedCount > 0;
  if (filter === FILTER_UNSELECTED) return selectedCount < ids.length;
  return true;
}

function PermissionActionCell({ label, permission, checked, disabled, onChange }) {
  if (!permission) {
    return <span className="muted">—</span>;
  }

  return (
    <div className="group-permissions-action-cell">
      <label>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
        <span>{label}</span>
      </label>
    </div>
  );
}

function ModulePermissionsSection({
  module,
  selectedIds,
  readOnly,
  expanded,
  onToggleExpanded,
  onToggleModule,
  onTogglePermission,
  visibleItems,
}) {
  const stats = moduleStats(module, selectedIds);
  const allSelected = stats.total > 0 && stats.selected === stats.total;
  const someSelected = stats.selected > 0 && stats.selected < stats.total;

  return (
    <section
      className={`group-permissions-module${stats.selected === 0 ? ' is-dimmed' : ''}`}
    >
      <div className="group-permissions-module-head">
        <button
          type="button"
          className="group-permissions-module-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? 'Recolher módulo' : 'Expandir módulo'}
          onClick={onToggleExpanded}
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        <span className="group-permissions-module-icon" aria-hidden="true">
          <ModuleIcon name={module.icon} size={18} />
        </span>

        <button
          type="button"
          className="group-permissions-module-meta"
          onClick={onToggleExpanded}
        >
          <strong>{module.name}</strong>
          {module.description ? <small>{module.description}</small> : null}
        </button>

        <div className="group-permissions-module-badges">
          {!readOnly ? (
            <label
              className="group-permissions-module-select"
              onClick={(ev) => ev.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={allSelected}
                ref={(node) => {
                  if (node) node.indeterminate = someSelected;
                }}
                onChange={() =>
                  onToggleModule(collectModulePermissionIds(module), !allSelected)
                }
              />
              <span>Módulo</span>
            </label>
          ) : null}
          <span className="badge badge-muted">
            {stats.selected}/{stats.total}
          </span>
        </div>
      </div>

      {expanded ? (
        <div className="group-permissions-module-body">
          <table className="group-permissions-table">
            <thead>
              <tr>
                <th>Tela / funcionalidade</th>
                <th>Ver</th>
                <th>Gerenciar</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const view = item.permissions?.view;
                const manage = item.permissions?.manage;
                const viewChecked = view ? selectedIds.includes(view.id) : false;
                const manageChecked = manage ? selectedIds.includes(manage.id) : false;

                return (
                  <tr key={item.id}>
                    <td>
                      <span className="group-permissions-item-label">{item.label}</span>
                      {view?.key ? (
                        <span className="group-permissions-item-key">{view.key}</span>
                      ) : null}
                    </td>
                    <td>
                      <PermissionActionCell
                        label="Ver"
                        permission={view}
                        checked={viewChecked}
                        disabled={readOnly}
                        onChange={() =>
                          onTogglePermission(view?.id, !viewChecked, view?.id, manage?.id, false)
                        }
                      />
                    </td>
                    <td>
                      <PermissionActionCell
                        label="Gerenciar"
                        permission={manage}
                        checked={manageChecked}
                        disabled={readOnly}
                        onChange={() =>
                          onTogglePermission(
                            manage?.id,
                            !manageChecked,
                            view?.id,
                            manage?.id,
                            true,
                          )
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export function GroupPermissionsEditor({
  modules = [],
  permissions = [],
  selectedIds = [],
  onChange,
  readOnly = false,
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(FILTER_ALL);
  const [expandedModules, setExpandedModules] = useState({});

  const normalizedSearch = normalize(search);

  const modulePermissionIds = useMemo(() => {
    const ids = new Set();
    for (const module of modules) {
      for (const id of collectModulePermissionIds(module)) ids.add(id);
    }
    return ids;
  }, [modules]);

  const orphanPermissions = useMemo(
    () => permissions.filter((permission) => !modulePermissionIds.has(permission.id)),
    [permissions, modulePermissionIds],
  );

  const totalCount = useMemo(() => {
    const ids = new Set(permissions.map((permission) => permission.id));
    return ids.size;
  }, [permissions]);

  const visibleModules = useMemo(() => {
    return modules
      .map((module) => {
        const moduleNameMatch =
          Boolean(normalizedSearch) && normalize(module.name).includes(normalizedSearch);
        const items = module.items
          .filter((item) => moduleNameMatch || itemMatchesSearch(item, normalizedSearch))
          .filter((item) => itemMatchesFilter(item, selectedIds, filter));

        if (!moduleMatchesSearch(module, normalizedSearch) && items.length === 0) {
          return null;
        }

        if (!items.length && filter !== FILTER_ALL) return null;

        return { module, items };
      })
      .filter(Boolean);
  }, [modules, normalizedSearch, filter, selectedIds]);

  const visibleOrphans = useMemo(() => {
    return orphanPermissions.filter((permission) => {
      const haystack = normalize(`${permission.label} ${permission.key}`);
      if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;
      const checked = selectedIds.includes(permission.id);
      if (filter === FILTER_SELECTED) return checked;
      if (filter === FILTER_UNSELECTED) return !checked;
      return true;
    });
  }, [orphanPermissions, normalizedSearch, filter, selectedIds]);

  useEffect(() => {
    setExpandedModules((current) => {
      if (Object.keys(current).length > 0) return current;
      const next = {};
      for (const module of modules) {
        if (moduleStats(module, selectedIds).selected > 0) {
          next[module.id] = true;
        }
      }
      return next;
    });
  }, [modules, selectedIds]);

  useEffect(() => {
    if (!normalizedSearch && filter === FILTER_ALL) return;

    setExpandedModules((current) => {
      const next = { ...current };
      for (const entry of visibleModules) {
        next[entry.module.id] = true;
      }
      return next;
    });
  }, [normalizedSearch, filter, visibleModules]);

  const setSelection = (ids, checked) => {
    if (readOnly || !onChange) return;
    onChange(toggleIds(selectedIds, ids, checked));
  };

  const togglePermission = (permissionId, checked, viewId, manageId, isManage) => {
    if (readOnly || !onChange || !permissionId) return;
    onChange(applyPermissionChange(selectedIds, permissionId, checked, viewId, manageId, isManage));
  };

  const expandAll = () => {
    const next = {};
    for (const entry of visibleModules) next[entry.module.id] = true;
    setExpandedModules(next);
  };

  const collapseAll = () => setExpandedModules({});

  const selectAllVisible = () => {
    const ids = [];
    for (const entry of visibleModules) ids.push(...collectModulePermissionIds(entry.module));
    for (const permission of visibleOrphans) ids.push(permission.id);
    setSelection(ids, true);
  };

  const clearAllVisible = () => {
    const ids = [];
    for (const entry of visibleModules) ids.push(...collectModulePermissionIds(entry.module));
    for (const permission of visibleOrphans) ids.push(permission.id);
    setSelection(ids, false);
  };

  const empty =
    visibleModules.length === 0 &&
    visibleOrphans.length === 0 &&
    (normalizedSearch || filter !== FILTER_ALL);

  return (
    <div className="group-permissions">
      <div className="group-permissions-toolbar">
        <div className="group-permissions-toolbar-row">
          <label className="group-permissions-search">
            <Search size={16} aria-hidden="true" />
            <input
              className="input"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              placeholder="Buscar módulo, tela ou permissão…"
            />
          </label>
          <span className="group-permissions-summary">
            {selectedIds.length} de {totalCount} selecionada(s)
          </span>
        </div>

        <div className="group-permissions-toolbar-row">
          <div className="group-permissions-filter" role="tablist" aria-label="Filtrar permissões">
            {[
              { value: FILTER_ALL, label: 'Todas' },
              { value: FILTER_SELECTED, label: 'Selecionadas' },
              { value: FILTER_UNSELECTED, label: 'Não selecionadas' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`group-permissions-filter-btn${filter === option.value ? ' is-active' : ''}`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="group-permissions-actions">
            <button type="button" className="btn-ghost btn-sm" onClick={expandAll}>
              Expandir
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={collapseAll}>
              Recolher
            </button>
            {!readOnly ? (
              <>
                <button type="button" className="btn-ghost btn-sm" onClick={selectAllVisible}>
                  Marcar visíveis
                </button>
                <button type="button" className="btn-ghost btn-sm" onClick={clearAllVisible}>
                  Limpar visíveis
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="group-permissions-body">
        {empty ? (
          <div className="group-permissions-empty">
            Nenhuma permissão encontrada com os filtros atuais.
          </div>
        ) : null}

        {visibleModules.map(({ module, items }) => (
          <ModulePermissionsSection
            key={module.id}
            module={module}
            selectedIds={selectedIds}
            readOnly={readOnly}
            expanded={Boolean(expandedModules[module.id])}
            visibleItems={items}
            onToggleExpanded={() =>
              setExpandedModules((current) => ({
                ...current,
                [module.id]: !current[module.id],
              }))
            }
            onToggleModule={setSelection}
            onTogglePermission={togglePermission}
          />
        ))}

        {visibleOrphans.length > 0 ? (
          <section className="group-permissions-orphans">
            <h4>Outras permissões</h4>
            <div className="group-permissions-orphans-grid">
              {visibleOrphans.map((permission) => (
                <label key={permission.id} className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(permission.id)}
                    disabled={readOnly}
                    onChange={() =>
                      togglePermission(
                        permission.id,
                        !selectedIds.includes(permission.id),
                        permission.id,
                        null,
                        false,
                      )
                    }
                  />
                  <span>{permission.label}</span>
                  <small>{permission.key}</small>
                </label>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
