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
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : 'Kayıt başarısız oldu.');
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
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : 'Giriş başarısız oldu.');
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  // Profil güncelleme (form-data ile avatar + displayName + bannerColor + aboutMe + customStatus)
  updateProfile: async (displayName, bannerColor, aboutMe, customStatus, avatarFile) => {
    set({ isLoading: true });
    try {
      const formData = new FormData();
      if (displayName) formData.append('display_name', displayName);
      if (bannerColor) formData.append('banner_color', bannerColor);
      if (aboutMe !== undefined && aboutMe !== null) formData.append('about_me', aboutMe);
      if (customStatus !== undefined && customStatus !== null) formData.append('custom_status', customStatus);
      if (avatarFile) formData.append('avatar', avatarFile);
      const res = await apiClient.patch('/api/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ user: res.data, isLoading: false });
      return { success: true };
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : 'Güncelleme başarısız.');
      set({ isLoading: false });
      return { success: false, error: msg };
    }
  },
  
  verifyRequest: async (email) => {
    try {
      await apiClient.post('/api/auth/verify-request', { email });
      return { success: true };
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : 'İstek başarısız.');
      return { success: false, error: msg };
    }
  },

  verifyConfirm: async (email, code) => {
    try {
      await apiClient.post('/api/auth/verify-confirm', { email, code });
      return { success: true };
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : 'Doğrulama başarısız.');
      return { success: false, error: msg };
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null });
  },
}));

export default useAuthStore;
