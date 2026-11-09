import { useEffect } from 'react';

/**
 * Rota espelho no admin: o menu "Parceiros associados" aponta aqui e redireciona para o painel ACAF (Vite separado).
 * Configure VITE_ACAF_ASSOCIATION_URL em produção (ex.: https://associados.seudominio.com).
 */
export function AcafAssociationRedirect() {
  useEffect(() => {
    const base = import.meta.env.VITE_ACAF_ASSOCIATION_URL?.replace(/\/$/, '') || 'http://127.0.0.1:5178';
    window.location.href = `${base}/`;
  }, []);

  return (
    <div className="page-stack" style={{ padding: 24 }}>
      <p>Abrindo o painel de parceiros associados…</p>
      <p className="muted">Se nada acontecer, inicie o app com{' '}<code>npm run dev</code> na pasta <code>acaf-association</code>.</p>
    </div>
  );
}
