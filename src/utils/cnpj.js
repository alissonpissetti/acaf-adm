/** Formata 14 dígitos como 00.000.000/0000-00 */
export function formatCnpjFromDigits(digits) {
  const d = String(digits ?? '').replace(/\D/g, '');
  if (d.length !== 14) return d || '';
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
