/** URL público fixo do painel de parceiros associados (acaf-association). */
export const ACAF_ASSOCIATION_URL = 'https://acaf.sejamovly.com';

export function isExternalRoute(route) {
  return /^https?:\/\//i.test(String(route ?? '').trim());
}
