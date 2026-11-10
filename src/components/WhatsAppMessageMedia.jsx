import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { fetchWhatsAppMessageMediaBlob } from '../api/evolution.js';

function MediaLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="whatsapp-media-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Visualização ampliada"
      onClick={onClose}
    >
      <button
        type="button"
        className="whatsapp-media-lightbox__close"
        aria-label="Fechar"
        onClick={onClose}
      >
        <X size={22} aria-hidden="true" />
      </button>
      <img
        className="whatsapp-media-lightbox__img"
        src={src}
        alt={alt}
        onClick={(ev) => ev.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

export function WhatsAppMessageMedia({ messageId, mediaKind, alt = 'Mídia WhatsApp' }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    let objectUrl = '';
    let cancelled = false;
    setLoading(true);
    setError('');
    setSrc('');
    setLightboxOpen(false);

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
    return (
      <div
        className={`whatsapp-inbox-media-placeholder${
          mediaKind === 'sticker' ? ' whatsapp-inbox-media-placeholder--sticker' : ''
        }`}
        aria-busy="true"
        aria-label="Carregando mídia"
      />
    );
  }

  if (error) {
    return <p className="whatsapp-inbox-media-error muted">{error}</p>;
  }

  if (mediaKind === 'image' || mediaKind === 'sticker') {
    const isSticker = mediaKind === 'sticker';
    return (
      <>
        <button
          type="button"
          className="whatsapp-inbox-media-button"
          aria-label={isSticker ? 'Ampliar figurinha' : 'Ampliar imagem'}
          onClick={() => setLightboxOpen(true)}
        >
          <img
            className={`whatsapp-inbox-media${isSticker ? ' whatsapp-inbox-media--sticker' : ''}`}
            src={src}
            alt={alt}
            loading="lazy"
          />
        </button>
        {lightboxOpen ? <MediaLightbox src={src} alt={alt} onClose={closeLightbox} /> : null}
      </>
    );
  }

  if (mediaKind === 'video') {
    return <video className="whatsapp-inbox-media whatsapp-inbox-media--video" src={src} controls preload="metadata" />;
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
