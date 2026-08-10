const TOKEN_KEY = 'acaf_admin_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    let message = 'Falha no login.';
    try {
      const err = await response.json();
      if (err.message) message = err.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return response.json();
}

export async function getMe(token) {
  const response = await fetch('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Sessão expirada.');
  }

  return response.json();
}
