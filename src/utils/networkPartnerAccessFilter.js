/** @typedef {'all' | 'with_access' | 'without_access' | 'invite_pending'} NetworkPartnerAccessFilter */

export const PARTNER_ACCESS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'with_access', label: 'Com acesso parceiro' },
  { value: 'without_access', label: 'Sem acesso' },
  { value: 'invite_pending', label: 'Convite pendente' },
];

/**
 * @param {NetworkPartnerAccessFilter} filter
 * @param {{
 *   hasPartnerUser?: boolean;
 *   invitePending?: boolean;
 *   partnerUserCount?: number;
 * } | null | undefined} network
 */
export function networkMatchesPartnerAccessFilter(filter, network) {
  if (!network || filter === 'all') return true;

  const hasPartnerUser = networkHasPartnerUser(network);
  const invitePending = Boolean(network.invitePending);

  switch (filter) {
    case 'with_access':
      return hasPartnerUser;
    case 'without_access':
      return !hasPartnerUser && !invitePending;
    case 'invite_pending':
      return invitePending && !hasPartnerUser;
    default:
      return true;
  }
}

/**
 * @param {import('../utils/networkPartnerAccessFilter.js').NetworkPartnerAccessFilter} filter
 * @param {Array<{ hasPartnerUser?: boolean; invitePending?: boolean; partnerUserCount?: number }>} networks
 */
export function filterNetworksByPartnerAccess(filter, networks) {
  if (filter === 'all') return networks;
  return networks.filter((n) => networkMatchesPartnerAccessFilter(filter, n));
}

/**
 * @param {{
 *   hasPartnerUser?: boolean;
 *   invitePending?: boolean;
 *   partnerUserCount?: number;
 * } | null | undefined} network
 */
function networkHasPartnerUser(network) {
  return Boolean(network?.hasPartnerUser ?? (Number(network?.partnerUserCount) > 0));
}

export function partnerAccessStatusLabel(network) {
  if (!network) return '—';
  if (networkHasPartnerUser(network)) return 'Com acesso';
  if (network.invitePending) return 'Convite pendente';
  return 'Sem acesso';
}

/** Ordem de situação do portal: sem acesso → convite pendente → com acesso. */
export function partnerAccessStatusSortRank(network) {
  if (!network) return -1;
  if (networkHasPartnerUser(network)) return 2;
  if (network.invitePending) return 1;
  return 0;
}

/**
 * @param {{
 *   hasPartnerUser?: boolean;
 *   invitePending?: boolean;
 *   partnerUserCount?: number;
 * } | null | undefined} network
 */
export function partnerAccessStatusBadgeClass(network) {
  const label = partnerAccessStatusLabel(network);
  if (label === 'Com acesso') return 'badge badge-success';
  if (label === 'Convite pendente') return 'badge badge-warning';
  return 'badge badge-muted';
}
