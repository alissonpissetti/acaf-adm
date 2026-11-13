import { useCallback, useEffect, useMemo, useState } from 'react';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { TableNetworkLogo } from '../components/TableNetworkLogo.jsx';
import { mergeNetworks, sendPartnerOnboardingInviteEmail } from '../api/admin.js';
import { appChoose, appConfirm } from '../components/confirm/appConfirm.js';
import { useFlashMessage } from '../components/flash/FlashMessageProvider.jsx';
import { selectFilter } from '../crud/filterUtils.js';
import {
  PARTNER_ACCESS_FILTER_OPTIONS,
  partnerAccessStatusBadgeClass,
  partnerAccessStatusLabel,
  partnerAccessStatusSortRank,
} from '../utils/networkPartnerAccessFilter.js';

/**
 * Cabeçalhos da tabela de parceiros (`headerHint` → atributo title / abbr na coluna).
 * | key | label (mobile data-label) | headerAbbr | headerHint |
 * | logo | Logo | — | Logotipo da rede parceira. |
 * | name | Rede | — | Nome cadastral da rede de academias. |
 * | unitCount | Unidades | — | Número de unidades (filiais) vinculadas à rede. |
 * | primaryMemberCount | Academia principal | Acad. principal | Alunos do app com esta rede como unidade principal. |
 * | partnerAccessStatus | Portal parceiro | Portal | Situação do acesso ao portal do parceiro (onboarding). |
 * | partnerUserCount | Usuários vinculados | Usuários | Equipe com login nas unidades desta rede. |
 * | onboardingInviteEmail | E-mail convite | E-mail | Destino do convite de onboarding. |
 * | onboardingInviteSend | Enviar convite | Enviar | Dispara o e-mail de onboarding. |
 * | commercialOwnerName | Resp. comercial | Resp. com. | Responsável comercial interno (ACAF) pela conta. |
 */
const NETWORKS_TABLE_COLUMN_HINTS = {
  logo: 'Logotipo da rede parceira exibido na listagem.',
  name: 'Nome cadastral da rede de academias parceira.',
  unitCount: 'Quantidade de unidades (filiais) cadastradas nesta rede.',
  primaryMemberCount:
    'Alunos do aplicativo que usam uma unidade desta rede como academia principal.',
  partnerAccessStatus:
    'Situação do acesso ao portal do parceiro: com acesso, convite pendente ou sem acesso.',
  partnerUserCount: 'Usuários da equipe com permissão para gerenciar as unidades da rede.',
  commercialOwnerName: 'Responsável comercial interno (ACAF) associado a esta rede.',
};

export function NetworksList({
  networks,
  loading,
  error,
  onAdd,
  onView,
  onEdit,
  onDelete,
  onMerged,
  onInviteEmailSent,
  mapCityFilter = '',
  mapCityLabel: _mapCityLabel = '',
  mapCityOptions = [],
  onMapCityFilterChange,
  partnerAccessFilter = 'all',
  onPartnerAccessFilterChange,
}) {
  const flash = useFlashMessage();
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [mergeBusy, setMergeBusy] = useState(false);
  const [inviteEmailBusyId, setInviteEmailBusyId] = useState('');

  const getSortValue = useCallback((row, key) => {
    if (key === 'partnerAccessStatus') return partnerAccessStatusSortRank(row);
    return row[key];
  }, []);

  const list = useCrudList(networks, {
    searchKeys: ['name'],
    defaultSort: { key: 'name', direction: 'asc' },
    storageKey: LIST_PREFERENCE_KEYS.networks,
    getSortValue,
  });

  const filterDefinitions = useMemo(() => {
    const defs = [];
    if (onPartnerAccessFilterChange) {
      defs.push(
        selectFilter(
          'partnerAccess',
          'Acesso portal parceiro',
          'partnerAccess',
          PARTNER_ACCESS_FILTER_OPTIONS.filter((opt) => opt.value !== 'all'),
        ),
      );
    }
    if (onMapCityFilterChange && mapCityOptions.length) {
      defs.push({
        id: 'mapCity',
        label: 'Cidade (mapa + lista)',
        type: 'select',
        field: 'mapCity',
        options: [
          ...mapCityOptions.map((c) => ({
            value: c.key,
            label: `${c.label} (${c.count})`,
          })),
        ],
      });
    }
    return defs;
  }, [mapCityOptions, onMapCityFilterChange, onPartnerAccessFilterChange]);

  const toolbarFieldFilters = useMemo(() => {
    const active = [];
    if (partnerAccessFilter && partnerAccessFilter !== 'all') {
      active.push({ id: 'partnerAccess', value: partnerAccessFilter });
    }
    if (mapCityFilter) {
      active.push({ id: 'mapCity', value: mapCityFilter });
    }
    return active;
  }, [mapCityFilter, partnerAccessFilter]);

  const handleApplyToolbarFilter = useCallback(
    (filter) => {
      if (filter.id === 'partnerAccess') {
        onPartnerAccessFilterChange?.(filter.value || 'all');
      }
      if (filter.id === 'mapCity') {
        onMapCityFilterChange?.(filter.value || '');
      }
    },
    [onMapCityFilterChange, onPartnerAccessFilterChange],
  );

  const handleRemoveToolbarFilter = useCallback(
    (id) => {
      if (id === 'partnerAccess') onPartnerAccessFilterChange?.('all');
      if (id === 'mapCity') onMapCityFilterChange?.('');
    },
    [onMapCityFilterChange, onPartnerAccessFilterChange],
  );

  const handleClearToolbarFilters = useCallback(() => {
    onPartnerAccessFilterChange?.('all');
    onMapCityFilterChange?.('');
  }, [onMapCityFilterChange, onPartnerAccessFilterChange]);

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

  const handleSendInviteEmail = async (row, ev) => {
    ev?.stopPropagation?.();
    ev?.preventDefault?.();
    if (!row?.id || inviteEmailBusyId) return;
    if (!row.onboardingInviteEmail) {
      flash.error('Cadastre o e-mail responsável da rede ou importe o e-mail da planilha na unidade.');
      return;
    }
    if (row.onboardingInviteEmailSentToday) {
      flash.error(
        'Já foi enviado um convite hoje para esta academia/rede. Você poderá reenviar amanhã.',
      );
      return;
    }
    if ((row.unitCount ?? 0) < 1) {
      flash.error('Cadastre ao menos uma unidade antes de enviar o convite.');
      return;
    }
    setInviteEmailBusyId(row.id);
    const isTeam = Boolean(row.hasPartnerUser);
    try {
      const res = await sendPartnerOnboardingInviteEmail(row.id);
      const kindLabel = res.inviteKind === 'team' || isTeam ? 'equipe' : 'onboarding';
      flash.success(
        `Convite de ${kindLabel} enviado para ${res.recipientEmail ?? row.onboardingInviteEmail}. Válido até ${new Date(res.expiresAt).toLocaleString('pt-BR')}.`,
        9000,
      );
      onInviteEmailSent?.();
    } catch (err) {
      flash.error(err.message ?? 'Não foi possível enviar o convite por e-mail.');
    } finally {
      setInviteEmailBusyId('');
    }
  };

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
      toolbarLayout="compact"
      filterDefinitions={filterDefinitions}
      fieldFilters={toolbarFieldFilters}
      onApplyFieldFilter={handleApplyToolbarFilter}
      onRemoveFieldFilter={handleRemoveToolbarFilter}
      onClearFieldFilters={handleClearToolbarFilters}
      sortKey={list.sortKey}
      sortDirection={list.sortDirection}
      onSortChange={list.setSort}
      sortOptions={[
        { key: 'name', direction: 'asc', label: 'Nome (A–Z)' },
        { key: 'name', direction: 'desc', label: 'Nome (Z–A)' },
        { key: 'unitCount', direction: 'desc', label: 'Mais unidades' },
        {
          key: 'partnerAccessStatus',
          direction: 'asc',
          label: 'Portal (sem acesso primeiro)',
        },
        {
          key: 'partnerAccessStatus',
          direction: 'desc',
          label: 'Portal (com acesso primeiro)',
        },
      ]}
      page={list.page}
      pageSize={list.pageSize}
      totalItems={list.totalItems}
      totalPages={list.totalPages}
      onPageChange={list.setPage}
      onPageSizeChange={list.onPageSizeChange}
      panelTitle="Parceiros cadastrados"
      emptyMessage={
        mapCityFilter
          ? 'Nenhuma rede com unidade nesta cidade. Limpe o filtro de cidade ou escolha outra no mapa.'
          : 'Nenhuma rede cadastrada. Clique em Adicionar rede para começar.'
      }
      tableFooter={mergeBar}
      tableClassName="networks-partners-table"
      selection={{
        selectedIds,
        onToggleRow: toggleRow,
        onTogglePage: togglePage,
      }}
      columns={[
        {
          key: 'logo',
          label: 'Logo',
          headerHint: NETWORKS_TABLE_COLUMN_HINTS.logo,
          className: 'data-table-col-logo',
          render: (row) => <TableNetworkLogo logoUrl={row.logoUrl} name={row.name} />,
        },
        {
          key: 'name',
          label: 'Rede',
          headerHint: NETWORKS_TABLE_COLUMN_HINTS.name,
          className: 'data-table-cell-wrap data-table-col-network-name',
          render: (row) => <strong className="networks-partners-name">{row.name}</strong>,
        },
        {
          key: 'partnerAccessStatus',
          label: 'Portal parceiro',
          mobileLabel: 'Portal',
          headerAbbr: 'Portal',
          headerHint: NETWORKS_TABLE_COLUMN_HINTS.partnerAccessStatus,
          className: 'data-table-col-network-portal',
          render: (row) => (
            <span
              className={`networks-partners-portal-badge ${partnerAccessStatusBadgeClass(row)}`}
              title={NETWORKS_TABLE_COLUMN_HINTS.partnerAccessStatus}
            >
              {partnerAccessStatusLabel(row)}
            </span>
          ),
        },
        {
          key: 'unitCount',
          label: 'Unidades',
          mobileLabel: 'Unid.',
          headerHint: NETWORKS_TABLE_COLUMN_HINTS.unitCount,
          className: 'data-table-cell-numeric data-table-col-network-units',
          render: (row) => <span className="badge badge-muted">{row.unitCount ?? 0}</span>,
        },
        {
          key: 'primaryMemberCount',
          label: 'Academia principal',
          mobileLabel: 'Acad.',
          headerAbbr: 'Acad. principal',
          headerHint: NETWORKS_TABLE_COLUMN_HINTS.primaryMemberCount,
          className: 'data-table-cell-numeric data-table-col-network-primary',
          render: (row) => (
            <span className="badge badge-muted" title={NETWORKS_TABLE_COLUMN_HINTS.primaryMemberCount}>
              {row.primaryMemberCount ?? 0}
            </span>
          ),
        },
        {
          key: 'partnerUserCount',
          label: 'Usuários vinculados',
          mobileLabel: 'Equipe',
          headerAbbr: 'Usuários',
          headerHint: NETWORKS_TABLE_COLUMN_HINTS.partnerUserCount,
          className: 'data-table-cell-numeric data-table-col-network-users',
          render: (row) => (
            <span
              className={`badge ${row.partnerUserCount ? 'badge-warning' : 'badge-muted'}`}
              title={NETWORKS_TABLE_COLUMN_HINTS.partnerUserCount}
            >
              {row.partnerUserCount ?? 0}
            </span>
          ),
        },
        {
          key: 'onboardingInviteEmail',
          label: 'E-mail convite',
          mobileLabel: 'E-mail',
          headerAbbr: 'E-mail',
          headerHint: 'Destino do convite de onboarding (responsável da rede ou planilha ACAF por unidade).',
          className: 'data-table-col-network-invite-email',
          render: (row) => {
            const email = row.onboardingInviteEmail;
            if (!email) {
              return <span className="muted">—</span>;
            }
            const source =
              row.onboardingInviteEmailSource === 'network' ? 'Responsável rede' : 'Planilha';
            return (
              <span className="networks-invite-email-cell" title={`${source}: ${email}`}>
                <span className="networks-invite-email-value">{email}</span>
                <span className="networks-invite-email-source muted">{source}</span>
              </span>
            );
          },
        },
        {
          key: 'onboardingInviteSend',
          label: 'Enviar convite',
          mobileLabel: 'Convite',
          headerAbbr: 'Enviar',
          headerHint:
            'Onboarding (rede sem acesso) ou convite equipe (rede já configurada). Máx. 1 e-mail/dia por academia/rede.',
          className: 'data-table-col-network-invite-send',
          render: (row) => {
            const busy = inviteEmailBusyId === row.id;
            const noEmail = !row.onboardingInviteEmail;
            const sentToday = Boolean(row.onboardingInviteEmailSentToday);
            const noUnits = (row.unitCount ?? 0) < 1;
            const hasAccess = Boolean(row.hasPartnerUser);
            const disabled = busy || noEmail || sentToday || noUnits;
            let title = hasAccess
              ? 'Enviar convite de equipe por e-mail (novo usuário no portal)'
              : 'Enviar convite de onboarding por e-mail';
            if (noEmail) title = 'Sem e-mail — cadastre na rede ou na planilha';
            else if (sentToday) title = 'Já enviado hoje — tente novamente amanhã';
            else if (noUnits) title = 'Cadastre uma unidade';
            const label = busy ? 'Enviando…' : sentToday ? 'Enviado hoje' : hasAccess ? 'Convite equipe' : 'Enviar';
            return (
              <span className="networks-invite-send-cell">
                <button
                  type="button"
                  className="btn-ghost btn-sm networks-invite-email-btn"
                  disabled={disabled}
                  title={title}
                  onClick={(ev) => void handleSendInviteEmail(row, ev)}
                >
                  {label}
                </button>
              </span>
            );
          },
        },
        {
          key: 'commercialOwnerName',
          label: 'Resp. comercial',
          mobileLabel: 'Comercial',
          headerAbbr: 'Resp. com.',
          headerHint: NETWORKS_TABLE_COLUMN_HINTS.commercialOwnerName,
          className: 'data-table-col-network-commercial data-table-col-network-commercial-desktop',
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
