const API_URL = 'http://localhost:5000';

export function getToken() {
  return localStorage.getItem('token');
}

export async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // При FormData НЕ слагаме Content-Type — браузърът го прави сам
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Грешка при заявката.');
  }

  return data;
}

export function fileUrl(relativePath) {
  if (!relativePath) return '';
  // Windows пътищата в базата може да имат \, затова ги оправяме
  const clean = relativePath.replace(/\\/g, '/');
  return `${API_URL}/${clean}`;
}

export { API_URL };
