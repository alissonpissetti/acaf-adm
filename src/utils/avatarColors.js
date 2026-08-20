export const AVATAR_COLORS = [
  { id: 'slate', label: 'Cinza', bg: '#64748b', text: '#ffffff' },
  { id: 'blue', label: 'Azul', bg: '#3b82f6', text: '#ffffff' },
  { id: 'indigo', label: 'Índigo', bg: '#6366f1', text: '#ffffff' },
  { id: 'violet', label: 'Violeta', bg: '#8b5cf6', text: '#ffffff' },
  { id: 'purple', label: 'Roxo', bg: '#a855f7', text: '#ffffff' },
  { id: 'pink', label: 'Rosa', bg: '#ec4899', text: '#ffffff' },
  { id: 'rose', label: 'Rosé', bg: '#f43f5e', text: '#ffffff' },
  { id: 'orange', label: 'Laranja', bg: '#f97316', text: '#ffffff' },
  { id: 'amber', label: 'Âmbar', bg: '#f59e0b', text: '#111827' },
  { id: 'green', label: 'Verde', bg: '#22c55e', text: '#ffffff' },
  { id: 'teal', label: 'Teal', bg: '#14b8a6', text: '#ffffff' },
  { id: 'cyan', label: 'Ciano', bg: '#06b6d4', text: '#ffffff' },
];

const COLOR_BY_ID = Object.fromEntries(AVATAR_COLORS.map((color) => [color.id, color]));

export function getAvatarColorStyle(colorId) {
  const color = COLOR_BY_ID[colorId] ?? COLOR_BY_ID.slate;
  return {
    backgroundColor: color.bg,
    color: color.text,
  };
}

export function getAvatarColorLabel(colorId) {
  return COLOR_BY_ID[colorId]?.label ?? 'Cinza';
}

export function pickAvatarColor(seed = '') {
  if (!seed) return AVATAR_COLORS[0].id;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index) * (index + 1)) % 10_000;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length].id;
}
