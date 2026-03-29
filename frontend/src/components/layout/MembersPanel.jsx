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

export default // ─── Sağ Panel: Üye Listesi ───────────────────────────────────
function MembersPanel({ onlineUsers, currentUser, onUserClick, activeGuild }) {
  const [width, setWidth] = useState(() => parseInt(localStorage.getItem('rightPanelWidth') || '240', 10));
  const members = activeGuild?.members || [];
  
  // Üyeleri durumlarına göre ayır
  const online = members.filter(m => onlineUsers.some(ou => ou.userId === (m.user_id || m.id || m.user?.id)));
  const offline = members.filter(m => !onlineUsers.some(ou => ou.userId === (m.user_id || m.id || m.user?.id)));

  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMouseMove = (moveEvent) => {
      const w = Math.max(200, Math.min(480, startWidth - (moveEvent.clientX - startX)));
      setWidth(w);
      localStorage.setItem('rightPanelWidth', w.toString());
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const renderMember = (m, isOnline) => {
    const u = m.user || m;
    const isMe = u.id === currentUser?.id;
    return (
      <div key={m.id || m.user_id} 
        className={`flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-[var(--bg-hover)] transition-all group rounded-md ${!isOnline ? 'opacity-35 grayscale-[0.6] hover:opacity-100 hover:grayscale-0' : ''}`}
        onClick={(e) => onUserClick?.(e, u)}>
        <div className="relative flex-shrink-0">
          <UserAvatar src={u.avatar_url} name={u.display_name || u.username} size="w-8 h-8" />
          {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--accent-primary)] border-[2.5px] border-[var(--bg-mid)] rounded-full shadow-sm" />}
        </div>
        <div className="flex flex-col min-w-0">
          <span className={`text-[13px] font-bold truncate ${isOnline ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors'}`}>
            {u.display_name || u.username}
          </span>
          {u.custom_status && isOnline && (
            <span className="text-[10px] text-[var(--text-muted)] truncate italic leading-tight">"{u.custom_status}"</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex-shrink-0 h-full flex flex-col bg-[var(--bg-mid)] border-l border-[var(--border-pixel)] shadow-[-2px_0_10px_rgba(0,0,0,0.2)] z-10" style={{ width: `${width}px` }}>
      <div className="absolute left-[-1px] top-0 bottom-0 w-[1px] cursor-col-resize hover:bg-[var(--accent-primary)] z-50 transition" onMouseDown={startResize} />
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--bg-hover)] p-2 pt-4 flex flex-col gap-6">
        {online.length > 0 && (
          <div>
            <h3 className="px-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center justify-between">
               <span>Çevrimiçi — {online.length}</span>
            </h3>
            <div className="flex flex-col gap-0.5">
              {online.map(m => renderMember(m, true))}
            </div>
          </div>
        )}
        {offline.length > 0 && (
          <div>
            <h3 className="px-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Çevrimdışı — {offline.length}</h3>
            <div className="flex flex-col gap-0.5">
              {offline.map(m => renderMember(m, false))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Frogcord Ultra Modal (Nitro-like) ────────────────────────────
