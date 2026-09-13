import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../config/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.data.user);
      } catch {
        localStorage.removeItem('accessToken');
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('accessToken');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
    return data.data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
