import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { CrudRowMenu } from '../components/crud/CrudRowMenu.jsx';
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

function userStatusBadge(user) {
  return (
    <span className={user.active ? 'badge badge-success' : 'badge badge-muted'}>
      {user.active ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function UserListIdentity({ user }) {
  const phone = formatPhoneDisplay(user.mobilePhone);
  return (
    <div className="crud-list-identity users-list-identity">
      <strong className="crud-list-identity__title">{user.name}</strong>
      <span
        className={`crud-list-identity__meta--mobile users-list-identity-badge${user.active ? '' : ' users-list-identity-badge--inactive'}`}
      >
        {userStatusBadge(user)}
      </span>
      {user.email ? (
        <span className="crud-list-identity__meta--mobile crud-list-identity__meta-line">
          <a href={`mailto:${user.email}`} onClick={(ev) => ev.stopPropagation()}>
            {user.email}
          </a>
        </span>
      ) : null}
      {user.cpf ? (
        <span className="crud-list-identity__meta--mobile crud-list-identity__meta-line">
          CPF {user.cpf}
        </span>
      ) : null}
      {phone ? (
        <span className="crud-list-identity__meta--mobile crud-list-identity__meta-line">
          <a
            href={`tel:+55${String(user.mobilePhone).replace(/\D/g, '')}`}
            onClick={(ev) => ev.stopPropagation()}
          >
            {phone}
          </a>
        </span>
      ) : null}
      {user.jobPositionName ? (
        <span className="crud-list-identity__meta--mobile crud-list-identity__meta-line">
          {user.jobPositionName}
        </span>
      ) : null}
      {user.userGroupName ? (
        <span className="crud-list-identity__meta--mobile crud-list-identity__meta-line muted">
          {user.userGroupName}
        </span>
      ) : null}
      <span className="crud-list-identity__meta--mobile crud-list-identity__meta-line muted">
        Cadastro {formatDate(user.createdAt)}
      </span>
    </div>
  );
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
  const [openRowMenuId, setOpenRowMenuId] = useState(null);

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
    searchKeys: ['name', 'email', 'cpf', 'mobilePhone', 'jobPositionName', 'userGroupName'],
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

  const toggleSelect = useCallback(
    (id) => {
      if (!canManage || id === currentUserId) return;
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [canManage, currentUserId],
  );

  const selectIds = useCallback((ids) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const togglePage = useCallback(() => {
    const pageIds = pageSelectableIds;
    if (!pageIds.length) return;
    setSelectedIds((prev) => {
      const allSelected = pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }, [pageSelectableIds]);

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

  const bulkBar =
    canManage && !loading && filteredSelectableIds.length > 0 ? (
      <div className="users-bulk-bar" role="region" aria-label="Seleção em massa">
        <div className="users-bulk-bar-actions">
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={busy || pageSelectableIds.every((id) => selectedIds.has(id))}
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
          onClick={() => void removeSelected()}
        >
          Remover selecionados{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </button>
      </div>
    ) : null;

  const selection =
    canManage && filteredSelectableIds.length > 0
      ? {
          selectedIds,
          onToggleRow: toggleSelect,
          onTogglePage: togglePage,
        }
      : null;

  return (
    <div className="page-stack crud-list-page users-page">
      <PageHeader
        title="Usuários"
        subtitle="Pessoas cadastradas na plataforma — clientes, equipe e administradores."
        actions={
          canManage && onAdd ? (
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

      <section className="panel crud-list-panel users-registry-panel">
        <div className="panel-header panel-header--meta-only">
          <h2>Usuários cadastrados</h2>
          <span className="panel-meta">
            {list.totalItems} de {counts.total} na listagem
            {selectedCount > 0 ? ` · ${selectedCount} selecionado(s)` : ''}
          </span>
        </div>

        <CrudListShell
          embedded
          loading={loading || busy}
          query={list.query}
          onQueryChange={list.onQueryChange}
          searchPlaceholder="Buscar por nome, e-mail, CPF, celular ou cargo"
          toolbarLayout="compact"
          toolbarWrapClassName="crud-list-toolbar"
          sortKey={list.sortKey}
          sortDirection={list.sortDirection}
          onSortChange={list.setSort}
          sortOptions={[
            { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
            { key: 'name', direction: 'desc', label: 'Nome (Z–A)' },
            { key: 'createdAt', direction: 'desc', label: 'Cadastro (recente)' },
            { key: 'createdAt', direction: 'asc', label: 'Cadastro (antigo)' },
          ]}
          page={list.page}
          pageSize={list.pageSize}
          totalItems={list.totalItems}
          totalPages={list.totalPages}
          onPageChange={list.setPage}
          onPageSizeChange={list.onPageSizeChange}
          filterDefinitions={filterDefinitions}
          fieldFilters={list.fieldFilters}
          onApplyFieldFilter={list.applyFieldFilter}
          onRemoveFieldFilter={list.removeFieldFilter}
          onClearFieldFilters={list.clearFieldFilters}
          emptyMessage={
            users.length === 0
              ? 'Nenhum usuário cadastrado. Clique em Adicionar usuário para começar.'
              : 'Nenhum usuário corresponde à busca ou aos filtros.'
          }
          tableClassName="crud-list-cards-table crud-list-cards-table--users"
          tableFooter={bulkBar}
          selection={selection}
          columns={[
            {
              key: 'avatar',
              label: '',
              className: 'data-table-col-user-avatar',
              render: (row) => (
                <Avatar
                  name={row.name}
                  src={row.avatarUrl}
                  color={row.avatarColor}
                  size="sm"
                  className="users-list-avatar"
                />
              ),
            },
            {
              key: 'name',
              label: 'Nome',
              headerHint: 'Nome completo do usuário.',
              className: 'data-table-col-list-identity data-table-col-user-name',
              render: (row) => <UserListIdentity user={row} />,
            },
            {
              key: 'email',
              label: 'E-mail',
              headerHint: 'E-mail de acesso e contato.',
              className: 'data-table-col-user-email crud-col-desktop-only',
              render: (row) =>
                row.email ? (
                  <a href={`mailto:${row.email}`} onClick={(ev) => ev.stopPropagation()}>
                    {row.email}
                  </a>
                ) : (
                  '—'
                ),
            },
            {
              key: 'cpf',
              label: 'CPF',
              className: 'data-table-col-user-cpf crud-col-desktop-only',
              render: (row) => row.cpf ?? '—',
            },
            {
              key: 'mobilePhone',
              label: 'Celular',
              mobileLabel: 'Cel.',
              className: 'data-table-col-user-phone crud-col-desktop-only',
              render: (row) => {
                const phone = formatPhoneDisplay(row.mobilePhone);
                if (!phone) return '—';
                return (
                  <a
                    href={`tel:+55${String(row.mobilePhone).replace(/\D/g, '')}`}
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    {phone}
                  </a>
                );
              },
            },
            {
              key: 'jobPositionName',
              label: 'Cargo',
              headerHint: 'Cargo organizacional vinculado.',
              className: 'data-table-col-user-job crud-col-desktop-only',
              render: (row) => row.jobPositionName ?? '—',
            },
            {
              key: 'userGroupName',
              label: 'Grupo',
              headerHint: 'Grupo de permissões de acesso.',
              headerAbbr: 'Grupo',
              className: 'data-table-col-user-group crud-col-desktop-only',
              render: (row) => row.userGroupName ?? '—',
            },
            {
              key: 'active',
              label: 'Status',
              headerHint: 'Usuário ativo pode acessar a plataforma conforme permissões.',
              className: 'data-table-col-user-status crud-col-desktop-only',
              render: (row) => userStatusBadge(row),
            },
            {
              key: 'createdAt',
              label: 'Cadastro',
              headerHint: 'Data de criação do cadastro.',
              className: 'data-table-col-user-created data-table-cell-numeric crud-col-desktop-only',
              render: (row) => formatDate(row.createdAt),
            },
            {
              key: 'rowMenu',
              label: '',
              className: 'data-table-col-row-menu crud-col-mobile-only',
              render: (row) => (
                <CrudRowMenu
                  isOpen={openRowMenuId === row.id}
                  onToggle={() =>
                    setOpenRowMenuId((prev) => (prev === row.id ? null : row.id))
                  }
                  onClose={() => setOpenRowMenuId(null)}
                  onView={onView ? () => onView(row.id) : undefined}
                  onEdit={canManage && onEdit ? () => onEdit(row.id) : undefined}
                />
              ),
            },
          ]}
          rows={list.rows}
          onRowClick={
            onView
              ? (row) => onView(row.id)
              : onEdit
                ? (row) => onEdit(row.id)
                : undefined
          }
          onView={onView ? (row) => onView(row.id) : undefined}
          onEdit={canManage && onEdit ? (row) => onEdit(row.id) : undefined}
          canManage={canManage}
        />
      </section>
    </div>
  );
}