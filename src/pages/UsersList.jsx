import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Calendar, Mail, Phone, User } from 'lucide-react';
import { PageHeader } from '../components/PageHeader.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { AppLoading } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudListToolbar, CrudPagination } from '../components/crud/CrudListToolbar.jsx';
import { CrudRowActions } from '../components/crud/CrudRowActions.jsx';
import { appConfirm } from '../components/confirm/appConfirm.js';
import { activeStatusFilter, selectFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function formatPhoneDisplay(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function countUsersByStatus(users) {
  const counts = { total: users.length, active: 0, inactive: 0 };
  for (const user of users) {
    if (user.active) counts.active += 1;
    else counts.inactive += 1;
  }
  return counts;
}

function selectableUserIds(users, currentUserId) {
  return users
    .map((user) => user.id)
    .filter((id) => id && id !== currentUserId);
}

function UserMetaChip({ icon: Icon, label, value, href }) {
  if (!value || value === '—') return null;

  const content = href ? (
    <a href={href} onClick={(ev) => ev.stopPropagation()}>
      {value}
    </a>
  ) : (
    <span>{value}</span>
  );

  return (
    <span className="users-registry-chip" title={label}>
      <Icon size={13} aria-hidden="true" />
      {content}
    </span>
  );
}

function UserRegistryCard({
  user,
  selected,
  selectable,
  onToggleSelect,
  onView,
  onEdit,
}) {
  const phone = formatPhoneDisplay(user.mobilePhone);
  const hasSecondaryRow = Boolean(user.email || user.cpf || phone || user.jobPositionName);
  const open = () => (onView ? onView(user.id) : onEdit(user.id));

  return (
    <article
      className={`users-registry-card${user.active ? '' : ' users-registry-card--inactive'}${selected ? ' users-registry-card--selected' : ''}${selectable ? ' users-registry-card--selectable' : ''}`}
      onClick={open}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          open();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="users-registry-row users-registry-row--primary">
        {selectable ? (
          <label
            className="users-registry-select"
            onClick={(ev) => ev.stopPropagation()}
            onKeyDown={(ev) => ev.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={selected}
              aria-label={`Selecionar ${user.name}`}
              onChange={() => onToggleSelect(user.id)}
            />
          </label>
        ) : null}

        <Avatar
          name={user.name}
          src={user.avatarUrl}
          color={user.avatarColor}
          size="sm"
          className="users-registry-avatar"
        />

        <div className="users-registry-identity">
          <h3 className="users-registry-title">{user.name}</h3>
        </div>

        <span className={user.active ? 'badge badge-success' : 'badge badge-muted'}>
          {user.active ? 'Ativo' : 'Inativo'}
        </span>

        <div className="users-registry-metrics">
          <span className="users-registry-metric" title="Data de cadastro">
            <Calendar size={14} aria-hidden="true" />
            <span className="users-registry-metric-label">Cadastro</span>
            <strong>{formatDate(user.createdAt)}</strong>
          </span>
        </div>

        <div className="users-registry-actions">
          <CrudRowActions
            onView={onView ? () => onView(user.id) : undefined}
            onEdit={() => onEdit(user.id)}
          />
        </div>
      </div>

      {hasSecondaryRow ? (
        <div className="users-registry-row users-registry-row--secondary">
          <UserMetaChip
            icon={Mail}
            label="E-mail"
            value={user.email || null}
            href={user.email ? `mailto:${user.email}` : undefined}
          />
          <UserMetaChip icon={User} label="CPF" value={user.cpf || null} />
          <UserMetaChip
            icon={Phone}
            label="Celular"
            value={phone || null}
            href={phone ? `tel:+55${String(user.mobilePhone).replace(/\D/g, '')}` : undefined}
          />
          {user.jobPositionName ? (
            <UserMetaChip icon={Briefcase} label="Cargo" value={user.jobPositionName} />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function StatPanel({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      className={`panel stat-panel users-stat-panel${active ? ' users-stat-panel--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </button>
  );
}

function activeFilterValue(fieldFilters) {
  const match = fieldFilters.find((item) => item.id === 'active');
  if (!match || match.value === '' || match.value === undefined || match.value === null) {
    return 'all';
  }
  return match.value === true || match.value === 'true' ? 'active' : 'inactive';
}

export function UsersList({
  users,
  loading,
  error,
  message,
  currentUserId,
  canManage = true,
  onAdd,
  onView,
  onEdit,
  onBulkRemove,
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const filterDefinitions = useMemo(() => {
    const groups = new Map();
    users.forEach((user) => {
      if (user.userGroupId && user.userGroupName) {
        groups.set(user.userGroupId, user.userGroupName);
      }
    });

    return [
      selectFilter(
        'userGroupId',
        'Grupo de acesso',
        'userGroupId',
        [...groups.entries()].map(([value, label]) => ({ value, label })),
      ),
      activeStatusFilter(),
    ];
  }, [users]);

  const list = useCrudList(users, {
    searchKeys: ['name', 'email', 'cpf', 'mobilePhone', 'jobPositionName'],
    filterDefinitions,
    defaultSort: { key: 'name', direction: 'asc' },
    defaultPageSize: 15,
    storageKey: LIST_PREFERENCE_KEYS.users,
  });

  const counts = useMemo(() => countUsersByStatus(users), [users]);
  const statusFilter = activeFilterValue(list.fieldFilters);

  const filteredSelectableIds = useMemo(
    () => selectableUserIds(list.allRows, currentUserId),
    [list.allRows, currentUserId],
  );

  const pageSelectableIds = useMemo(
    () => selectableUserIds(list.rows, currentUserId),
    [list.rows, currentUserId],
  );

  const selectedCount = selectedIds.size;
  const allFilteredSelected =
    filteredSelectableIds.length > 0 &&
    filteredSelectableIds.every((id) => selectedIds.has(id));
  const allPageSelected =
    pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedIds.has(id));

  useEffect(() => {
    setSelectedIds((current) => {
      const valid = new Set(users.map((user) => user.id));
      const next = new Set([...current].filter((id) => valid.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [users]);

  const applyStatusFilter = (next) => {
    if (next === 'all') {
      list.removeFieldFilter('active');
      return;
    }
    list.applyFieldFilter({
      id: 'active',
      value: next === 'active',
    });
  };

  const toggleSelect = (id) => {
    if (!canManage || id === currentUserId) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectIds = (ids) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const removeSelected = async () => {
    const ids = [...selectedIds];
    if (!ids.length || !onBulkRemove) return;

    const confirmed = await appConfirm({
      title: 'Remover usuários selecionados',
      message: `Remover ${ids.length} usuário(s) selecionado(s)? Esta ação não pode ser desfeita.`,
      confirmLabel: `Remover ${ids.length} usuário(s)`,
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      await onBulkRemove(ids);
      clearSelection();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack users-page">
      <PageHeader
        title="Usuários"
        subtitle="Pessoas cadastradas na plataforma — clientes, equipe e administradores."
        actions={
          onAdd ? (
            <button type="button" className="btn-primary" onClick={onAdd}>
              Adicionar usuário
            </button>
          ) : null
        }
      />

      <CrudAlerts error={error} message={message} />

      <div className="stat-grid users-stat-grid">
        <StatPanel
          label="Total"
          value={counts.total}
          active={statusFilter === 'all'}
          onClick={() => applyStatusFilter('all')}
        />
        <StatPanel
          label="Ativos"
          value={counts.active}
          active={statusFilter === 'active'}
          onClick={() => applyStatusFilter('active')}
        />
        <StatPanel
          label="Inativos"
          value={counts.inactive}
          active={statusFilter === 'inactive'}
          onClick={() => applyStatusFilter('inactive')}
        />
      </div>

      <section className="panel users-registry-panel">
        <div className="panel-header list-toolbar-header">
          <h2>Usuários cadastrados</h2>
          <span className="panel-meta">
            {list.totalItems} de {counts.total} na listagem
            {selectedCount > 0 ? ` · ${selectedCount} selecionado(s)` : ''}
          </span>
        </div>

        {canManage && !loading && filteredSelectableIds.length > 0 ? (
          <div className="panel-body users-bulk-bar">
            <div className="users-bulk-bar-actions">
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={busy || allPageSelected}
                onClick={() => selectIds(pageSelectableIds)}
              >
                Selecionar página
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={busy || allFilteredSelected}
                onClick={() => selectIds(filteredSelectableIds)}
              >
                Selecionar filtrados ({filteredSelectableIds.length})
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={busy || selectedCount === 0}
                onClick={clearSelection}
              >
                Limpar seleção
              </button>
            </div>
            <button
              type="button"
              className="btn-ghost btn-sm btn-danger"
              disabled={busy || selectedCount === 0}
              onClick={removeSelected}
            >
              Remover selecionados{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </button>
          </div>
        ) : null}

        <div className="panel-body list-toolbar-body">
          <CrudListToolbar
            query={list.query}
            onQueryChange={list.onQueryChange}
            placeholder="Buscar por nome, e-mail, CPF ou celular…"
            sortKey={list.sortKey}
            sortDirection={list.sortDirection}
            sortOptions={[
              { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
              { key: 'name', direction: 'desc', label: 'Nome (Z–A)' },
              { key: 'createdAt', direction: 'desc', label: 'Cadastro (recente)' },
            ]}
            onSortChange={list.setSort}
            pageSize={list.pageSize}
            onPageSizeChange={list.onPageSizeChange}
            showPageSize
            filterDefinitions={filterDefinitions}
            fieldFilters={list.fieldFilters}
            onApplyFieldFilter={list.applyFieldFilter}
            onRemoveFieldFilter={list.removeFieldFilter}
            onClearFieldFilters={list.clearFieldFilters}
          />
        </div>

        <div className="panel-body users-registry-body">
          {loading ? (
            <AppLoading label="Carregando usuários…" />
          ) : list.rows.length === 0 ? (
            <div className="empty-state">
              {users.length === 0
                ? 'Nenhum usuário cadastrado. Clique em Adicionar usuário para começar.'
                : 'Nenhum usuário corresponde aos filtros aplicados.'}
            </div>
          ) : (
            <div className="users-registry-list">
              {list.rows.map((user) => (
                <UserRegistryCard
                  key={user.id}
                  user={user}
                  selected={selectedIds.has(user.id)}
                  selectable={canManage && user.id !== currentUserId}
                  onToggleSelect={toggleSelect}
                  onView={onView}
                  onEdit={onEdit}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && list.totalItems > 0 ? (
          <div className="panel-body crud-pagination-wrap">
            <CrudPagination
              page={list.page}
              pageSize={list.pageSize}
              totalPages={list.totalPages}
              totalItems={list.totalItems}
              onPageChange={list.setPage}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
