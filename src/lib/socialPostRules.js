export const FILTER_CHIPS = [
  { id: 'all', label: 'Todos', labelCompact: 'Todos' },
  { id: 'pending', label: 'Aguardando aprovação', labelCompact: 'Aguardando' },
  { id: 'adjust', label: 'Ajustar', labelCompact: 'Ajustar' },
  { id: 'approved', label: 'Aprovados', labelCompact: 'Aprovados' },
  { id: 'scheduled', label: 'Programados', labelCompact: 'Programados' },
  { id: 'published', label: 'Publicados', labelCompact: 'Publicados' },
  { id: 'buffer_auto', label: 'Sem interação · Buffer', labelCompact: 'Só Buffer' },
  { id: 'buffer_manual', label: 'Com interação · app', labelCompact: 'App / manual' },
  { id: 'reels', label: 'Reels', labelCompact: 'Reels' },
];

export function isArteVideo(arte) {
  const hint = `${arte?.nome ?? ''} ${arte?.arquivo ?? ''}`.toLowerCase();
  return /\.(mp4|mov|m4v|webm)(\?|$|")/i.test(hint);
}

export function buildCaption(legenda, hashtags) {
  const parts = [legenda?.trim(), hashtags?.trim()].filter(Boolean);
  return parts.join('\n\n');
}

export function truncate(text, max) {
  if (!text) return '';
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}… mais`;
}

/** Tipo de conteúdo (stories, carrossel, reels…) para o cabeçalho do card. */
export function postKindLabel(post) {
  const fmt = String(post?.formato ?? '').trim();
  const arteCount = post?.artes?.length ?? 0;
  const telaCount = Array.isArray(post?.telas) ? post.telas.filter(Boolean).length : 0;
  const slides = Math.max(arteCount, telaCount, 0);

  if (fmt) {
    if (/^estátic|^estatic/i.test(fmt)) return 'Post no feed';
    if (/carrossel/i.test(fmt) && post.envio === 'feed') {
      return fmt.replace(/^carrossel/i, 'Carrossel de feed');
    }
    if (/reels/i.test(fmt)) return fmt;
    const storyMatch = fmt.match(/(\d+)\s*stories?/i);
    if (storyMatch) {
      const n = Number(storyMatch[1]) || slides;
      if (n <= 1) return fmt.toLowerCase().includes('link') ? 'Story · link' : 'Story';
      return `Carrossel de stories · ${n} telas`;
    }
    if (/^1\s*story/i.test(fmt)) {
      return fmt.toLowerCase().includes('link') ? 'Story · link' : 'Story';
    }
    if (/story/i.test(fmt)) return fmt;
    return fmt;
  }

  if (post.envio === 'reels') return 'Reels';
  if (post.envio === 'stories') {
    if (slides > 1) return `Carrossel de stories · ${slides} telas`;
    return 'Story';
  }
  if (post.envio === 'feed') {
    if (slides > 1) return `Carrossel de feed · ${slides} telas`;
    return 'Post no feed';
  }
  return post.envio ?? '—';
}

export function allowedRedes(envio) {
  if (envio === 'feed') return ['instagram', 'facebook', 'linkedin'];
  if (envio === 'stories') return ['instagram', 'facebook'];
  return ['instagram'];
}

export const REDE_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

export const BUFFER_STATUS_LABELS = {
  draft: 'Rascunho',
  scheduled: 'Programado',
  sending: 'Enviando',
  sent: 'Publicado',
  error: 'Erro',
};

export function bufferLinksByRede(links) {
  const map = { instagram: [], facebook: [], linkedin: [] };
  for (const l of links ?? []) {
    if (map[l.rede]) map[l.rede].push(l);
  }
  return map;
}

/** Links usados para exibir status do canal (manual substitui Buffer). */
export function redeLinksForDisplay(linksForRede) {
  const links = linksForRede ?? [];
  const manual = links.filter((l) => l.manual);
  if (manual.length) return manual;
  return links.filter((l) => !l.manual);
}

export function manualLinkForRede(linksForRede) {
  return (linksForRede ?? []).find((l) => l.manual) ?? null;
}

export function bufferOnlyLinks(linksForRede) {
  return (linksForRede ?? []).filter((l) => !l.manual && l.bufferPostId);
}

export const MANUAL_CANAL_STATUS_OPTS = [
  { value: 'clear', label: 'Não rastreado' },
  { value: 'draft', label: 'Preparado (local)' },
  { value: 'scheduled', label: 'Agendado no Meta / app' },
  { value: 'sent', label: 'Publicado manualmente' },
];

export const ETAPA_OPTS = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'programado', label: 'Programado' },
  { value: 'publicado', label: 'Publicado' },
];

export function bufferRedeAggregateStatus(linksForRede) {
  const links = redeLinksForDisplay(linksForRede);
  if (!links.length) return { status: null, label: 'Não enviado', erro: null, manual: false };
  const manual = links.some((l) => l.manual);
  if (links.some((l) => l.status === 'error')) {
    const err = links.find((l) => l.erro)?.erro;
    return { status: 'error', label: BUFFER_STATUS_LABELS.error, erro: err, manual };
  }
  if (links.every((l) => l.status === 'sent')) {
    const label = manual ? 'Publicado · manual' : BUFFER_STATUS_LABELS.sent;
    return { status: 'sent', label, erro: null, manual };
  }
  if (links.some((l) => l.status === 'scheduled' || l.status === 'sending')) {
    const st = links.find((l) => l.status === 'sending') ? 'sending' : 'scheduled';
    const label = manual ? `${BUFFER_STATUS_LABELS[st]} · manual` : BUFFER_STATUS_LABELS[st];
    return { status: st, label, erro: null, manual };
  }
  const label = manual ? 'Preparado · manual' : BUFFER_STATUS_LABELS.draft;
  return { status: 'draft', label, erro: null, manual };
}

/** Redes em que o vínculo (Buffer ou manual) está como publicado. */
export function publishedRedesForPost(post) {
  const allowed = allowedRedes(post.envio);
  const plan = (post.redes ?? []).filter((r) => allowed.includes(r));
  const redes = plan.length ? plan : allowed;
  const byRede = bufferLinksByRede(post.bufferLinks);
  return redes.filter((rede) => bufferRedeAggregateStatus(byRede[rede] ?? []).status === 'sent');
}

export function bufferStatusLabel(post) {
  const links = post.bufferLinks ?? [];
  if (!links.length) return 'Sem publicação rastreada';
  const redes = [...new Set(links.map((l) => l.rede))];
  const parts = redes.map((rede) => {
    const agg = bufferRedeAggregateStatus(links.filter((l) => l.rede === rede));
    return `${REDE_LABELS[rede] ?? rede}: ${agg.label}`;
  });
  return parts.join(' · ');
}

export function formatBufferDue(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}