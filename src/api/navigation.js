import { fetchApi } from './client.js';

export function fetchNavigation() {
  return fetchApi('/api/admin/navigation');
}
