import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink } from 'lucide-react';
import {
  SOCIAL_DISTRIBUTION_HINTS,
  buildMarketingClickPath,
  buildMarketingClickUrl,
  buildMarketingFormPath,
  buildMarketingFormUrl,
  copyMarketingLink,
} from '../utils/marketingShare.js';

export function MarketingSharePanel({
  slug,
  utm,
  sharePath,
  shareUrl,
  funnelName,
  leadTypeLabel,
  title = 'Distribuição nas redes',
}) {
  const [copied, setCopied] = useState('');

  if (!slug && !sharePath) return null;

  const path = sharePath || buildMarketingFormPath(slug, utm);
  const clickPath = buildMarketingClickPath(slug, utm);
  const absoluteUrl = shareUrl || buildMarketingClickUrl(slug, utm);
  const previewPath = buildMarketingFormPath(slug, utm);

  const onCopy = async (value, key) => {
    const ok = await copyMarketingLink(value);
    if (ok) {
      setCopied(key);
      window.setTimeout(() => setCopied(''), 2000);
    }
  };

  return (
    <section className="form-section marketing-share-panel">
      <header className="marketing-share-head">
        <div>
          <h3 className="form-section-title">{title}</h3>
          <p className="marketing-share-subtitle">
            Use este link nos criativos das redes sociais. Cada envio gera lead no funil
            {funnelName ? ` “${funnelName}”` : ''}
            {leadTypeLabel ? ` (${leadTypeLabel})` : ''}.
          </p>
        </div>
      </header>

      <div className="marketing-share-links">
        <label className="marketing-share-field">
          <span>Link rastreado (recomendado)</span>
          <div className="marketing-share-input-row">
            <input readOnly value={absoluteUrl} />
            <button type="button" className="btn-ghost btn-sm" onClick={() => onCopy(absoluteUrl, 'url')}>
              <Copy size={14} aria-hidden="true" />
              {copied === 'url' ? 'Copiado' : 'Copiar'}
            </button>
            <Link to={previewPath} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
              <ExternalLink size={14} aria-hidden="true" />
              Abrir
            </Link>
          </div>
        </label>

        <label className="marketing-share-field">
          <span>Caminho relativo (com clique rastreado)</span>
          <div className="marketing-share-input-row">
            <input readOnly value={clickPath} />
            <button type="button" className="btn-ghost btn-sm" onClick={() => onCopy(clickPath, 'click-path')}>
              <Copy size={14} aria-hidden="true" />
              {copied === 'click-path' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </label>

        <label className="marketing-share-field">
          <span>Caminho da página pública</span>
          <div className="marketing-share-input-row">
            <input readOnly value={path} />
            <button type="button" className="btn-ghost btn-sm" onClick={() => onCopy(path, 'path')}>
              <Copy size={14} aria-hidden="true" />
              {copied === 'path' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </label>
      </div>

      <div className="marketing-share-hints">
        {SOCIAL_DISTRIBUTION_HINTS.map((item) => (
          <article key={item.id} className="marketing-share-hint">
            <strong>{item.label}</strong>
            <p>{item.hint}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
