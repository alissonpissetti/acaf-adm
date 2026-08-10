/** Formata número como moeda BRL (exibição). */
export function formatBRL(value) {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Converte número para exibição no input (sem símbolo R$). */
export function formatBrlInputDigits(amount) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Interpreta texto digitado (com ou sem máscara) como reais. */
export function parseBrlInput(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return 0;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export function amountFromDigitStream(digits) {
  const n = parseInt(String(digits).replace(/\D/g, '') || '0', 10);
  return n / 100;
}

export function clampAmount(amount, min, max) {
  if (!Number.isFinite(amount)) return min;
  return Math.min(max, Math.max(min, Math.round(amount * 100) / 100));
}

export function maxDigitsForAmount(max) {
  const cents = Math.max(0, Math.round(max * 100));
  return Math.max(1, String(cents).length);
}
