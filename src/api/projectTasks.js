import { fetchApi, fetchApiUpload } from './client.js';

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

export function fetchProjectTaskComments(id) {
  return fetchApi(`/api/admin/project-tasks/${encodeURIComponent(id)}/comments`);
}

export function addProjectTaskComment(id, body) {
  return fetchApi(`/api/admin/project-tasks/${encodeURIComponent(id)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export function fetchProjectTaskAttachments(id) {
  return fetchApi(`/api/admin/project-tasks/${encodeURIComponent(id)}/attachments`);
}

export function uploadProjectTaskAttachments(id, files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('attachments', file);
  }
  return fetchApiUpload(`/api/admin/project-tasks/${encodeURIComponent(id)}/attachments`, formData);
}

export function deleteProjectTaskAttachment(id, attachmentId) {
  return fetchApi(
    `/api/admin/project-tasks/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`,
    { method: 'DELETE' },
  );
}