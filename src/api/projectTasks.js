import { fetchApi } from './client.js';

export function listProjectTasks() {
  return fetchApi('/api/admin/project-tasks');
}

export function createProjectTask(body) {
  return fetchApi('/api/admin/project-tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function patchProjectTask(id, body) {
  return fetchApi(`/api/admin/project-tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteProjectTask(id) {
  return fetchApi(`/api/admin/project-tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function fetchProjectTaskEvents(id) {
  return fetchApi(`/api/admin/project-tasks/${encodeURIComponent(id)}/events`);
}