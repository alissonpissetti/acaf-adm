export function normalizeCpf(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11);
}

export function formatCpfInput(value) {
  const digits = normalizeCpf(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function normalizeMobilePhone(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11);
}

export function formatMobilePhoneInput(value) {
  const digits = normalizeMobilePhone(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCpfDisplay(digits) {
  if (!digits || digits.length !== 11) return digits ?? '';
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatMobilePhoneDisplay(digits) {
  if (!digits || digits.length !== 11) return digits ?? '';
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
