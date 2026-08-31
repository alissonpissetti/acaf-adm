export const DEFAULT_MARKETING_THEME = {
  backgroundType: 'solid',
  backgroundColor: '#eef0f4',
  backgroundGradient: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)',
  backgroundImageUrl: '',
  cardColor: '#ffffff',
  cardTextColor: '#1c1c1e',
  fontFamily: 'Inter',
  buttonColor: '#0f766e',
  buttonTextColor: '#ffffff',
  buttonStyle: 'rounded',
  hideHeadline: false,
  hideDescription: false,
};

export const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'email', label: 'E-mail' },
  { value: 'tel', label: 'Telefone' },
  { value: 'textarea', label: 'Texto longo' },
];

export const FIELD_MAPS = [
  { value: '', label: 'Somente resposta' },
  { value: 'title', label: 'Título do lead' },
  { value: 'contactName', label: 'Nome do contato' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'legalName', label: 'Razão social' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'notes', label: 'Observações' },
];

export const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'system-ui', label: 'Sistema' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Roboto', label: 'Roboto' },
];

export const BUTTON_STYLES = [
  { value: 'rounded', label: 'Arredondado' },
  { value: 'pill', label: 'Pílula' },
  { value: 'square', label: 'Quadrado' },
];

export const BACKGROUND_TYPES = [
  { value: 'solid', label: 'Cor sólida' },
  { value: 'gradient', label: 'Gradiente' },
  { value: 'image', label: 'Imagem' },
];

export const GRADIENT_DIRECTIONS = [
  { value: 180, label: 'De cima para baixo' },
  { value: 0, label: 'De baixo para cima' },
  { value: 90, label: 'Da esquerda para direita' },
  { value: 270, label: 'Da direita para esquerda' },
  { value: 135, label: 'Diagonal ↘' },
  { value: 45, label: 'Diagonal ↗' },
];

export const GRADIENT_PRESETS = [
  { label: 'Claro suave', startColor: '#f8fafc', endColor: '#eef2f7', angle: 180 },
  { label: 'Pêssego', startColor: '#fff4eb', endColor: '#ffe8d6', angle: 180 },
  { label: 'Verde menta', startColor: '#ecfdf5', endColor: '#d1fae5', angle: 180 },
  { label: 'Azul claro', startColor: '#eff6ff', endColor: '#dbeafe', angle: 180 },
  { label: 'Roxo suave', startColor: '#faf5ff', endColor: '#ede9fe', angle: 135 },
  { label: 'Pôr do sol', startColor: '#fff7ed', endColor: '#fed7aa', angle: 135 },
];

const GRADIENT_REGEX =
  /linear-gradient\(\s*(\d+(?:\.\d+)?)deg\s*,\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))\s+\d+%?\s*,\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))\s+\d+%?\s*\)/i;

export function parseGradient(css) {
  const fallback = {
    startColor: '#f8fafc',
    endColor: '#eef2f7',
    angle: 180,
  };

  if (!css?.trim()) return fallback;

  const match = css.trim().match(GRADIENT_REGEX);
  if (!match) return fallback;

  return {
    angle: Number(match[1]) || 180,
    startColor: match[2],
    endColor: match[3],
  };
}

export function buildGradient({ startColor, endColor, angle = 180 }) {
  const start = startColor?.trim() || '#f8fafc';
  const end = endColor?.trim() || '#eef2f7';
  const deg = Number.isFinite(Number(angle)) ? Number(angle) : 180;
  return `linear-gradient(${deg}deg, ${start} 0%, ${end} 100%)`;
}

export function colorInputValue(color, fallback = '#f8fafc') {
  if (!color) return fallback;
  if (/^#[0-9a-fA-F]{6}$/i.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/i.test(color)) {
    const [, r, g, b] = color.match(/^#(.)(.)(.)$/i) ?? [];
    if (r && g && b) return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

export const DEFAULT_FIELDS = [
  { key: 'name', label: 'Nome', kind: 'field', type: 'text', required: true, mapTo: 'contactName' },
  { key: 'email', label: 'E-mail', kind: 'field', type: 'email', required: true, mapTo: 'email' },
  { key: 'phone', label: 'Telefone', kind: 'field', type: 'tel', required: false, mapTo: 'phone' },
  {
    key: 'company',
    label: 'Empresa / academia',
    kind: 'field',
    type: 'text',
    required: false,
    mapTo: 'title',
  },
  { key: 'message', label: 'Mensagem', kind: 'field', type: 'textarea', required: false, mapTo: 'notes' },
];

export function pageToForm(page) {
  const theme = {
    ...DEFAULT_MARKETING_THEME,
    ...(page?.theme ?? {}),
    buttonColor: page?.theme?.buttonColor ?? page?.primaryColor ?? DEFAULT_MARKETING_THEME.buttonColor,
  };

  return {
    name: page?.name ?? '',
    slug: page?.slug ?? '',
    headline: page?.headline ?? '',
    description: page?.description ?? '',
    thankYouMessage: page?.thankYouMessage ?? '',
    primaryColor: page?.primaryColor ?? theme.buttonColor,
    logoUrl: page?.logoUrl ?? '',
    coverImageUrl: page?.coverImageUrl ?? '',
    theme,
    campaignId: page?.campaignId ?? '',
    creativeId: page?.creativeId ?? '',
    funnelId: page?.funnelId ?? '',
    leadType: page?.leadType ?? '',
    ownerUserId: page?.ownerUserId ?? '',
    fields: normalizeFieldsForEditor(page?.fields),
    active: page?.active ?? true,
  };
}

export function normalizeFieldsForEditor(fields) {
  if (!fields?.length) return DEFAULT_FIELDS.map((field) => ({ ...field }));
  return fields.map((field, index) => {
    if (field.kind === 'section') {
      return {
        key: field.key || `section_${index + 1}`,
        label: field.label || `Seção ${index + 1}`,
        kind: 'section',
        sectionStyle: field.sectionStyle === 'highlight' ? 'highlight' : 'default',
      };
    }
    return {
      key: field.key || `field_${index + 1}`,
      label: field.label || `Campo ${index + 1}`,
      kind: 'field',
      type: field.type ?? 'text',
      required: Boolean(field.required),
      placeholder: field.placeholder ?? '',
      description: field.description ?? '',
      mapTo: field.mapTo,
    };
  });
}

export function countFormStats(fields) {
  const total = fields.length;
  const questions = fields.filter((field) => field.kind !== 'section').length;
  return { total, questions };
}

export function createSection(fields) {
  const index = fields.length + 1;
  return {
    key: `section_${index}`,
    label: 'Nova seção',
    kind: 'section',
    sectionStyle: 'default',
  };
}

export function createField(fields) {
  const index = fields.filter((field) => field.kind !== 'section').length + 1;
  return {
    key: `field_${index}`,
    label: 'Nova pergunta',
    kind: 'field',
    type: 'text',
    required: false,
    placeholder: '',
    description: '',
    mapTo: undefined,
  };
}

export function moveField(fields, index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= fields.length) return fields;
  const copy = [...fields];
  const [item] = copy.splice(index, 1);
  copy.splice(nextIndex, 0, item);
  return copy;
}

export function buildPageBackgroundStyle(theme = DEFAULT_MARKETING_THEME) {
  if (theme.backgroundType === 'gradient' && theme.backgroundGradient) {
    return { background: theme.backgroundGradient };
  }
  if (theme.backgroundType === 'image' && theme.backgroundImageUrl) {
    return {
      backgroundImage: `url(${theme.backgroundImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { backgroundColor: theme.backgroundColor || DEFAULT_MARKETING_THEME.backgroundColor };
}

export function buildButtonRadius(buttonStyle) {
  if (buttonStyle === 'pill') return '999px';
  if (buttonStyle === 'square') return '6px';
  return '10px';
}

export function formToPayload(form) {
  const theme = {
    ...form.theme,
    buttonColor: form.theme?.buttonColor || form.primaryColor,
    hideHeadline: Boolean(form.theme?.hideHeadline),
    hideDescription: Boolean(form.theme?.hideDescription),
  };

  return {
    name: form.name,
    slug: form.slug || undefined,
    headline: form.headline,
    description: form.description,
    thankYouMessage: form.thankYouMessage,
    primaryColor: theme.buttonColor,
    logoUrl: form.logoUrl?.trim() || null,
    coverImageUrl: form.coverImageUrl?.trim() || null,
    theme,
    campaignId: form.campaignId || null,
    creativeId: form.creativeId || null,
    funnelId: form.funnelId || null,
    leadType: form.leadType || null,
    ownerUserId: form.ownerUserId || null,
    fields: form.fields,
    active: form.active,
  };
}
