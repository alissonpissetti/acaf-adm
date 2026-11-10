import { useEffect } from 'react';
import { ACAF_ASSOCIATION_URL } from '../navigation/routeUtils.js';

/** Mantido para bookmarks antigos em /m/associacao/parceiros. */
export function AcafAssociationRedirect() {
  useEffect(() => {
    window.location.replace(ACAF_ASSOCIATION_URL);
  }, []);

  return (
    <div className="page-stack" style={{ padding: 24 }}>
      <p>Abrindo o painel de parceiros associados…</p>
    </div>
  );
}
