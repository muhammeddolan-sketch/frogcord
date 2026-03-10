import { create } from 'zustand';
import apiClient from '../api/axiosClient';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('access_token') || null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  initialize: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    set({ isLoading: true });
    try {
      const res = await apiClient.get('/api/users/me');
      set({ user: res.data, isLoading: false });
    } catch (err) {
      localStorage.removeItem('access_token');
      set({ token: null, user: null, isLoading: false });
    }
  },

  register: async (email, username, displayName, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post('/api/auth/register', { email, username, display_name: displayName, password });
      set({ isLoading: false });
      return { success: true, data: res.data };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Kayıt başarısız oldu.';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  login: async (usernameOrEmail, password) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('username', usernameOrEmail);
      params.append('password', password);
      const res = await apiClient.post('/api/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const token = res.data.access_token;
      localStorage.setItem('access_token', token);
      const meRes = await apiClient.get('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
      set({ token, user: meRes.data, isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Giriş başarısız oldu.';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  // Profil güncelleme (form-data ile avatar + displayName)
  updateProfile: async (displayName, avatarFile) => {
    set({ isLoading: true });
    try {
      const formData = new FormData();
      if (displayName) formData.append('display_name', displayName);
      if (avatarFile) formData.append('avatar', avatarFile);
      const res = await apiClient.patch('/api/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ user: res.data, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.detail || 'Güncelleme başarısız.' };
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null });
  },
}));

export default useAuthStore;
