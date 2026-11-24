import { apiUrl } from '../config.js';

import { isArteVideo } from './socialPostRules.js';

/** URL pública da arte (storage remoto) ou fallback via API. */
export function arteImageSrc(arte) {
  const remote = arte?.urlPublica?.trim();
  if (remote && !remote.includes('/api/social-posts/media/')) return remote;
  const id = arte?.id?.trim();
  if (!id) return null;
  return apiUrl(`/api/social-posts/media/${id}`);
}

export { isArteVideo };

export function arteDownloadFilename(arte, postCodigo) {
  const base = (arte?.nome?.trim() || `${postCodigo || 'movly'}_${(arte?.ordem ?? 0) + 1}`).replace(
    /[^\w.\-() ]+/g,
    '_',
  );
  if (/\.(png|jpe?g|webp|gif|mp4|mov|m4v)$/i.test(base)) return base;
  if (isArteVideo(arte)) return `${base}.mp4`;
  return `${base}.png`;
}

/** Baixa a arte localmente (útil no celular para post manual no Meta). */
export async function downloadArteImage(src, filename) {
  const name = filename || 'arte-movly.png';
  try {
    const useAuth = src.includes('/api/social-posts/media/');
    const res = await fetch(src, useAuth ? { credentials: 'include' } : { mode: 'cors' });
    if (!res.ok) throw new Error('Falha ao baixar');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    window.open(src, '_blank', 'noopener,noreferrer');
    return false;
  }
}