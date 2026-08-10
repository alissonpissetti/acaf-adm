import { API_URL } from '../config.js';
import { clearToken, getToken } from './auth.js';

async function parseErrorResponse(response) {
  let message = `API ${response.status}: ${response.statusText}`;
  try {
    const err = await response.json();
    if (err.message) message = err.message;
  } catch {
    /* ignore */
  }
  return message;
}

export async function fetchApi(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export async function fetchApiUpload(path, formData) {
  const token = getToken();
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401) {
    clearToken();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return response.json();
}

export async function getHealth() {
  return fetchApi('/api/health');
}
