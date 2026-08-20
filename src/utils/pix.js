export const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Celular' },
  { value: 'random', label: 'Chave aleatória' },
];

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeCpf(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11);
}

export function normalizeCnpj(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 14);
}

export function isValidCpf(digits) {
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(digits[10]);
}

export function isValidCnpj(digits) {
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * weights1[i];
  let mod = sum % 11;
  const d1 = mod < 2 ? 0 : 11 - mod;
  if (d1 !== Number(digits[12])) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(digits[i]) * weights2[i];
  mod = sum % 11;
  const d2 = mod < 2 ? 0 : 11 - mod;
  return d2 === Number(digits[13]);
}

export function normalizePixPhone(value) {
  const trimmed = String(value ?? '').trim();
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return `+${digits}`;
  return `+55${digits}`;
}

export function isValidPixPhone(value) {
  const normalized = normalizePixPhone(value);
  if (!/^\+55\d{10,11}$/.test(normalized)) return false;
  const local = normalized.slice(3);
  if (local.length === 11) return local[2] === '9';
  return local.length === 10;
}

export function normalizePixKey(type, value) {
  const trimmed = String(value ?? '').trim();
  switch (type) {
    case 'cpf':
      return normalizeCpf(trimmed);
    case 'cnpj':
      return normalizeCnpj(trimmed);
    case 'email':
      return trimmed.toLowerCase();
    case 'phone':
      return normalizePixPhone(trimmed);
    case 'random':
      return trimmed.toLowerCase();
    default:
      return trimmed;
  }
}

export function formatPixKey(type, value) {
  switch (type) {
    case 'cpf':
      return value.length === 11
        ? `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`
        : value;
    case 'cnpj':
      return value.length === 14
        ? `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`
        : value;
    case 'phone':
      if (!value.startsWith('+55')) return value;
      return value;
    default:
      return value;
  }
}

export function validatePixKey(type, value) {
  const normalized = normalizePixKey(type, value);
  if (!normalized) return { valid: false, message: 'Informe a chave PIX.' };

  switch (type) {
    case 'cpf':
      if (!isValidCpf(normalized)) return { valid: false, message: 'CPF inválido para chave PIX.' };
      break;
    case 'cnpj':
      if (!isValidCnpj(normalized)) return { valid: false, message: 'CNPJ inválido para chave PIX.' };
      break;
    case 'email':
      if (!EMAIL_RE.test(normalized) || normalized.length > 77) {
        return { valid: false, message: 'E-mail inválido para chave PIX.' };
      }
      break;
    case 'phone':
      if (!isValidPixPhone(normalized)) {
        return { valid: false, message: 'Telefone inválido. Use +55, DDD e número do celular.' };
      }
      break;
    case 'random':
      if (!UUID_RE.test(normalized)) {
        return { valid: false, message: 'Chave aleatória inválida.' };
      }
      break;
    default:
      return { valid: false, message: 'Tipo de chave PIX inválido.' };
  }

  return { valid: true, normalized };
}

export function validatePixKeys(keys) {
  const activeRows = keys.filter((key) => key.active !== false);
  const seen = new Set();

  for (const key of activeRows) {
    const result = validatePixKey(key.type, key.keyValue);
    if (!result.valid) return result;
    const signature = `${key.type}:${result.normalized}`;
    if (seen.has(signature)) {
      return { valid: false, message: 'Não repita a mesma chave PIX.' };
    }
    seen.add(signature);
  }

  const primaryCount = activeRows.filter((key) => key.isPrimary).length;
  if (primaryCount > 1) {
    return { valid: false, message: 'Selecione apenas uma chave PIX principal.' };
  }

  return { valid: true };
}

export function validateSupplierDocument(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return { valid: true, normalized: '' };

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11) {
    if (!isValidCpf(digits)) return { valid: false, message: 'CPF inválido.' };
    return { valid: true, normalized: digits };
  }
  if (digits.length === 14) {
    if (!isValidCnpj(digits)) return { valid: false, message: 'CNPJ inválido.' };
    return { valid: true, normalized: digits };
  }
  return { valid: false, message: 'Informe um CPF ou CNPJ válido.' };
}

export function formatSupplierDocument(value) {
  if (!value) return '';
  if (value.length === 11) return formatPixKey('cpf', value);
  if (value.length === 14) return formatPixKey('cnpj', value);
  return value;
}

export function pixKeyPlaceholder(type) {
  switch (type) {
    case 'cpf':
      return '000.000.000-00';
    case 'cnpj':
      return '00.000.000/0000-00';
    case 'email':
      return 'financeiro@empresa.com.br';
    case 'phone':
      return '+55 11 91234-5678';
    case 'random':
      return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    default:
      return '';
  }
}

export function emptyPixKey(isPrimary = false) {
  return {
    id: '',
    type: 'email',
    keyValue: '',
    label: '',
    isPrimary,
    active: true,
  };
}
