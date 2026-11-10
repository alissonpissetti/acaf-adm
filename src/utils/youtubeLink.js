const YOUTUBE_URL_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:[^ \n]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/gi;

export function extractYouTubeLinks(text) {
  const source = String(text ?? '');
  if (!source.trim()) return [];

  const seen = new Set();
  const items = [];

  for (const match of source.matchAll(YOUTUBE_URL_PATTERN)) {
    const videoId = match[1];
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    const raw = match[0].startsWith('http') ? match[0] : `https://${match[0]}`;
    items.push({
      videoId,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      inputUrl: raw.split(/[\s)\]}>]/)[0] ?? raw,
    });
  }

  return items;
}
