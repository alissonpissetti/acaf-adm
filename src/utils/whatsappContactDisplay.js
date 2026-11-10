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

  const primaryTitle = title || nameLine || phoneLine || 'Contato WhatsApp';

  const digitHints = [thread?.contactPhone, phoneLine, thread?.contactPhoneLabel]
    .map((value) => String(value ?? '').replace(/\D/g, ''))
    .filter((digits) => digits.length >= 4);

  return {
    kind,
    title: primaryTitle,
    nameLine,
    phoneLine,
    subtitle,
    badge: isGroup ? (thread?.contactBadge || 'Grupo') : badge,
    isPrivate,
    avatarName: nameLine || phoneLine || primaryTitle,
    searchText: [primaryTitle, nameLine, phoneLine, subtitle, thread?.contactPhone, ...digitHints]
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

export function phoneDigitsForCopy(phoneLine) {
  const digits = String(phoneLine ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
}
