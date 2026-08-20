import { fetchApi } from './client.js';

export function getUsers() {
  return fetchApi('/api/admin/users');
}

export function createUser(payload) {
  return fetchApi('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateUser(id, payload) {
  return fetchApi(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id) {
  return fetchApi(`/api/admin/users/${id}`, {
    method: 'DELETE',
  });
}

export function deleteUsers(ids) {
  return fetchApi('/api/admin/users/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}
