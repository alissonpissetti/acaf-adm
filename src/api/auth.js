import { apiUrl } from '../config.js';
import { fetchApiUpload } from './client.js';

const TOKEN_KEY = 'connect_admin_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function parseError(response, fallback) {
  let message = fallback;
  try {
    const err = await response.json();
    if (err.message) {
      message = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    }
  } catch {
    /* ignore */
  }
  throw new Error(message);
}

export async function login(email, password) {
  const response = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    await parseError(response, 'Falha no login.');
  }

  return response.json();
}

export async function requestOtp(mobilePhone, purpose) {
  const response = await fetch(apiUrl('/api/auth/otp/request'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobilePhone, purpose }),
  });

  if (!response.ok) {
    await parseError(response, 'Não foi possível enviar o código.');
  }

  return response.json();
}

export async function loginWithOtp(mobilePhone, code) {
  const response = await fetch(apiUrl('/api/auth/otp/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobilePhone, code }),
  });

  if (!response.ok) {
    await parseError(response, 'Código inválido ou expirado.');
  }

  return response.json();
}

export async function resetPasswordWithOtp(mobilePhone, code, newPassword) {
  const response = await fetch(apiUrl('/api/auth/password/reset'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobilePhone, code, newPassword }),
  });

  if (!response.ok) {
    await parseError(response, 'Não foi possível redefinir a senha.');
  }

  return response.json();
}

export async function getMe(token) {
  const response = await fetch(apiUrl('/api/auth/me'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Sessão expirada.');
  }

  return response.json();
}

export async function refreshMe() {
  const token = getToken();
  if (!token) throw new Error('Sessão expirada.');
  return getMe(token);
}

export async function updateMyProfile(payload) {
  const token = getToken();
  const response = await fetch(apiUrl('/api/auth/me'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    clearToken();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) {
    await parseError(response, 'Não foi possível atualizar o perfil.');
  }

  return response.json();
}

export async function uploadMyAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  return fetchApiUpload('/api/auth/me/avatar', formData);
}

export async function removeMyAvatar() {
  const token = getToken();
  const response = await fetch(apiUrl('/api/auth/me/avatar'), {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    await parseError(response, 'Não foi possível remover o avatar.');
  }

  return response.json();
}
