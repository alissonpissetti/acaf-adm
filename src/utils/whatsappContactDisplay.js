/**
 * Apresentação de contato na inbox (espelha resolveInboxContactPresentation da API, com fallback).
 */
export function resolveWhatsAppContact(thread) {
  const title = String(thread?.contactDisplayName ?? '').trim();
  const nameLine = thread?.contactNameLine?.trim() || null;
  const phoneLine = thread?.contactPhoneLine?.trim() || thread?.contactPhoneLabel?.trim() || null;
  const subtitle = thread?.contactSubtitle?.trim() || null;
  const badge = thread?.contactBadge?.trim() || null;
  const isGroup = Boolean(thread?.isGroupThread) || String(thread?.contactPhone ?? '').startsWith('group:');
  const kind = isGroup ? 'named' : thread?.contactKind || inferKind(thread, title, phoneLine, nameLine);
  const isPrivate = !isGroup && (Boolean(thread?.isPrivateContact) || kind === 'private');

  let primaryTitle = title || nameLine || phoneLine || 'Contato WhatsApp';
  if (/^whatsapp\s*···\d+$/i.test(primaryTitle)) {
    if (nameLine) primaryTitle = nameLine;
    else if (phoneLine) primaryTitle = phoneLine;
  }
  const normalizedNameLine =
    nameLine && nameLine !== primaryTitle && !isGroup ? nameLine : null;
  const normalizedPhoneLine =
    phoneLine && phoneLine !== primaryTitle && !isGroup ? phoneLine : null;

  const digitHints = [thread?.contactPhone, phoneLine, thread?.contactPhoneLabel]
    .map((value) => String(value ?? '').replace(/\D/g, ''))
    .filter((digits) => digits.length >= 4);

  if (isGroup) {
    const instance = String(thread?.instanceName ?? '').trim();
    return {
      kind: 'named',
      title: primaryTitle,
      nameLine: null,
      phoneLine: null,
      subtitle: instance ? `Grupo · ${instance}` : subtitle || 'Grupo',
      badge: 'Grupo',
      isPrivate: false,
      avatarName: primaryTitle,
      searchText: [primaryTitle, subtitle, instance, thread?.contactPhone, ...digitHints]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };
  }

  return {
    kind,
    title: primaryTitle,
    nameLine: normalizedNameLine,
    phoneLine: normalizedPhoneLine,
    subtitle,
    badge,
    isPrivate,
    avatarName: normalizedNameLine || normalizedPhoneLine || primaryTitle,
    searchText: [primaryTitle, normalizedNameLine, normalizedPhoneLine, subtitle, thread?.contactPhone, ...digitHints]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

function inferKind(thread, title, phoneLine, nameLine) {
  if (thread?.contactPhone?.startsWith?.('lid:')) return 'private';
  if (nameLine) return 'named';
  if (phoneLine || /^\(\d{2}\)/.test(title)) return 'phone';
  if (/^whatsapp\s*···/i.test(title)) return 'private';
  return 'unknown';
}

export function isReactionPlaceholderBody(body) {
  const text = String(body ?? '').trim();
  if (!text) return false;
  if (/^rea[cç][aã]o:\s*.+/i.test(text)) return true;
  if (/^reaction:\s*.+/i.test(text)) return true;
  if (/^[^:\n]{2,48}:\s*rea[cç][aã]o:\s*.+/i.test(text)) return true;
  return false;
}

export function phoneDigitsForCopy(phoneLine) {
  const digits = String(phoneLine ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
}
