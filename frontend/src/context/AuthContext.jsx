import { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest, getToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest('/api/auth/me');
        setUser(data.user);
      } catch {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  async function login(email, password) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(form) {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  async function uploadAvatar(file) {
    const body = new FormData();
    body.append('avatar', file);
    const data = await apiRequest('/api/auth/avatar', {
      method: 'POST',
      body,
    });
    setUser(data.user);
    return data.user;
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, uploadAvatar, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth трябва да се ползва вътре в AuthProvider');
  }
  return context;
}
