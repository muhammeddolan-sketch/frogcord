import { create } from 'zustand';
import apiClient from '../api/axiosClient';

export const useFriendStore = create((set, get) => ({
  friends: [],
  isLoading: false,

  fetchFriends: async () => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.get('/api/friends');
      set({ friends: data, isLoading: false });
    } catch (error) {
      console.error("Arkadaşlar yüklenemedi:", error);
      set({ isLoading: false });
    }
  },

  sendFriendRequest: async (username) => {
    try {
      const { data } = await apiClient.post('/api/friends/request', { target_username: username });
      set((state) => ({ friends: [...state.friends, data] }));
      return { success: true, data };
    } catch (error) {
      console.error("İstek gönderilemedi:", error);
      return { success: false, error: error.response?.data?.detail || "İstek gönderilemedi." };
    }
  },

  acceptFriendRequest: async (requestId) => {
    try {
      const { data } = await apiClient.post(`/api/friends/accept/${requestId}`);
      set((state) => ({
        friends: state.friends.map(f => f.id === requestId ? { ...f, status: 'accepted' } : f)
      }));
      return { success: true, data };
    } catch (error) {
      console.error("İstek kabul edilemedi:", error);
      return { success: false };
    }
  },

  rejectFriendRequest: async (requestId) => {
    try {
      await apiClient.post(`/api/friends/reject/${requestId}`);
      set((state) => ({
        friends: state.friends.filter(f => f.id !== requestId)
      }));
      return { success: true };
    } catch (error) {
      console.error("İstek reddedilemedi:", error);
      return { success: false };
    }
  },

  // Socket'ten gelen canlı veriler için
  addPendingRequest: (requestData) => {
    set((state) => {
      if (state.friends.some(f => f.id === requestData.id)) return state;
      return { friends: [...state.friends, requestData] };
    });
  },

  updateRequestToAccepted: (requestData) => {
    set((state) => ({
      friends: state.friends.map(f => f.id === requestData.id ? { ...f, status: 'accepted' } : f)
    }));
  }
}));
