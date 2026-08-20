import { Navigate, useParams } from 'react-router-dom';

/** Redireciona rotas antigas /networks/:id para o padrão em /networks?id= */
export function NetworkDetailRedirect() {
  const { networkId } = useParams();
  return <Navigate to={`/m/operacao/redes?id=${encodeURIComponent(networkId)}`} replace />;
}
