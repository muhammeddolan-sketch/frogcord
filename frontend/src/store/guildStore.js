import { create } from 'zustand';
import apiClient from '../api/axiosClient';

const useGuildStore = create((set, get) => ({
  guilds: [],
  activeGuild: null,
  activeChannel: null,
  roles: [],
  messages: [],
  dms: [],

  fetchGuilds: async () => {
    try {
      const res = await apiClient.get('/api/guilds');
      set({ guilds: res.data });
    } catch (err) { console.error(err); }
  },

  fetchDMs: async () => {
    try {
      const res = await apiClient.get('/api/dms');
      set({ dms: res.data });
    } catch (err) { console.error(err); }
  },

  startDM: async (userId) => {
    try {
      const res = await apiClient.post(`/api/dms/start/${userId}`);
      set((s) => {
        const exists = s.dms.some((d) => d.id === res.data.id);
        const nextDms = exists ? s.dms : [res.data, ...s.dms];
        return { dms: nextDms };
      });
      get().selectChannel(res.data);
      return { success: true, channel: res.data };
    } catch (err) {
      return { success: false, error: 'DM başlatılamadı.' };
    }
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
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : 'Sunucu oluşturulamadı.');
      return { success: false, error: msg };
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
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : 'Kanal oluşturulamadı.');
      return { success: false, error: msg };
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

  editMessage: async (messageId, content) => {
    try {
      const res = await apiClient.patch(`/api/messages/${messageId}`, { content });
      set((s) => ({ messages: s.messages.map((m) => m.id === messageId ? res.data : m) }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Düzenleme başarısız.' };
    }
  },

  toggleReaction: async (messageId, emoji) => {
    try {
      const res = await apiClient.post(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
      set((s) => ({ messages: s.messages.map((m) => m.id === messageId ? res.data : m) }));
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  },

  togglePin: async (messageId) => {
    try {
      const res = await apiClient.post(`/api/messages/${messageId}/pin`);
      set((s) => ({ messages: s.messages.map((m) => m.id === messageId ? { ...m, is_pinned: res.data.is_pinned } : m) }));
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  },

  searchMessages: async (channelId, query) => {
    try {
      const res = await apiClient.get(`/api/channels/${channelId}/search?q=${encodeURIComponent(query)}`);
      return { success: true, results: res.data };
    } catch (err) {
      return { success: false, results: [] };
    }
  },

  getPinnedMessages: async (channelId) => {
    try {
      const res = await apiClient.get(`/api/channels/${channelId}/pins`);
      return { success: true, pins: res.data };
    } catch (err) {
      return { success: false, pins: [] };
    }
  },

  fetchRoles: async (guildId) => {
    try {
      const res = await apiClient.get(`/api/guilds/${guildId}/roles`);
      set({ roles: res.data });
    } catch (err) { console.error(err); }
  },

  createRole: async (guildId, name, color, permissions) => {
    try {
      const res = await apiClient.post(`/api/guilds/${guildId}/roles`, { name, color, permissions });
      set((s) => ({ roles: [...s.roles, res.data] }));
      return { success: true };
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : 'Güncelleme başarısız.');
      return { success: false, error: msg };
    }
  },

  updateRole: async (roleId, roleData) => {
    try {
      const res = await apiClient.patch(`/api/roles/${roleId}`, roleData);
      set((s) => ({ roles: s.roles.map((r) => r.id === roleId ? res.data : r) }));
      return { success: true };
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : 'Güncelleme başarısız.');
      return { success: false, error: msg };
    }
  },

  deleteRole: async (roleId) => {
    try {
      await apiClient.delete(`/api/roles/${roleId}`);
      set((s) => ({ roles: s.roles.filter((r) => r.id !== roleId) }));
      return { success: true };
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : 'Güncelleme başarısız.');
      return { success: false, error: msg };
    }
  },

  addMemberRole: async (guildId, userId, roleId) => {
    try {
      await apiClient.post(`/api/guilds/${guildId}/members/${userId}/roles/${roleId}`);
      return { success: true };
    } catch (err) { return { success: false }; }
  },

  removeMemberRole: async (guildId, userId, roleId) => {
    try {
      await apiClient.delete(`/api/guilds/${guildId}/members/${userId}/roles/${roleId}`);
      return { success: true };
    } catch (err) { return { success: false }; }
  },

  updateMember: async (guildId, userId, nickname) => {
    try {
      await apiClient.patch(`/api/guilds/${guildId}/members/${userId}`, { nickname });
      return { success: true };
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0].msg : 'Güncelleme başarısız.');
      return { success: false, error: msg };
    }
  },

  selectGuild: (guild) => {
    set({ activeGuild: guild, messages: [], activeChannel: null, roles: [] });
    if (guild) get().fetchRoles(guild.id);
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

  // ─── YER İMLERİ ───────────────────────
  bookmarks: [],
  fetchBookmarks: async () => {
    try {
      const res = await apiClient.get('/api/bookmarks');
      set({ bookmarks: res.data });
    } catch (err) { console.error(err); }
  },
  addBookmark: async (messageId, note) => {
    try {
      const res = await apiClient.post('/api/bookmarks', { message_id: messageId, note });
      set((s) => ({ bookmarks: [res.data, ...s.bookmarks] }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Yer imi eklenemedi.' };
    }
  },
  removeBookmark: async (bookmarkId) => {
    try {
      await apiClient.delete(`/api/bookmarks/${bookmarkId}`);
      set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== bookmarkId) }));
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  },

  // ─── ANKETLER ─────────────────────────
  polls: [],
  fetchPolls: async (channelId) => {
    try {
      const res = await apiClient.get(`/api/channels/${channelId}/polls`);
      set({ polls: res.data });
    } catch (err) { console.error(err); }
  },
  createPoll: async (channelId, question, options, isAnonymous, isMultiple, deadline) => {
    try {
      const res = await apiClient.post(`/api/channels/${channelId}/polls`, {
        question, options, is_anonymous: isAnonymous, is_multiple: isMultiple, deadline
      });
      set((s) => ({ polls: [res.data, ...s.polls] }));
      return { success: true, poll: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Anket oluşturulamadı.' };
    }
  },
  votePoll: async (pollId, optionId) => {
    try {
      const res = await apiClient.post(`/api/polls/${pollId}/vote/${optionId}`);
      set((s) => ({ polls: s.polls.map((p) => p.id === pollId ? res.data : p) }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Oy verilemedi.' };
    }
  },
  deletePoll: async (pollId) => {
    try {
      await apiClient.delete(`/api/polls/${pollId}`);
      set((s) => ({ polls: s.polls.filter((p) => p.id !== pollId) }));
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  },

  // ─── WIKI ─────────────────────────────
  wikiPages: [],
  fetchWiki: async (guildId) => {
    try {
      const res = await apiClient.get(`/api/guilds/${guildId}/wiki`);
      set({ wikiPages: res.data });
    } catch (err) { console.error(err); }
  },
  createWikiPage: async (guildId, title, content, category) => {
    try {
      const res = await apiClient.post(`/api/guilds/${guildId}/wiki`, { title, content, category });
      set((s) => ({ wikiPages: [res.data, ...s.wikiPages] }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Sayfa oluşturulamadı.' };
    }
  },
  updateWikiPage: async (pageId, data) => {
    try {
      const res = await apiClient.patch(`/api/wiki/${pageId}`, data);
      set((s) => ({ wikiPages: s.wikiPages.map((p) => p.id === pageId ? res.data : p) }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Güncelleme başarısız.' };
    }
  },
  deleteWikiPage: async (pageId) => {
    try {
      await apiClient.delete(`/api/wiki/${pageId}`);
      set((s) => ({ wikiPages: s.wikiPages.filter((p) => p.id !== pageId) }));
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  },

  // ─── ZAMANLANMIŞ MESAJLAR ──────────────
  scheduledMessages: [],
  fetchScheduled: async (channelId) => {
    try {
      const res = await apiClient.get(`/api/channels/${channelId}/scheduled`);
      set({ scheduledMessages: res.data });
    } catch (err) { console.error(err); }
  },
  createScheduledMessage: async (channelId, content, scheduledAt) => {
    try {
      const res = await apiClient.post(`/api/channels/${channelId}/scheduled`, { content, scheduled_at: scheduledAt });
      set((s) => ({ scheduledMessages: [...s.scheduledMessages, res.data] }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Zamanlama başarısız.' };
    }
  },
  deleteScheduledMessage: async (msgId) => {
    try {
      await apiClient.delete(`/api/scheduled/${msgId}`);
      set((s) => ({ scheduledMessages: s.scheduledMessages.filter((m) => m.id !== msgId) }));
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  },
}));

export default useGuildStore;
