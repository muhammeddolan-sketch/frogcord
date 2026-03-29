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

export default // ─── Hızlı Kanal Oluştur ─────────────────────────────────────
function QuickAddChannel({ guildId, type }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const { createChannel } = useGuildStore();
  const inputRef = useRef(null);

  const open = (e) => { e.stopPropagation(); setShow(true); setTimeout(() => inputRef.current?.focus(), 50); };
  const close = () => { setShow(false); setName(''); };
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await createChannel(guildId, name.trim().toLowerCase().replace(/\s+/g, '-'), type);
    if (res.success) {
      close();
    } else {
      alert("Hata: " + res.error);
    }
  };

  return (
    <>
      <button onClick={open} title={`${type === 'voice' ? 'Ses' : 'Metin'} kanalı ekle`}
        className="ml-auto text-[#80848e] hover:text-gray-200 transition flex items-center justify-center p-1"><Plus className="w-4 h-4" /></button>
      {show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={close}>
          <div className="bg-[#17181a] border border-[#2b2d31] rounded-xl w-72 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-200 font-semibold mb-3 flex items-center gap-2">
              {type === 'voice' ? <Volume2 className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
              {type === 'voice' ? 'Ses' : 'Metin'} Kanalı Oluştur
            </p>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <input ref={inputRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="kanal-adı" required
                className="bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2.5 text-gray-200 placeholder-[#80848e] focus:outline-none focus:border-[#5865f2] text-sm transition" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={close} className="px-3 py-1.5 text-[#949ba4] hover:text-gray-200 text-sm">İptal</button>
                <button type="submit" className="px-4 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-md text-sm font-medium">Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Guild Oluştur / Katıl Modal ──────────────────────────────
