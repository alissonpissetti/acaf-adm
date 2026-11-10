/** Força o navegador a buscar a imagem de novo quando o URL público não muda (ex.: mesmo arquivo no Nextcloud). */
export function withAvatarCacheBust(url, version) {
  if (!url) return null;
  if (!version) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('v', String(version));
    return parsed.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${encodeURIComponent(String(version))}`;
  }
}
