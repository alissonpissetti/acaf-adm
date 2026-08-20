import { fetchApi } from './client.js';

export function fetchPermissions() {
  return fetchApi('/api/admin/permissions');
}

export function fetchModules() {
  return fetchApi('/api/admin/modules');
}

export function createModule(body) {
  return fetchApi('/api/admin/modules', { method: 'POST', body: JSON.stringify(body) });
}

export function updateModule(id, body) {
  return fetchApi(`/api/admin/modules/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function createModuleItem(moduleId, body) {
  return fetchApi(`/api/admin/modules/${moduleId}/items`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateModuleItem(id, body) {
  return fetchApi(`/api/admin/module-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function updatePermission(id, body) {
  return fetchApi(`/api/admin/permissions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchUserGroups() {
  return fetchApi('/api/admin/user-groups');
}

export function createUserGroup(body) {
  return fetchApi('/api/admin/user-groups', { method: 'POST', body: JSON.stringify(body) });
}

export function updateUserGroup(id, body) {
  return fetchApi(`/api/admin/user-groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchGroupPermissions(groupId) {
  return fetchApi(`/api/admin/user-groups/${groupId}/permissions`);
}

export function saveGroupPermissions(groupId, permissionIds) {
  return fetchApi(`/api/admin/user-groups/${groupId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissionIds }),
  });
}

export function fetchDepartments() {
  return fetchApi('/api/admin/departments');
}

export function createDepartment(body) {
  return fetchApi('/api/admin/departments', { method: 'POST', body: JSON.stringify(body) });
}

export function updateDepartment(id, body) {
  return fetchApi(`/api/admin/departments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchJobPositions() {
  return fetchApi('/api/admin/job-positions');
}

export function createJobPosition(body) {
  return fetchApi('/api/admin/job-positions', { method: 'POST', body: JSON.stringify(body) });
}

export function updateJobPosition(id, body) {
  return fetchApi(`/api/admin/job-positions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
