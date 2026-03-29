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

export default // ─── DM Listeleri (Home Seçiliyken) ──────────────────────────────
function DMList({ friends, activeChannel, onSelectDM }) {
  return (
    <div className="flex flex-col gap-1 px-2">
      <div className="px-2">
         <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all font-bold text-[14px] mb-4 ${!activeChannel ? 'bg-[var(--bg-hover)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white'}`}>
            <Users className="w-6 h-6 opacity-80" />
            <span className="uppercase tracking-widest text-xs">Arkadaşlar</span>
         </button>
      </div>
      
      <div>
        <div className="flex items-center justify-between px-2 mb-2 group">
           <span className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">Direkt Mesajlar</span>
           <Plus className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex flex-col gap-0.5">
          {(friends || []).filter(f => f.status === 'accepted').map(f => {
            const friend = f.friend;
            return (
              <button 
                key={f.id}
                onClick={() => onSelectDM(friend.id)}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all group ${activeChannel?.dm_target_id === friend.id ? 'bg-[var(--bg-hover)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white'}`}>
                <UserAvatar src={friend.avatar_url} name={friend.display_name || friend.username} size="w-8 h-8" />
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="truncate text-[13px] font-bold">{friend.display_name || friend.username}</span>
                  <span className="text-[9px] truncate opacity-40 uppercase tracking-widest font-black text-left">Sohbet Başlat</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Mesaj Öğesi (Chat Area) ──────────────────────────────────
