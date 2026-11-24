/** Token gravado no comentário: @[Nome](uuid) */
const MENTION_PATTERN = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/gi;

export function formatMentionToken(user) {
  const name = String(user?.name ?? '').trim() || 'Usuário';
  const id = user?.id;
  if (!id) return `@${name}`;
  return `@[${name}](${id})`;
}

export function extractMentionedUserIds(body) {
  if (!body) return [];
  const ids = new Set();
  const re = new RegExp(MENTION_PATTERN.source, 'gi');
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m[2]) ids.add(m[2]);
  }
  return [...ids];
}

export function parseCommentBodySegments(body) {
  if (!body) return [];
  const segments = [];
  const re = new RegExp(MENTION_PATTERN.source, 'gi');
  let last = 0;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) {
      segments.push({ type: 'text', value: body.slice(last, m.index) });
    }
    segments.push({ type: 'mention', label: m[1], userId: m[2] });
    last = m.index + m[0].length;
  }
  if (last < body.length) {
    segments.push({ type: 'text', value: body.slice(last) });
  }
  return segments.length ? segments : [{ type: 'text', value: body }];
}

export function findActiveMention(body, cursor) {
  const before = body.slice(0, cursor);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  const chunk = before.slice(at + 1);
  if (chunk.includes('\n')) return null;
  if (chunk.startsWith('[') || chunk.includes('](')) return null;
  if (/@/.test(chunk)) return null;
  return { start: at, query: chunk };
}