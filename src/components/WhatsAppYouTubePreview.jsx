import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { fetchYouTubeLinkPreview } from '../api/evolution.js';

const previewCache = new Map();

export function WhatsAppYouTubePreview({ videoId, watchUrl, inputUrl }) {
  const cacheKey = videoId || inputUrl;
  const [preview, setPreview] = useState(() => previewCache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(!previewCache.has(cacheKey));

  useEffect(() => {
    if (!cacheKey) return undefined;
    const cached = previewCache.get(cacheKey);
    if (cached) {
      setPreview(cached);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    void fetchYouTubeLinkPreview(inputUrl || watchUrl)
      .then((data) => {
        if (cancelled) return;
        const next = {
          title: data?.title?.trim() || 'Vídeo no YouTube',
          thumbnailUrl:
            data?.thumbnailUrl?.trim() ||
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          watchUrl: data?.watchUrl || watchUrl,
        };
        previewCache.set(cacheKey, next);
        setPreview(next);
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = {
          title: 'Vídeo no YouTube',
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          watchUrl,
        };
        previewCache.set(cacheKey, fallback);
        setPreview(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, inputUrl, videoId, watchUrl]);

  if (!videoId) return null;

  const href = preview?.watchUrl || watchUrl;
  const title = preview?.title || 'Vídeo no YouTube';
  const thumb = preview?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <a
      className={`whatsapp-yt-preview${loading ? ' is-loading' : ''}`}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
    >
      <span className="whatsapp-yt-preview__media">
        <img src={thumb} alt="" loading="lazy" className="whatsapp-yt-preview__thumb" />
        <span className="whatsapp-yt-preview__play" aria-hidden="true">
          <Play size={28} fill="currentColor" />
        </span>
      </span>
      <span className="whatsapp-yt-preview__body">
        <span className="whatsapp-yt-preview__title">{title}</span>
        <span className="whatsapp-yt-preview__domain">youtube.com</span>
      </span>
    </a>
  );
}
