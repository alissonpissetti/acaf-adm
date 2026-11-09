/**
 * Aceita vírgula ou ponto como separador decimal.
 * @returns null se vazio; undefined se inválido; número 0–100 se válido
 */
export function parseOptionalPercent(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/\s/g, '');
  if (s === '') return null;
  const normalized = s.replace(',', '.');
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, n));
}

export function formatPercentPtBr(value, { minFrac = 2, maxFrac = 2 } = {}) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  })}%`;
}
