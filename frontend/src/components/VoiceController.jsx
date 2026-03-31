import React, { useEffect, useRef } from 'react';
import { Volume2, Phone, Mic, MicOff, Headphones, LogOut, Video, Monitor, Zap } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { useVoice } from '../context/VoiceContext';

// ─── Video Görünüm Yardımcıları ──────────────────────────
export function LocalVideoView({ stream }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />;
}

export function RemoteVideoView({ stream }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);
  return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />;
}

export function RemoteAudio({ stream, volume, muted }) {
  const audioRef = useRef(null);
  useEffect(() => {
    if (audioRef.current && stream) audioRef.current.srcObject = stream;
  }, [stream]);
  
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  return <audio ref={audioRef} autoPlay muted={muted} className="hidden" />;
}

export function VoiceUserCard({ user, isLocal, stream, isSpeaking, isScreen, isMuted, isDeafened: memberDeafened }) {
  const { soundVolume, isDeafened: localDeafened } = useVoice();
  const hasVideo = !!stream && stream.getVideoTracks().length > 0;
  
  return (
    <div className={`voice-card ${isSpeaking ? 'animate-speak' : 'border-white/5 bg-[var(--bg-mid)]/40 hover:bg-[var(--bg-mid)]/80'}`}>
       {/* Remote Audio is now managed globally in MainApp.jsx to prevent echo */}

       {hasVideo ? (
         <div className="w-full h-full relative group">
            {isLocal ? <LocalVideoView stream={stream} /> : <RemoteVideoView stream={stream} />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2.5 bg-black/60 backdrop-blur-2xl px-3.5 py-1.5 rounded-xl border border-white/10 transition-transform group-hover:scale-105 shadow-2xl">
               <span className="text-white text-[12px] font-black uppercase tracking-tighter shadow-sm">{user.displayName || user.username || user.display_name}</span>
               {isScreen && (
                 <div className="flex items-center gap-1.5 bg-[var(--danger)] text-white px-2 py-0.5 rounded-lg text-[9px] font-black animate-pulse shadow-glow">
                    <Zap className="w-3 h-3 fill-current" />
                    <span>YAYINDA</span>
                 </div>
               )}
            </div>
         </div>
       ) : (
         <div className="flex flex-col items-center gap-6 animate-scale-in">
            <div className="relative group/avatar">
               <div className="absolute -inset-4 bg-[var(--accent-primary)]/5 rounded-full blur-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500" />
               <UserAvatar 
                 src={user.avatarUrl || user.avatar_url} 
                 name={user.displayName || user.username || user.display_name} 
                 size="w-32 h-32" 
                 className={`relative z-10 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:scale-105 ${isSpeaking ? 'ring-4 ring-[var(--accent-primary)] ring-offset-4 ring-offset-[var(--bg-mid)]' : 'border-white/5'}`} 
               />
               {(isMuted || memberDeafened) && (
                 <div className="absolute -bottom-1 -right-1 bg-[var(--danger)] p-2.5 rounded-full border-[4px] border-[var(--bg-mid)] shadow-2xl z-20">
                   {memberDeafened ? <Headphones className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
                 </div>
               )}
            </div>
            <div className="flex flex-col items-center gap-1">
               <span className="text-white font-black text-[16px] uppercase tracking-tighter drop-shadow-xl">{user.displayName || user.username || user.display_name}</span>
               {isSpeaking && <span className="text-[10px] text-[var(--accent-primary)] font-black uppercase tracking-[0.2em] animate-pulse">Vıklıyor...</span>}
            </div>
         </div>
       )}
    </div>
  );
}

export function VoiceStatusBar({ channel, onLeave, isMuted, onToggleMute, isDeafened, onToggleDeafen, isVideoOn, onToggleCamera, isScreenOn, onToggleScreen, onTitleClick }) {
  if (!channel) return null;
  return (
    <div className="bg-[var(--bg-darker)]/40 backdrop-blur-md px-3 py-2 flex flex-col gap-2 border-b border-white/5 mx-2 mb-2 rounded-xl shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col min-w-0 cursor-pointer hover:opacity-80 transition" onClick={() => onTitleClick?.()}>
          <div className="flex items-center gap-1.5 text-[var(--accent-primary)] font-bold text-[12px] leading-tight select-none uppercase tracking-tighter">
             <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse shadow-[0_0_8px_var(--accent-primary)]" />
             <span>Ses Bağlantısı Kuruldu</span>
          </div>
          <div className="text-[var(--text-secondary)] text-[10px] truncate leading-tight select-none font-black uppercase tracking-widest">{channel.name} / {channel.guild_name || 'Sunucu'}</div>
        </div>
        <div className="flex gap-1.5 items-center">
            <button onClick={() => onLeave?.()} title="Bağlantıyı Kes"
                className="pixel-btn !bg-red-500/10 !text-red-500 hover:!bg-red-500 hover:!text-white !p-2 rounded-xl transition-all group border-red-500/20 shadow-lg">
                <LogOut className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-1.5"> 
        <button onClick={() => onToggleCamera?.()} 
            className={`flex items-center justify-center p-2 rounded-lg transition-all ${isVideoOn ? "bg-[var(--accent-primary)] text-white shadow-[0_0_12px_rgba(88,101,242,0.4)]" : "bg-black/10 text-[var(--text-secondary)] hover:bg-black/30 hover:text-white"}`}> 
            <Video className="w-4 h-4" /> 
        </button> 
        <button onClick={() => onToggleScreen?.()} 
            className={`flex items-center justify-center p-2 rounded-lg transition-all ${isScreenOn ? "bg-[var(--accent-primary)] text-white shadow-[0_0_12px_rgba(35,165,89,0.4)]" : "bg-black/10 text-[var(--text-secondary)] hover:bg-black/30 hover:text-white"}`}> 
            <Monitor className="w-4 h-4" /> 
        </button> 
        <button onClick={() => onToggleMute?.()} 
            className={`flex items-center justify-center p-2 rounded-lg transition-all ${isMuted ? "bg-red-500/20 text-red-500" : "bg-black/10 text-[var(--text-secondary)] hover:bg-black/30 hover:text-white"}`}> 
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />} 
        </button> 
        <button onClick={() => onToggleDeafen?.()} 
            className={`flex items-center justify-center p-2 rounded-lg transition-all ${isDeafened ? "bg-red-500/20 text-red-500" : "bg-black/10 text-[var(--text-secondary)] hover:bg-black/30 hover:text-white"}`}> 
            <Headphones className="w-4 h-4" /> 
        </button> 
      </div> 
    </div> 
  ); 
}
