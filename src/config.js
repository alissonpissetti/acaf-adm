/**
 * URL base da API (sem barra final).
 * Produção Coolify: definida em runtime via api-config.js (API_BACKEND_URL).
 * Dev: VITE_API_URL ou proxy Vite (/api).
 */
function readApiUrl() {
  if (typeof window !== 'undefined' && window.__CONNECT_API_URL__) {
    return String(window.__CONNECT_API_URL__).replace(/\/$/, '');
  }
  const fromEnv = import.meta.env.VITE_API_URL ?? '';
  return String(fromEnv).replace(/\/$/, '');
}

export const API_URL = readApiUrl();

export function apiUrl(path) {
  const base = API_URL;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
