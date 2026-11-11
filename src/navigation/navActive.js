import { isExternalRoute } from './routeUtils.js';

export function isCommercialLeadsBoardPath(pathname) {
  return pathname === '/m/comercial/leads' || pathname.startsWith('/m/comercial/leads/');
}

export function hasFunnelBoardContext(search) {
  return Boolean(new URLSearchParams(String(search ?? '')).get('funnelId')?.trim());
}

function matchesRouteQuery(route, location) {
  const [, routeSearch = ''] = String(route ?? '').split('?');
  if (!routeSearch) {
    return !new URLSearchParams(location.search).get('queue');
  }
  const expected = new URLSearchParams(routeSearch);
  const current = new URLSearchParams(location.search);
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

/** Item «Funis» continua ativo ao abrir o kanban via ?funnelId= (rota /m/comercial/leads). */
export function isNavigationItemActive(item, location) {
  if (!item || isExternalRoute(item.route)) return false;

  const routePath = String(item.route ?? '').split('?')[0];
  const onLeadsBoard = isCommercialLeadsBoardPath(location.pathname);
  const funnelContext = hasFunnelBoardContext(location.search);

  if (item.slug === 'funis' && onLeadsBoard && funnelContext) {
    return true;
  }

  if (routePath === '/m/comercial/leads' && onLeadsBoard && funnelContext) {
    return false;
  }

  if (location.pathname !== routePath && !location.pathname.startsWith(`${routePath}/`)) {
    return false;
  }

  return matchesRouteQuery(item.route, location);
}
