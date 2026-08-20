import { Navigate, useLocation } from 'react-router-dom';

const LEGACY_ROUTES = {
  '/': '/m/operacao/dashboard',
  '/networks': '/m/operacao/redes',
  '/modalities': '/m/operacao/modalidades',
  '/connect': '/m/operacao/planos',
  '/users': '/m/operacao/usuarios',
  '/companies': '/m/corporativo/empresas',
  '/units': '/m/operacao/redes',
};

export function LegacyRedirect() {
  const location = useLocation();
  const target = LEGACY_ROUTES[location.pathname];
  if (!target) return <Navigate to="/m/operacao/dashboard" replace />;
  return <Navigate to={`${target}${location.search}`} replace />;
}
