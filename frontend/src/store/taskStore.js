import { create } from 'zustand';
import apiClient from '../api/axiosClient';

const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (channelId) => {
    set({ loading: true });
    try {
      const res = await apiClient.get(`/api/channels/${channelId}/tasks`);
      set({ tasks: res.data, loading: false });
    } catch (err) {
      set({ loading: false });
      console.error(err);
    }
  },

  createTask: async (channelId, title, description, priority = 'medium') => {
    try {
      const res = await apiClient.post(`/api/channels/${channelId}/tasks`, { title, description, priority });
      set((state) => ({ tasks: [...state.tasks, res.data] }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || "Görev oluşturulamadı" };
    }
  },

  updateTask: async (taskId, data) => {
    try {
      const res = await apiClient.patch(`/api/tasks/${taskId}`, data);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? res.data : t)),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || "Görev güncellenemedi" };
    }
  },

  deleteTask: async (taskId) => {
    try {
      await apiClient.delete(`/api/tasks/${taskId}`);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== taskId),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || "Görev silinemedi" };
    }
  },

  summarizeChannel: async (channelId) => {
    try {
      const res = await apiClient.get(`/api/channels/${channelId}/summarize`);
      return { success: true, summary: res.data.summary };
    } catch (err) {
      return { success: false, error: "Özet alınamadı." };
    }
  }
}));

export default useTaskStore;
