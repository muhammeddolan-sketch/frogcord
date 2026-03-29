import React, { useState, useEffect, useRef } from 'react';
import { Signal, Mic, MicOff, Headphones, Phone, Settings, MessageSquare, Hash, Plus, Users, Paperclip, Gamepad, Home, User, Volume1, Volume2, X, Trash2, LogOut, Link, Frown, Check, CheckSquare, Clipboard, Zap, ArrowLeft, Video, Monitor, ChevronDown, Search, MessageCircle, Code } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useGuildStore from '../../store/guildStore';
import { useFriendStore } from '../../store/friendStore';
import useTaskStore from '../../store/taskStore';
import apiClient from '../../api/axiosClient';
import { socket } from '../../socket';
import UserAvatar from '../UserAvatar';
import { resolveUrl, formatTimeStr, renderInlineMarkdown } from '../../utils';
import { VoiceUserCard, VoiceStatusBar, LocalVideoView, RemoteVideoView } from '../VoiceController';
import { useVoice } from '../../context/VoiceContext';

export default // ─── Ses Kanalı (Yandan Görünüm UI) ──────────────────────────
function VoiceSidebarItem({ channel, user, onJoin, activeChannelId, voiceUsersGlobal, globalOthersSpeak, activeGuild, voiceSpeaking }) {
  const users = voiceUsersGlobal.filter((u) => u.channelId === channel.id);
  const inVoice = users.some(u => u.userId === user?.id);
  const [contextMenu, setContextMenu] = useState(null);

  // Sunucu sahibi veya admin mi kontrol et
  const isOwner = activeGuild?.owner_id === user?.id;

  const handleContextMenu = (e, targetUser) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOwner || targetUser.userId === user?.id) return;
    setContextMenu({ x: e.clientX, y: e.clientY, target: targetUser });
  };

  const handleServerMute = (targetUser) => {
    const isMuted = targetUser.serverMuted;
    socket.emit('voice_server_mute', {
      targetUserId: targetUser.userId,
      channelId: channel.id,
      muted: !isMuted,
      byUserId: user.id
    });
    setContextMenu(null);
  };

  const handleServerDeafen = (targetUser) => {
    const isDeafened = targetUser.serverDeafened;
    socket.emit('voice_server_deafen', {
      targetUserId: targetUser.userId,
      channelId: channel.id,
      deafened: !isDeafened,
      byUserId: user.id
    });
    setContextMenu(null);
  };

  const handleDisconnect = (targetUser) => {
    socket.emit('voice_disconnect_user', {
      targetUserId: targetUser.userId,
      channelId: channel.id,
      byUserId: user.id
    });
    setContextMenu(null);
  };

  // Menü dışına tıklanınca kapat
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
    };
  }, [contextMenu]);

  return (
    <div className="flex flex-col mb-1">
      <div onClick={() => onJoin(channel)}
        className={`group flex items-center justify-between px-2 py-1.5 mx-2 rounded-md transition cursor-pointer ${inVoice ? 'bg-[#2b2d31] text-gray-200' : 'text-[#949ba4] hover:bg-[#1e1f22] hover:text-gray-200'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Volume2 className="w-5 h-5 text-[#80848e]" />
          <span className="truncate text-sm font-medium">{channel.name}</span>
        </div>
      </div>
      {users.length > 0 && (
        <div className="ml-9 flex flex-col gap-1.5 mt-1 mb-2">
          {users.map((u) => {
            const isSpeaking = (u.userId === user?.id ? voiceSpeaking : globalOthersSpeak[u.userId]) && !u.muted;
            return (
              <div key={u.userId}
                className="flex items-center gap-2 group/user cursor-default"
                onContextMenu={(e) => handleContextMenu(e, u)}>
                <div className={`relative w-6 h-6 rounded-full flex-shrink-0 transition-all ${isSpeaking ? 'sidebar-speaking-avatar' : ''}`}>
                  <img src={resolveUrl(u.avatarUrl)} alt="" className="w-full h-full rounded-full object-cover bg-[#2b2d31]" />
                </div>
                <span className={`text-sm truncate transition ${isSpeaking ? 'text-white' : 'text-[#949ba4] group-hover/user:text-gray-300'}`}>{u.username}</span>
                <div className="ml-auto flex items-center gap-1.5 pr-2">
                  {u.serverDeafened && <Headphones className="w-3.5 h-3.5 text-red-500" />}
                  {u.serverMuted && !u.serverDeafened && <MicOff className="w-3.5 h-3.5 text-red-500" />}
                  {!u.serverMuted && !u.serverDeafened && u.deafened && <Headphones className="w-3.5 h-3.5 opacity-70 text-red-400" />}
                  {!u.serverMuted && !u.serverDeafened && u.muted && !u.deafened && <MicOff className="w-3.5 h-3.5 opacity-70 text-red-400" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sağ Tık Menüsü */}
      {contextMenu && (
        <div
          className="fixed z-[9999] bg-[#111214] border border-[#2b2d31] rounded-lg shadow-2xl py-1.5 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-1.5 text-[10px] text-[#949ba4] font-bold uppercase tracking-wider truncate border-b border-[#2b2d31] mb-1">
            {contextMenu.target.username}
          </div>
          <button
            onClick={() => handleServerMute(contextMenu.target)}
            className="w-full px-3 py-2 text-left text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white transition flex items-center gap-2.5 group">
            {contextMenu.target.serverMuted ? (
              <><Mic className="w-4 h-4 text-[#23a559] group-hover:text-white" /> Susturmayı Kaldır</>
            ) : (
              <><MicOff className="w-4 h-4 text-[#f23f42] group-hover:text-white" /> Sustur</>
            )}
          </button>
          <button
            onClick={() => handleServerDeafen(contextMenu.target)}
            className="w-full px-3 py-2 text-left text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white transition flex items-center gap-2.5 group">
            {contextMenu.target.serverDeafened ? (
              <><Headphones className="w-4 h-4 text-[#23a559] group-hover:text-white" /> Sağırlaştırmayı Kaldır</>
            ) : (
              <><Headphones className="w-4 h-4 text-[#f23f42] group-hover:text-white" /> Sağırlaştır</>
            )}
          </button>
          <div className="h-px bg-[#2b2d31] my-1" />
          <button
            onClick={() => handleDisconnect(contextMenu.target)}
            className="w-full px-3 py-2 text-left text-sm text-[#f23f42] hover:bg-[#f23f42] hover:text-white transition flex items-center gap-2.5">
            <Phone className="w-4 h-4" /> Bağlantısını Kes
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sağ Panel: Üye Listesi ───────────────────────────────────
