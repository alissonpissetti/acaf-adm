import { useCallback, useEffect, useMemo, useState } from 'react';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { TableNetworkLogo } from '../components/TableNetworkLogo.jsx';
import { mergeNetworks } from '../api/admin.js';
import { appChoose, appConfirm } from '../components/confirm/appConfirm.js';
import { useFlashMessage } from '../components/flash/FlashMessageProvider.jsx';

export function NetworksList({ networks, loading, error, onAdd, onView, onEdit, onDelete, onMerged }) {
  const flash = useFlashMessage();
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [mergeBusy, setMergeBusy] = useState(false);

  const list = useCrudList(networks, {
    searchKeys: ['name'],
    defaultSort: { key: 'name', direction: 'asc' },
    storageKey: LIST_PREFERENCE_KEYS.networks,
  });

  const networkById = useMemo(() => new Map(networks.map((n) => [n.id, n])), [networks]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set();
      for (const id of prev) {
        if (networkById.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [networkById]);

  const toggleRow = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePage = useCallback(() => {
    const pageIds = list.rows.map((r) => r.id).filter(Boolean);
    setSelectedIds((prev) => {
      const allSelected = pageIds.length > 0 && pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }, [list.rows]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleMerge = async () => {
    const ids = [...selectedIds];
    if (ids.length < 2) return;

    const ok = await appConfirm({
      title: 'Agrupar redes',
      message:
        `As unidades das ${ids.length} redes selecionadas passarão a pertencer à mesma rede. ` +
        'Você escolhe qual nome, logo e redes sociais manter; as outras entradas somem da lista (as unidades e CNPJs ficam). ' +
        'Não é possível desfazer automaticamente. Confirma?',
      confirmLabel: 'Continuar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!ok) return;

    const choices = ids
      .map((id) => networkById.get(id))
      .filter(Boolean)
      .map((n) => ({
        id: n.id,
        label: `${n.name} (${n.unitCount ?? 0} unid.)`,
        primary: false,
      }));

    if (!choices.length) return;

    const keeperId = await appChoose({
      title: 'Rede a manter',
      message: 'Escolha qual cadastro de rede será conservado (nome, logo e links). As demais serão unidas nele.',
      cancelLabel: 'Cancelar',
      choices: choices.map((c, i) => (i === 0 ? { ...c, primary: true } : c)),
    });
    if (!keeperId) return;

    setMergeBusy(true);
    try {
      await mergeNetworks({
        keeperNetworkId: keeperId,
        mergeNetworkIds: ids,
      });
      clearSelection();
      flash.success(
        `Redes agrupadas. As unidades agora estão em «${networkById.get(keeperId)?.name ?? keeperId}».`,
        8000,
      );
      onMerged?.();
    } catch (err) {
      flash.error(err.message ?? 'Não foi possível agrupar as redes.');
    } finally {
      setMergeBusy(false);
    }
  };

  const mergeBar =
    selectedIds.size >= 2 ? (
      <div className="networks-merge-bar" role="region" aria-label="Agrupamento de redes">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={mergeBusy || loading}
          onClick={() => void handleMerge()}
        >
          {mergeBusy ? 'Agrupando…' : 'Agrupar numa rede'}
        </button>
        <span className="networks-merge-bar-meta">
          {selectedIds.size} selecionada(s) — as unidades ficarão na rede que você escolher
        </span>
        <button type="button" className="btn-ghost btn-sm" disabled={mergeBusy} onClick={clearSelection}>
          Limpar seleção
        </button>
      </div>
    ) : null;

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
      tableFooter={mergeBar}
      selection={{
        selectedIds,
        onToggleRow: toggleRow,
        onTogglePage: togglePage,
      }}
      columns={[
        {
          key: 'logo',
          label: 'Logo',
          className: 'data-table-col-logo',
          render: (row) => <TableNetworkLogo logoUrl={row.logoUrl} name={row.name} />,
        },
        {
          key: 'name',
          label: 'Rede',
          className: 'data-table-cell-wrap data-table-col-network-name',
          render: (row) => <strong>{row.name}</strong>,
        },
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
      onRowClick={onEdit ? (row) => onEdit(row.id) : onView ? (row) => onView(row.id) : undefined}
      onView={onView ? (row) => onView(row.id) : undefined}
      onEdit={onEdit ? (row) => onEdit(row.id) : undefined}
      onDelete={onDelete}
    />
  );
}
