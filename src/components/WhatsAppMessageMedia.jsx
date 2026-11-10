import { useEffect, useState } from 'react';
import { fetchWhatsAppMessageMediaBlob } from '../api/evolution.js';
import { AppLoadingPanel } from './crud/AppLoading.jsx';

export function WhatsAppMessageMedia({ messageId, mediaKind, alt = 'Mídia WhatsApp' }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl = '';
    let cancelled = false;
    setLoading(true);
    setError('');
    setSrc('');

    void fetchWhatsAppMessageMediaBlob(messageId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Não foi possível carregar a mídia.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [messageId, mediaKind]);

  if (loading) {
    return <AppLoadingPanel label="Carregando mídia…" />;
  }

  if (error) {
    return <p className="whatsapp-inbox-media-error muted">{error}</p>;
  }

  if (mediaKind === 'image' || mediaKind === 'sticker') {
    return (
      <a className="whatsapp-inbox-media-link" href={src} target="_blank" rel="noreferrer">
        <img className="whatsapp-inbox-media" src={src} alt={alt} loading="lazy" />
      </a>
    );
  }

  if (mediaKind === 'video') {
    return <video className="whatsapp-inbox-media" src={src} controls preload="metadata" />;
  }

  if (mediaKind === 'audio') {
    return <audio className="whatsapp-inbox-media-audio" src={src} controls preload="metadata" />;
  }

  return (
    <a className="btn-ghost btn-sm" href={src} download>
      Baixar arquivo
    </a>
  );
}
