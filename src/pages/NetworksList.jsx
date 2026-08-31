import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';

export function NetworksList({ networks, loading, error, onAdd, onView, onEdit }) {
  const list = useCrudList(networks, {
    searchKeys: ['name'],
    defaultSort: { key: 'name', direction: 'asc' },
    storageKey: LIST_PREFERENCE_KEYS.networks,
  });

  return (
    <CrudListShell
      title="Parceiros"
      subtitle="Gerencie redes de academias parceiras da plataforma."
      addLabel="Adicionar rede"
      onAdd={onAdd}
      loading={loading}
      error={error}
      query={list.query}
      onQueryChange={list.onQueryChange}
      searchPlaceholder="Buscar por nome da rede"
      sortKey={list.sortKey}
      sortDirection={list.sortDirection}
      onSortChange={list.setSort}
      sortOptions={[
        { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
        { key: 'name', direction: 'desc', label: 'Nome (Z–A)' },
        { key: 'unitCount', direction: 'desc', label: 'Mais unidades' },
      ]}
      page={list.page}
      pageSize={list.pageSize}
      totalItems={list.totalItems}
      totalPages={list.totalPages}
      onPageChange={list.setPage}
      onPageSizeChange={list.onPageSizeChange}
      panelTitle="Parceiros cadastrados"
      emptyMessage="Nenhuma rede cadastrada. Clique em Adicionar rede para começar."
      columns={[
        {
          key: 'logo',
          label: 'Logo',
          render: (row) => (
            <div className="table-logo">
              {row.logoUrl ? (
                <img src={row.logoUrl} alt="" />
              ) : (
                <span className="table-logo-fallback">{row.name.slice(0, 1)}</span>
              )}
            </div>
          ),
        },
        { key: 'name', label: 'Rede', render: (row) => <strong>{row.name}</strong> },
        {
          key: 'unitCount',
          label: 'Unidades',
          render: (row) => <span className="badge badge-muted">{row.unitCount ?? 0}</span>,
        },
        {
          key: 'primaryMemberCount',
          label: 'Academia principal',
          render: (row) => (
            <span className="badge badge-muted" title="Usuários do app com unidade principal nesta rede">
              {row.primaryMemberCount ?? 0}
            </span>
          ),
        },
        {
          key: 'partnerUserCount',
          label: 'Usuários vinculados',
          render: (row) => (
            <span
              className={`badge ${row.partnerUserCount ? 'badge-warning' : 'badge-muted'}`}
              title="Equipe com acesso às unidades desta rede"
            >
              {row.partnerUserCount ?? 0}
            </span>
          ),
        },
        {
          key: 'commercialOwnerName',
          label: 'Resp. comercial',
          render: (row) => row.commercialOwnerName ?? '—',
        },
      ]}
      rows={list.rows}
      onView={(row) => onView(row.id)}
      onEdit={(row) => onEdit(row.id)}
    />
  );
}
