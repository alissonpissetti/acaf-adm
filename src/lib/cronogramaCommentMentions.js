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

const COMPLETE_MENTION_BEFORE_CURSOR = /@\[[^\]]+\]\([^)]+\)\s*$/;

export function findActiveMention(body, cursor) {
  const before = body.slice(0, cursor);
  if (COMPLETE_MENTION_BEFORE_CURSOR.test(before)) return null;

  const at = before.lastIndexOf('@');
  if (at < 0) return null;

  const fromAt = before.slice(at);
  if (/^@\[[^\]]+\]\([0-9a-f-]{36}\)/i.test(fromAt)) return null;

  const chunk = before.slice(at + 1);
  if (chunk.includes('\n')) return null;
  if (chunk.startsWith('[') || chunk.includes('](')) return null;
  if (/@/.test(chunk)) return null;
  return { start: at, query: chunk };
}

/** Texto amigável para pré-visualização do rascunho (menções → @Nome). */
export function commentBodyPreviewText(body) {
  return parseCommentBodySegments(body)
    .map((seg) => (seg.type === 'mention' ? `@${mentionDisplayLabel(seg.label)}` : seg.value))
    .join('');
}

/** Exibição no feed: só o nome (sem uuid). */
export function mentionDisplayLabel(label) {
  return String(label ?? '').trim() || 'Usuário';
}

/**
 * Converte `@Nome` digitado/escolhido no composer em tokens `@[Nome](id)` para gravar.
 * Trechos que já são token permanecem intactos.
 */
export function serializeCommentBodyForSave(body, users) {
  if (!body) return '';
  const parts = [];
  const re = new RegExp(MENTION_PATTERN.source, 'gi');
  let last = 0;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: body.slice(last, m.index) });
    parts.push({ type: 'token', value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push({ type: 'text', value: body.slice(last) });
  if (!parts.length) parts.push({ type: 'text', value: body });

  const sorted = [...(users ?? [])]
    .filter((u) => u?.id && String(u.name ?? '').trim())
    .sort((a, b) => String(b.name).length - String(a.name).length);

  const serializeText = (text) => {
    let out = text;
    for (const user of sorted) {
      const name = String(user.name).trim();
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRe = new RegExp(`@${escaped}(?=\\s|$|[.,!?;:])`, 'gi');
      out = out.replace(nameRe, formatMentionToken(user));
    }
    return out;
  };

  return parts.map((p) => (p.type === 'token' ? p.value : serializeText(p.value))).join('');
}