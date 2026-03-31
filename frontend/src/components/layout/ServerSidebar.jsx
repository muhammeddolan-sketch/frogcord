import React, { useState, useEffect, useRef } from 'react';
import { Signal, Mic, MicOff, Headphones, Phone, Settings, MessageSquare, Hash, Plus, Users, Paperclip, Gamepad, Home, User, Volume1, Volume2, X, Trash2, LogOut, Link, Frown, Check, CheckSquare, Clipboard, Zap, ArrowLeft, Video, Monitor, ChevronDown, Search, MessageCircle, Code, ShieldCheck } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useGuildStore from '../../store/guildStore';
import { useFriendStore } from '../../store/friendStore';
import useTaskStore from '../../store/taskStore';
import apiClient from '../../api/axiosClient';
import { socket } from '../../socket';
import UserAvatar from '../UserAvatar';
import { resolveUrl, formatTimeStr, renderInlineMarkdown } from '../../utils.js';
import { VoiceUserCard, VoiceStatusBar, LocalVideoView, RemoteVideoView } from '../VoiceController';
import { useVoice } from '../../context/VoiceContext';

export default // ─── Sunucu Sidebar (Soldaki Dikey Çubuk) ──────────────────────
function ServerSidebar({ guilds, activeGuild, onGuildSelect, onShowModal, onShowUltra, onHomeClick }) {
  return (
    <div className="w-[72px] bg-[var(--bg-darker)] flex flex-col items-center py-3 gap-2 flex-shrink-0 z-50 overflow-hidden">
      {/* Home / DM Button */}
      <button 
        onClick={onHomeClick}
        className={`group relative flex items-center justify-center w-12 h-12 transition-all duration-300 ${!activeGuild ? 'rounded-[16px] bg-[var(--accent-primary)] text-white' : 'rounded-[24px] bg-[var(--bg-mid)] text-[var(--accent-primary)] hover:rounded-[16px] hover:bg-[var(--accent-primary)] hover:text-white'}`}>
        <Home className="w-6 h-6" />
        <div className="absolute left-[-15px] w-2 h-5 bg-white rounded-r-lg transition-all scale-y-0 origin-left group-hover:scale-y-100" style={{ transform: !activeGuild ? 'scaleY(1)' : '' }} />
      </button>

      <div className="w-8 h-[2px] bg-white/10 mx-auto my-1" />

      {/* Guild List */}
      <div className="flex flex-col gap-2 overflow-y-auto items-center pb-2 flex-1 scrollbar-hide w-full px-2">
        {guilds.map(g => (
          <button 
            key={g.id}
            onClick={() => onGuildSelect(g)}
            title={g.name}
            className={`group relative flex items-center justify-center w-12 h-12 transition-all duration-300 overflow-hidden flex-shrink-0 ${activeGuild?.id === g.id ? 'rounded-[16px]' : 'rounded-[24px] hover:rounded-[16px]'}`}>
            {g.icon_url ? (
              <img src={resolveUrl(g.icon_url)} alt={g.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-sm font-bold bg-[var(--bg-mid)] transition-colors ${activeGuild?.id === g.id ? 'bg-[var(--accent-primary)] text-white' : 'group-hover:bg-[var(--accent-primary)] group-hover:text-white'}`}>
                {g.name[0].toUpperCase()}
              </div>
            )}
            <div className={`absolute left-[-15px] w-2 h-5 bg-white rounded-r-lg transition-all origin-left ${activeGuild?.id === g.id ? 'scale-y-[1.6]' : 'scale-y-0 group-hover:scale-y-100'}`} />
          </button>
        ))}
        
        {/* Add Guild Button */}
        <button 
          onClick={onShowModal}
          className="group relative flex items-center justify-center w-12 h-12 rounded-[24px] bg-[var(--bg-mid)] text-[var(--accent-primary)] hover:rounded-[16px] hover:bg-[#248046] hover:text-white transition-all duration-300 flex-shrink-0">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Support / Ultra Button */}
      <div className="w-8 h-[2px] bg-white/10 mx-auto my-1" />
      <button 
        onClick={onShowUltra}
        title="Özgürlüğü Destekle"
        className="group relative flex items-center justify-center w-12 h-12 rounded-[24px] bg-[var(--bg-mid)] text-[var(--accent-primary)] hover:rounded-[16px] hover:bg-[var(--accent-primary)] hover:text-white transition-all duration-300 flex-shrink-0 shadow-glow hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]">
        <ShieldCheck className="w-6 h-6" />
        <div className="absolute left-[-15px] w-2 h-5 bg-[var(--accent-primary)] rounded-r-lg transition-all scale-y-0 origin-left group-hover:scale-y-100" />
      </button>
    </div>
  );
}

// ─── Kanal Listesi (Guild Seçiliyken) ──────────────────────────
