const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// Çevrimiçi kullanıcı takibi: { userId -> { userData, socketIds: [] } }
const onlineUsers = new Map();
const voiceUsers = {}; // Ses kanalı durumlarını tutmak için

io.on("connection", (socket) => {
  console.log(`Bağlandı: ${socket.id}`);

  // Kullanıcı kimlik bilgilerini kaydet + herkese bildir
  socket.on("user_connected", (userData) => {
    const userId = userData.userId;
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, { ...userData, socketIds: [] });
    } else {
      // Kullanıcı verilerini güncelle (isim, avatar, banner rengi vs. değişmiş olabilir)
      const existing = onlineUsers.get(userId);
      onlineUsers.set(userId, { ...existing, ...userData });
    }
    const userState = onlineUsers.get(userId);
    if (!userState.socketIds.includes(socket.id)) {
        userState.socketIds.push(socket.id);
    }
    // Sadece kullanıcı verilerini (userData) gönder (socketIds hariç)
    const uniqueUsers = Array.from(onlineUsers.values()).map(({ socketIds, ...user }) => user);
    io.emit("online_users", uniqueUsers);
  });

  // Kanala katıl
  socket.on("join_channel", (channelId) => {
    socket.rooms.forEach((room) => { if (room !== socket.id) socket.leave(room); });
    socket.join(`channel_${channelId}`);
  });

  // Sesli kanala katıl
  socket.on("voice_join", (data) => {
    if (!voiceUsers[data.channelId]) voiceUsers[data.channelId] = [];
    voiceUsers[data.channelId] = voiceUsers[data.channelId].filter((u) => u.userId !== data.userId);
    voiceUsers[data.channelId].push({ ...data, socketId: socket.id, muted: false });
    io.emit("voice_users", Object.entries(voiceUsers).flatMap(([chId, users]) => users.map((u) => ({ ...u, channelId: parseInt(chId) }))));
  });

  socket.on("voice_leave", (data) => {
    if (voiceUsers[data.channelId]) {
      voiceUsers[data.channelId] = voiceUsers[data.channelId].filter((u) => u.userId !== data.userId);
    }
    io.emit("voice_users", Object.entries(voiceUsers).flatMap(([chId, users]) => users.map((u) => ({ ...u, channelId: parseInt(chId) }))));
  });

  socket.on("voice_status", (data) => {
    if (voiceUsers[data.channelId]) {
      const u = voiceUsers[data.channelId].find((u) => u.userId === data.userId);
      if (u) {
        if (data.muted !== undefined) u.muted = data.muted;
        if (data.deafened !== undefined) u.deafened = data.deafened;
      }
    }
    io.emit("voice_users", Object.entries(voiceUsers).flatMap(([chId, users]) => users.map((u) => ({ ...u, channelId: parseInt(chId) }))));
  });

  // Konuşma tespiti (Web Audio API tarafından tetiklenir)
  socket.on("voice_speaking", ({ channelId, userId, speaking }) => {
    socket.to(`channel_${channelId}`).emit("user_speaking", { userId, speaking });
  });

  socket.on("send_message", (data) => {
    socket.to(`channel_${data.channel_id}`).emit("receive_message", data);
  });

  // WebRTC Signaling
  socket.on("webrtc_offer", (data) => {
    // data: { to: socketId, offer: SDP, from: userId, channelId: number }
    socket.to(data.to).emit("webrtc_offer", {
      from: socket.id,
      offer: data.offer,
      userId: data.from,
      channelId: data.channelId
    });
  });

  socket.on("webrtc_answer", (data) => {
    // data: { to: socketId, answer: SDP }
    socket.to(data.to).emit("webrtc_answer", {
      from: socket.id,
      answer: data.answer
    });
  });

  socket.on("webrtc_ice_candidate", (data) => {
    // data: { to: socketId, candidate: ICE }
    socket.to(data.to).emit("webrtc_ice_candidate", {
      from: socket.id,
      candidate: data.candidate
    });
  });

  // Yazıyor... animasyonu
  socket.on("typing_start", ({ channelId, username }) => {
    socket.to(`channel_${channelId}`).emit("user_typing", { username, channelId });
  });
  socket.on("typing_stop", ({ channelId, username }) => {
    socket.to(`channel_${channelId}`).emit("user_stopped_typing", { username, channelId });
  });

  // Arkadaşlık sistemi eventleri
  socket.on("friend_request_sent", ({ targetUserId, request }) => {
    const targetState = onlineUsers.get(targetUserId);
    if (targetState) {
      targetState.socketIds.forEach(id => {
        io.to(id).emit("friend_request_received", request);
      });
    }
  });

  socket.on("friend_request_accepted", ({ targetUserId, friend }) => {
    const targetState = onlineUsers.get(targetUserId);
    if (targetState) {
      targetState.socketIds.forEach(id => {
        io.to(id).emit("friend_request_accepted_notify", friend);
      });
    }
  });

  socket.on("disconnect", () => {
    let userToRemove = null;
    for (const [userId, userState] of onlineUsers.entries()) {
      const socketIndex = userState.socketIds.indexOf(socket.id);
      if (socketIndex !== -1) {
        userState.socketIds.splice(socketIndex, 1);
        if (userState.socketIds.length === 0) {
          userToRemove = userId;
        }
        break;
      }
    }
    
    if (userToRemove) {
      onlineUsers.delete(userToRemove);
    }
    
    const uniqueUsers = Array.from(onlineUsers.values()).map(({ socketIds, ...user }) => user);
    io.emit("online_users", uniqueUsers);

    // Ses kanalından çıkar
    Object.keys(voiceUsers).forEach((chId) => {
      voiceUsers[chId] = voiceUsers[chId].filter((u) => u.socketId !== socket.id);
    });
    io.emit("voice_users", Object.entries(voiceUsers).flatMap(([chId, users]) => users.map((u) => ({ ...u, channelId: parseInt(chId) }))));

    console.log(`Ayrıldı: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => console.log(`Socket.IO Sunucusu ${PORT} portunda çalışıyor 🐸`));
