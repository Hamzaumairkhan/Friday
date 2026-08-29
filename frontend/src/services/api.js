/**
 * Centralized API client with automatic Firebase token attachment.
 */

import { auth } from './firebase';

let rawBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
if (rawBase.endsWith('/')) rawBase = rawBase.slice(0, -1);
const API_BASE = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`;

async function getAuthHeaders() {
  const user = auth?.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      if (token) return { Authorization: `Bearer ${token}` };
    } catch {
      // fallback to cached session
    }
  }

  try {
    const cached = localStorage.getItem('friday_session');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.token) {
        return { Authorization: `Bearer ${parsed.token}` };
      }
      if (parsed?.user?.id) {
        return { 'X-User-Id': parsed.user.id };
      }
    }

    const directToken = localStorage.getItem('token');
    if (directToken) {
      return { Authorization: `Bearer ${directToken}` };
    }

    const authUser = localStorage.getItem('auth_user');
    if (authUser) {
      const parsed = JSON.parse(authUser);
      if (parsed?.id) {
        return { 'X-User-Id': parsed.id };
      }
    }
  } catch {}

  return {};
}

async function request(endpoint, options = {}) {
  const authHeaders = await getAuthHeaders();
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    const error = new Error(errorData.message || errorData.detail || 'Request failed');
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, data) => request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  patch: (endpoint, data) => request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  put: (endpoint, data) => request(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export default api;
