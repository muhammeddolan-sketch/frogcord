import { create } from 'zustand';
import apiClient from '../api/axiosClient';

const useGuildStore = create((set, get) => ({
  guilds: [],
  activeGuild: null,
  activeChannel: null,
  messages: [],

  fetchGuilds: async () => {
    try {
      const res = await apiClient.get('/api/guilds');
      set({ guilds: res.data });
    } catch (err) { console.error(err); }
  },

  createGuild: async (name, description, iconFile) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description || '');
      if (iconFile) formData.append('icon', iconFile);
      const res = await apiClient.post('/api/guilds', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set((s) => ({ guilds: [...s.guilds, res.data] }));
      get().selectGuild(res.data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Sunucu oluşturulamadı.' };
    }
  },

  updateGuild: async (guildId, name, description, iconFile) => {
    try {
      const formData = new FormData();
      if (name) formData.append('name', name);
      if (description !== undefined) formData.append('description', description);
      if (iconFile) formData.append('icon', iconFile);
      const res = await apiClient.patch(`/api/guilds/${guildId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set((s) => ({
        guilds: s.guilds.map((g) => g.id === guildId ? res.data : g),
        activeGuild: s.activeGuild?.id === guildId ? res.data : s.activeGuild,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Güncelleme başarısız.' };
    }
  },

  joinGuild: async (inviteCode) => {
    try {
      const res = await apiClient.post(`/api/guilds/join/${inviteCode}`);
      set((s) => ({ guilds: [...s.guilds, res.data] }));
      get().selectGuild(res.data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Geçersiz davet kodu.' };
    }
  },

  deleteGuild: async (guildId) => {
    try {
      await apiClient.delete(`/api/guilds/${guildId}`);
      set((s) => ({
        guilds: s.guilds.filter((g) => g.id !== guildId),
        activeGuild: s.activeGuild?.id === guildId ? null : s.activeGuild,
        activeChannel: s.activeGuild?.id === guildId ? null : s.activeChannel,
        messages: s.activeGuild?.id === guildId ? [] : s.messages,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Sunucu silinemedi.' };
    }
  },

  leaveGuild: async (guildId) => {
    try {
      await apiClient.delete(`/api/guilds/${guildId}/leave`);
      set((s) => ({
        guilds: s.guilds.filter((g) => g.id !== guildId),
        activeGuild: s.activeGuild?.id === guildId ? null : s.activeGuild,
        activeChannel: s.activeGuild?.id === guildId ? null : s.activeChannel,
        messages: s.activeGuild?.id === guildId ? [] : s.messages,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Sunucudan ayrılınamadı.' };
    }
  },

  createChannel: async (guildId, name, type = 'text') => {
    try {
      const res = await apiClient.post(`/api/guilds/${guildId}/channels`, { name, channel_type: type });
      set((s) => ({
        guilds: s.guilds.map((g) => g.id === guildId ? { ...g, channels: [...g.channels, res.data] } : g),
        activeGuild: s.activeGuild?.id === guildId
          ? { ...s.activeGuild, channels: [...s.activeGuild.channels, res.data] }
          : s.activeGuild,
      }));
      return { success: true, channel: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Kanal oluşturulamadı.' };
    }
  },

  removeMessage: async (messageId) => {
    try {
      await apiClient.delete(`/api/messages/${messageId}`);
      set((s) => ({ messages: s.messages.filter((m) => m.id !== messageId) }));
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  },

  selectGuild: (guild) => {
    set({ activeGuild: guild, messages: [], activeChannel: null });
    if (guild?.channels?.length > 0) get().selectChannel(guild.channels[0]);
  },

  selectChannel: async (channel) => {
    set({ activeChannel: channel, messages: [] });
    try {
      const res = await apiClient.get(`/api/channels/${channel.id}/messages`);
      set({ messages: res.data });
    } catch (err) { console.error(err); }
  },

  addMessage: (msg) => { set((s) => {
    if (s.messages.some((m) => m.id === msg.id)) return s;
    return { messages: [...s.messages, msg] };
  }); },
}));

export default useGuildStore;
