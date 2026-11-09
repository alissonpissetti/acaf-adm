import { useEffect, useState } from 'react';

/** Miniatura na listagem: se a URL quebrar, mostra inicial como sem logo. */
export function TableNetworkLogo({ logoUrl, name }) {
  const [failed, setFailed] = useState(false);
  const initial = (name ?? '?').trim().slice(0, 1).toUpperCase();

  useEffect(() => {
    setFailed(false);
  }, [logoUrl, name]);

  const showImg = Boolean(logoUrl?.trim()) && !failed;

  return (
    <div className="table-logo">
      {showImg ? (
        <img
          src={logoUrl}
          alt=""
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="table-logo-fallback" title={failed ? 'Logo indisponível' : undefined}>
          {initial}
        </span>
      )}
    </div>
  );
}
