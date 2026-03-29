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

export default // ─── Guild Oluştur / Katıl Modal ──────────────────────────────
function GuildModal({ onClose }) {
  const [tab, setTab] = useState('create');
  const [guildName, setGuildName] = useState('');
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const { createGuild, joinGuild } = useGuildStore();

  const handleIconChange = (e) => { const f = e.target.files[0]; if (!f) return; setIconFile(f); setIconPreview(URL.createObjectURL(f)); };
  const handleCreate = async (e) => { e.preventDefault(); const res = await createGuild(guildName.trim(), '', iconFile); if (res.success) onClose(); else setError(res.error); };
  const handleJoin = async (e) => { e.preventDefault(); const res = await joinGuild(inviteCode.trim()); if (res.success) onClose(); else setError(res.error); };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--bg-dark)] border border-[var(--border-pixel)] w-full max-w-sm p-8 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1 uppercase tracking-widest">Gölünü Bul</h2>
        <p className="text-[var(--text-secondary)] text-[10px] mb-8 font-bold uppercase tracking-tight">Kendi gölünü kur veya bir vık-davetiyle katıl.</p>
        
        <div className="flex gap-1 mb-8">
          {['create', 'join'].map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2 text-[10px] font-bold uppercase transition flex items-center justify-center gap-2 border border-[var(--border-pixel)] ${tab === t ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-darker)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-light)]'}`}>
              {t === 'create' ? <Plus className="w-3 h-3" /> : <Link className="w-3 h-3" />}
              {t === 'create' ? 'Oluştur' : 'Katıl'}
            </button>
          ))}
        </div>

        {error && <div className="text-red-400 text-[10px] bg-red-500/10 border border-red-500/20 px-3 py-2 mb-6 font-bold uppercase tracking-wider">🚨 {error}</div>}
        
        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-6">
              <label className="relative cursor-pointer group block">
                <div className="w-20 h-20 bg-[var(--bg-darker)] border border-[var(--border-pixel)] overflow-hidden flex items-center justify-center text-[var(--text-secondary)]">
                  {iconPreview ? <img src={iconPreview} alt="icon" className="w-full h-full object-cover" /> : <Plus className="w-10 h-10" />}
                </div>
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <span className="text-white text-[9px] font-bold uppercase">LOGO SEÇ</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
              </label>
              
              <div className="w-full flex flex-col gap-2">
                <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Sunucu Adı</label>
                <input value={guildName} onChange={(e) => setGuildName(e.target.value)} placeholder="Harika Gölet" required
                  className="pixel-input w-full text-xs" />
              </div>
            </div>
            <button type="submit" className="pixel-btn-primary w-full py-3 uppercase text-[10px] font-bold tracking-widest">GÖLÜ OLUŞTUR</button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Davet Kodu</label>
              <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="vık-1234..." required
                className="pixel-input w-full text-xs" />
            </div>
            <button type="submit" className="pixel-btn-primary w-full py-3 uppercase text-[10px] font-bold tracking-widest bg-[var(--accent-secondary)]">GÖLE DAL</button>
          </form>
        )}

        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white transition">
          <span className="text-xl">×</span>
        </button>
      </div>
    </div>
  );
}

// VoiceChannelView moved to components/VoiceChannelView.jsx


// ─── Ses Kanalı (Yandan Görünüm UI) ──────────────────────────
