import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, RotateCcw } from 'lucide-react';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { useCrudList } from '../crud/useCrudList.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';
import { TableNetworkLogo } from '../components/TableNetworkLogo.jsx';
import { mergeNetworks, sendPartnerOnboardingInviteEmail } from '../api/admin.js';
import { appChoose, appConfirm } from '../components/confirm/appConfirm.js';
import { useFlashMessage } from '../components/flash/FlashMessageProvider.jsx';
import { selectFilter } from '../crud/filterUtils.js';
import { confirmCrudDelete } from '../crud/crudUtils.js';
import {
  PARTNER_ACCESS_FILTER_OPTIONS,
  partnerAccessStatusBadgeClass,
  partnerAccessStatusLabel,
  partnerAccessStatusSortRank,
} from '../utils/networkPartnerAccessFilter.js';
import { networkMatchesNameOrCnpj } from '../utils/networkCnpjSearch.js';
import { DenseListRowIdentity } from '../components/crud/DenseListRowIdentity.jsx';
import { NetworkPartnerRowMenu } from '../components/networks/NetworkPartnerRowMenu.jsx';

/**
 * Cabeçalhos da tabela de parceiros (`headerHint` → atributo title / abbr na coluna).
 * | key | label (mobile data-label) | headerAbbr | headerHint |
 * | logo | Logo | — | Logotipo da rede parceira. |
 * | name | Rede | — | Nome cadastral da rede de academias. |
 * | networkScale | Resumo | Resumo | Unidades, alunos (academia principal) e equipe do portal. |
 * | partnerAccessStatus | Portal parceiro | Portal | Situação do acesso ao portal do parceiro (onboarding). |
 * | onboardingInviteEmail | E-mail convite | E-mail | Destino do convite de onboarding. |
 * | (ações) | Enviar convite | — | Na coluna de ações, dispara onboarding ou convite de equipe. |
 * | commercialOwnerName | Resp. comercial | Resp. com. | Responsável comercial interno (ACAF) pela conta. |
 */
const NETWORKS_TABLE_COLUMN_HINTS = {
  logo: 'Logotipo da rede parceira exibido na listagem.',
  name: 'Nome cadastral da rede de academias parceira.',
  networkScale:
    'Unidades cadastradas, alunos do app com academia principal nesta rede e usuários da equipe no portal.',
  partnerAccessStatus:
    'Situação do acesso ao portal do parceiro: com acesso, convite pendente ou sem acesso.',
  commercialOwnerName: 'Responsável comercial interno (ACAF) associado a esta rede.',
};

const NETWORK_SCALE_HINTS = {
  units: 'Unidades (filiais) cadastradas nesta rede.',
  primary: 'Alunos do app com academia principal em uma unidade desta rede.',
  team: 'Usuários da equipe com acesso ao portal do parceiro.',
};

function NetworkScaleSummary({ row }) {
  const units = row.unitCount ?? 0;
  const primary = row.primaryMemberCount ?? 0;
  const team = row.partnerUserCount ?? 0;
  const teamBadgeClass = team ? 'badge-warning' : 'badge-muted';
  return (
    <div className="networks-scale-summary" role="group" aria-label="Resumo operacional da rede">
      <div className="networks-scale-chip" title={NETWORK_SCALE_HINTS.units}>
        <span className="networks-scale-chip__label">Unid.</span>
        <span className="badge badge-muted">{units}</span>
      </div>
      <div className="networks-scale-chip" title={NETWORK_SCALE_HINTS.primary}>
        <span className="networks-scale-chip__label">Principal</span>
        <span className="badge badge-muted">{primary}</span>
      </div>
      <div className="networks-scale-chip" title={NETWORK_SCALE_HINTS.team}>
        <span className="networks-scale-chip__label">Equipe</span>
        <span className={`badge ${teamBadgeClass}`}>{team}</span>
      </div>
    </div>
  );
}

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
  searchQuery: controlledSearchQuery,
  onSearchQueryChange: controlledOnSearchQueryChange,
  /** Lista embutida em `NetworksPage` (sem segundo cabeçalho de página). */
  embedded = false,
}) {
  const flash = useFlashMessage();
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [mergeBusy, setMergeBusy] = useState(false);
  const [inviteEmailBusyId, setInviteEmailBusyId] = useState('');
  const [openRowMenuId, setOpenRowMenuId] = useState(null);

  const getSortValue = useCallback((row, key) => {
    if (key === 'partnerAccessStatus') return partnerAccessStatusSortRank(row);
    return row[key];
  }, []);

  const list = useCrudList(networks, {
    searchKeys: ['name'],
    defaultSort: { key: 'name', direction: 'asc' },
    storageKey: LIST_PREFERENCE_KEYS.networks,
    getSortValue,
    matchesSearch: networkMatchesNameOrCnpj,
  });

  useEffect(() => {
    if (controlledSearchQuery === undefined) return;
    if (list.query !== controlledSearchQuery) {
      list.onQueryChange(controlledSearchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sincroniza busca controlada pelo pai (mapa / lista+mapa)
  }, [controlledSearchQuery]);

  const effectiveQuery =
    controlledSearchQuery !== undefined ? controlledSearchQuery : list.query;
  const effectiveOnQueryChange = controlledOnSearchQueryChange ?? list.onQueryChange;

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

  const inviteActionMeta = useCallback((row) => {
    const busy = inviteEmailBusyId === row.id;
    const noEmail = !row.onboardingInviteEmail;
    const sentToday = Boolean(row.onboardingInviteEmailSentToday);
    const noUnits = (row.unitCount ?? 0) < 1;
    const hasAccess = Boolean(row.hasPartnerUser);
    const disabled = busy || noEmail || noUnits;
    const label = busy
      ? 'Enviando convite…'
      : sentToday
        ? 'Reenviar convite'
        : hasAccess
          ? 'Convite de equipe'
          : 'Enviar convite';
    return { disabled, label, busy };
  }, [inviteEmailBusyId]);

  const renderInviteAction = (row) => {
    const { disabled, label, busy } = inviteActionMeta(row);
    const noEmail = !row.onboardingInviteEmail;
    const sentToday = Boolean(row.onboardingInviteEmailSentToday);
    const noUnits = (row.unitCount ?? 0) < 1;
    const hasAccess = Boolean(row.hasPartnerUser);
    let title = hasAccess
      ? 'Enviar convite de equipe por e-mail (novo usuário no portal)'
      : 'Enviar e-mail de boas-vindas (onboarding)';
    if (noEmail) title = 'Sem e-mail — cadastre na rede ou na planilha';
    else if (sentToday) title = 'Já enviado hoje — clique para reenviar (com confirmação)';
    else if (noUnits) title = 'Cadastre uma unidade';
    const shortLabel = busy
      ? '…'
      : sentToday
        ? 'Reenviar'
        : hasAccess
          ? 'Equipe'
          : 'Convite';
    return (
      <button
        type="button"
        className="crud-icon-btn networks-invite-icon-btn"
        disabled={disabled}
        title={title}
        aria-label={title}
        onClick={(ev) => void handleSendInviteEmail(row, ev)}
      >
        <span className="crud-action-label">{shortLabel}</span>
        {busy ? (
          '…'
        ) : sentToday ? (
          <RotateCcw size={15} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Mail size={15} strokeWidth={2} aria-hidden="true" />
        )}
      </button>
    );
  };

  const handleSendInviteEmail = async (row, ev) => {
    ev?.stopPropagation?.();
    ev?.preventDefault?.();
    if (!row?.id || inviteEmailBusyId) return;
    if (!row.onboardingInviteEmail) {
      flash.error('Cadastre o e-mail responsável da rede ou importe o e-mail da planilha na unidade.');
      return;
    }
    let forceResend = false;
    if (row.onboardingInviteEmailSentToday) {
      const isTeam = Boolean(row.hasPartnerUser);
      const ok = await appConfirm({
        title: isTeam ? 'Reenviar convite de equipe hoje?' : 'Reenviar e-mail de boas-vindas?',
        message:
          'Já houve um envio hoje para esta academia/rede. Reenviar pode gerar outro e-mail na caixa do destinatário. Deseja continuar?',
        confirmLabel: 'Reenviar',
      });
      if (!ok) return;
      forceResend = true;
    }
    if ((row.unitCount ?? 0) < 1) {
      flash.error('Cadastre ao menos uma unidade antes de enviar o convite.');
      return;
    }
    setInviteEmailBusyId(row.id);
    const isTeam = Boolean(row.hasPartnerUser);
    try {
      const res = await sendPartnerOnboardingInviteEmail(row.id, { forceResend });
      const kindLabel =
        res.inviteKind === 'team' || isTeam ? 'Convite de equipe' : 'E-mail de boas-vindas';
      const verb = forceResend ? 'Reenviado' : 'Enviado';
      const at = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const targets =
        Array.isArray(res.recipientEmails) && res.recipientEmails.length > 0
          ? res.recipientEmails.join(' / ')
          : res.recipientEmail ?? row.onboardingInviteEmail;
      flash.success(
        `${verb} às ${at}: ${kindLabel} para ${targets}. Válido até ${new Date(res.expiresAt).toLocaleString('pt-BR')}.`,
        12000,
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
    <>
      {embedded ? (
        <div className="panel-header panel-header--meta-only networks-partners-panel-header">
          <h2>Parceiros cadastrados</h2>
          <span className="panel-meta">{list.totalItems} registro(s)</span>
        </div>
      ) : null}
      <CrudListShell
      embedded={embedded}
      title={embedded ? undefined : 'Parceiros'}
      subtitle={embedded ? undefined : 'Gerencie redes de academias parceiras da plataforma.'}
      addLabel="Adicionar rede"
      onAdd={embedded ? undefined : onAdd}
      showPanelHeading={!embedded}
      loading={loading}
      error={error}
      query={effectiveQuery}
      onQueryChange={effectiveOnQueryChange}
      searchPlaceholder="Buscar por rede, contato, e-mail, academia (razão social) ou CNPJ"
      toolbarLayout="compact"
      toolbarWrapClassName="crud-list-toolbar networks-partners-toolbar"
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
      tableClassName="dense-list-table networks-partners-table"
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
          render: (row) => {
            const email = row.onboardingInviteEmail;
            return (
              <DenseListRowIdentity
                title={row.name}
                badge={partnerAccessStatusLabel(row)}
                badgeClassName={partnerAccessStatusBadgeClass(row)}
                meta={email || 'Sem e-mail de convite'}
                metaClassName={email ? '' : 'muted'}
              />
            );
          },
        },
        {
          key: 'partnerAccessStatus',
          label: 'Portal parceiro',
          mobileLabel: 'Portal',
          headerAbbr: 'Portal',
          headerHint: NETWORKS_TABLE_COLUMN_HINTS.partnerAccessStatus,
          className: 'data-table-col-network-portal networks-partners-desktop-only',
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
          key: 'networkScale',
          label: 'Resumo',
          mobileLabel: 'Resumo',
          headerAbbr: 'Resumo',
          headerHint: NETWORKS_TABLE_COLUMN_HINTS.networkScale,
          className: 'data-table-col-network-scale networks-partners-desktop-only',
          render: (row) => <NetworkScaleSummary row={row} />,
        },
        {
          key: 'onboardingInviteEmail',
          label: 'E-mail convite',
          mobileLabel: 'E-mail',
          headerAbbr: 'E-mail',
          headerHint: 'Destino do convite de onboarding (responsável da rede ou planilha ACAF por unidade).',
          className: 'data-table-col-network-invite-email networks-partners-desktop-only',
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
          key: 'commercialOwnerName',
          label: 'Resp. comercial',
          mobileLabel: 'Comercial',
          headerAbbr: 'Resp. com.',
          headerHint: NETWORKS_TABLE_COLUMN_HINTS.commercialOwnerName,
          className: 'data-table-col-network-commercial data-table-col-network-commercial-desktop',
          render: (row) => row.commercialOwnerName ?? '—',
        },
        {
          key: 'rowMenu',
          label: '',
          className: 'data-table-col-network-row-menu networks-partners-mobile-only',
          render: (row) => {
            const invite = inviteActionMeta(row);
            return (
              <NetworkPartnerRowMenu
                row={row}
                isOpen={openRowMenuId === row.id}
                onToggle={() => setOpenRowMenuId((prev) => (prev === row.id ? null : row.id))}
                onClose={() => setOpenRowMenuId(null)}
                onView={onView ? () => onView(row.id) : undefined}
                onEdit={onEdit ? () => onEdit(row.id) : undefined}
                onDelete={
                  onDelete
                    ? async () => {
                        if (await confirmCrudDelete(row.name)) onDelete(row);
                      }
                    : undefined
                }
                onInvite={() => {
                  void handleSendInviteEmail(row, null);
                }}
                inviteLabel={invite.label}
                inviteDisabled={invite.disabled}
              />
            );
          },
        },
      ]}
      rows={list.rows}
      onRowClick={onEdit ? (row) => onEdit(row.id) : onView ? (row) => onView(row.id) : undefined}
      onView={onView ? (row) => onView(row.id) : undefined}
      onEdit={onEdit ? (row) => onEdit(row.id) : undefined}
      onDelete={onDelete}
      renderActionsExtra={renderInviteAction}
    />
    </>
  );
}
