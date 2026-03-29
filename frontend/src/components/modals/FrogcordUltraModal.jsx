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

export default // ─── Frogcord Ultra Modal (Nitro-like) ────────────────────────────
function FrogcordUltraModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="premium-glass w-full max-w-lg shadow-[0_0_80px_rgba(88,101,242,0.4)] overflow-hidden relative animate-fade-up">
        {/* Header with Premium Gradient */}
        <div className="h-40 bg-gradient-to-br from-[#5865f2] via-[#eb459e] to-[#7209b7] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity"></div>
            <div className="mesh-container opacity-20 pointer-events-none">
                <div className="mesh-blob bg-white top-[-50%] left-[-50%]"></div>
            </div>
            
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3 drop-shadow-2xl relative z-10 transition-transform group-hover:scale-105">
               <Zap className="w-10 h-10 text-yellow-300 fill-yellow-300 animate-pulse" /> FROGCORD ULTRA
            </h2>
            <p className="text-[11px] font-black text-white/90 uppercase tracking-[0.3em] mt-2 bg-black/20 px-4 py-1.5 rounded-full relative z-10">Gölün Efendisi Sen Ol!</p>
        </div>

        <div className="p-10 pt-8">
            <div className="flex flex-col gap-6">
                {[
                  { icon: Zap, color: '#5865f2', title: 'Vık-Yüksek Performans', desc: 'Tüm kanalları anında ön yükle, gecikmeyi vık-vıkla.' },
                  { icon: MessageSquare, color: '#eb459e', title: 'Özel Vıkmoji & Rozet', desc: 'İsminin yanında parlayan kurbağa rozeti ve özel emojiler.' },
                  { icon: Paperclip, color: 'rgb(250 204 21)', title: '100MB Vık-Yükleme', desc: 'Devasa dosyaları göle her zamankinden daha hızlı gönder.' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-5 group/item transition-transform hover:translate-x-1">
                    <div className="p-3.5 bg-black/30 border border-white/10 group-hover/item:border-white/30 transition shadow-inner" style={{ color: item.color }}>
                        <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-wide">{item.title}</p>
                        <p className="text-[9px] text-[var(--text-secondary)] uppercase tracking-tight font-bold opacity-60 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-12 flex flex-col gap-4">
                <button 
                  onClick={() => alert("Geliştirici modunda bu özellik ücretsiz! 🐸✨")}
                  className="w-full py-5 bg-gradient-to-r from-[#5865f2] to-[#eb459e] text-white font-black uppercase text-[11px] tracking-[0.3em] hover:brightness-110 active:scale-[0.98] transition shadow-2xl shadow-[#5865f2]/40 group"
                >
                    <span className="group-hover:tracking-[0.4em] transition-all">Ultra'yı Kap (Ayda ₺49.99)</span>
                </button>
                <button onClick={onClose} className="w-full py-2 text-[var(--text-secondary)] hover:text-white transition text-[9px] uppercase font-black tracking-widest opacity-50 hover:opacity-100">Şimdilik Gerek Yok</button>
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

