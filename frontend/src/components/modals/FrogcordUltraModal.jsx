import React, { useState, useEffect, useRef } from 'react';
import { Signal, Mic, MicOff, Headphones, Phone, Settings, MessageSquare, Hash, Plus, Users, Paperclip, Gamepad, Home, User, Volume1, Volume2, X, Trash2, LogOut, Link, Frown, Check, CheckSquare, Clipboard, Zap, ArrowLeft, Video, Monitor, ChevronDown, Search, MessageCircle, Code, ShieldCheck, Lock } from 'lucide-react';
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

export default // ─── Frogcord Ultra Modal (Nitro-like) ────────────────────────────
function FrogcordUltraModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="premium-glass w-full max-w-lg shadow-[0_0_80px_rgba(88,101,242,0.4)] overflow-hidden relative animate-fade-up">
        {/* Header with Principles Gradient */}
        <div className="h-44 bg-gradient-to-br from-[#121512] via-[#22c55e] to-[#0b0d0b] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="mesh-container opacity-30 pointer-events-none">
                <div className="mesh-blob bg-[#22c55e] top-[-50%] left-[-50%]"></div>
            </div>
            
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)] relative z-10 transition-transform group-hover:scale-105">
               <ShieldCheck className="w-10 h-10 text-[var(--accent-primary)] animate-pulse" /> FROGCORD ULTRA
            </h2>
            <p className="text-[10px] font-black text-white/90 uppercase tracking-[0.25em] mt-3 bg-black/40 px-5 py-2 rounded-lg border border-white/5 relative z-10 shadow-2xl">Özgürlüğü ve Mahremiyeti Destekle</p>
        </div>

        <div className="p-10 pt-8">
            <div className="flex flex-col gap-8">
                {[
                  { icon: ShieldCheck, color: '#22c55e', title: 'Ultra Mahremiyet', desc: 'Hiçbir veri toplanmaz, gölde sadece senin izlerin kalır.' },
                  { icon: Lock, color: '#22c55e', title: 'E2EE Vık-Şifreleme', desc: 'Uçtan uca şifreli ses kanallarıyla maksimum güvenlik.' },
                  { icon: Code, color: '#22c55e', title: 'Açık Kaynak Destekçisi', desc: 'Özgür yazılımın gelişmesine katkıda bulunan özel rozet.' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-5 group/item transition-all hover:translate-x-1">
                    <div className="p-3.5 bg-black/40 border border-white/5 group-hover/item:border-[var(--accent-primary)]/40 transition shadow-glow" style={{ color: item.color }}>
                        <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-widest">{item.title}</p>
                        <p className="text-[9px] text-[var(--text-secondary)] uppercase tracking-tight font-bold opacity-60 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-12 flex flex-col gap-4">
                <button 
                  onClick={() => alert("FrogCord Özgürdür! Geliştirici modunda bu özellik senin için aktif. 🐸🛡️")}
                  className="w-full py-5 bg-[var(--accent-primary)] text-black font-black uppercase text-[11px] tracking-[0.3em] hover:bg-white hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] active:scale-[0.98] transition-all shadow-2xl group flex items-center justify-center gap-2"
                >
                    <Zap className="w-4 h-4 fill-black" />
                    <span className="group-hover:tracking-[0.4em] transition-all">DESTEKLE (AYDA ₺49.99)</span>
                </button>
                <div className="flex items-center justify-center gap-6 opacity-30">
                    <p className="text-[8px] font-black uppercase tracking-widest">Açık Kaynak</p>
                    <p className="text-[8px] font-black uppercase tracking-widest">•</p>
                    <p className="text-[8px] font-black uppercase tracking-widest">İz Yok</p>
                    <p className="text-[8px] font-black uppercase tracking-widest">•</p>
                    <p className="text-[8px] font-black uppercase tracking-widest">Özgürlük</p>
                </div>
                <button onClick={onClose} className="w-full py-2 text-[var(--text-secondary)] hover:text-white transition text-[9px] uppercase font-black tracking-widest opacity-40 hover:opacity-100">Daha Sonra Belki</button>
            </div>
        </div>

        {/* Closing Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white hover:rotate-90 transition duration-300 z-50">
            <X className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}

