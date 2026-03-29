import { Volume2, Video, Monitor, PhoneOff, Zap } from 'lucide-react';
import { VoiceUserCard } from './VoiceController';
import { useVoice } from '../context/VoiceContext';

export function VoiceChannelView({ channel, user }) {
  const {
    currentVoiceChannel,
    voiceUsers: voiceMembers,
    joinVoice,
    leaveVoice: onLeave,
    toggleMute: onToggleMute,
    toggleDeafen: onToggleDeafen,
    toggleCamera: onToggleCamera,
    toggleScreen: onToggleScreen,
    isMuted,
    isDeafened,
    isVideoOn: isCameraOn,
    isScreenOn: isScreenSharing,
    speaking: voiceSpeaking,
    othersSpeak: voiceOthersSpeak,
    localStream,
    localVideoStream: videoStream,
    localScreenStream: screenStream,
    remoteStreams,
    voiceUsersGlobal
  } = useVoice();

  const isJoined = currentVoiceChannel?.id === channel.id;
  const channelMembers = voiceUsersGlobal.filter((u) => String(u.channelId) === String(channel.id));
  const visibleMembers = channelMembers.filter(m => m.userId !== user?.id);
  const totalUsers = (isJoined ? 1 : 0) + visibleMembers.length;

  let gridClass = "w-full h-full grid gap-4 p-6 place-items-center place-content-center transition-all duration-300 ";
  if (totalUsers <= 1) gridClass += "grid-cols-1 w-full max-w-2xl mx-auto min-h-[40vh]";
  else if (totalUsers === 2) gridClass += "grid-cols-1 md:grid-cols-2 w-full max-w-5xl mx-auto";
  else if (totalUsers <= 4) gridClass += "grid-cols-2 w-full max-w-5xl mx-auto";
  else if (totalUsers <= 9) gridClass += "grid-cols-3 w-full";
  else gridClass += "grid-cols-4 w-full";

  const onJoin = () => {
    joinVoice(channel);
  };

  return (
    <div className="flex-1 bg-[var(--bg-dark)] flex flex-col h-full overflow-hidden animate-fade-in relative selection:bg-[var(--accent-primary)]/20 shadow-inner">
      {/* Minimal Header */}
      <div className="h-12 flex items-center justify-between px-4 bg-[var(--bg-dark)] border-b border-[var(--border-pixel)] z-50">
        <div className="flex items-center gap-2">
          <Volume2 className={`w-4 h-4 ${isJoined ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
          <h2 className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">{channel.name}</h2>
          <div className="w-[1px] h-3 bg-[var(--border-pixel)] mx-1" />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            {isJoined ? `${channelMembers.length} Sakin` : `${channelMembers.length} Vık-vık`}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
           {isJoined && (
             <div className="flex items-center gap-1.5 p-1 bg-black/10 rounded-lg border border-white/5">
               <button 
                  onClick={onToggleCamera} 
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${isCameraOn ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'}`} 
                  title="Kamera"
               >
                  {isCameraOn ? 'Kamerayı Kapat' : 'Kamera'}
               </button>
               <button 
                  onClick={onToggleScreen} 
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${isScreenSharing ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'}`} 
                  title="Ekran Paylaş"
               >
                  {isScreenSharing ? 'Yayını Durdur' : 'Ekran'}
               </button>
               <button 
                  onClick={onLeave} 
                  className="px-3 py-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-[10px] uppercase tracking-widest border border-red-500/20 hover:border-transparent" 
                  title="Ayrıl"
               >
                  Ayrıl
               </button>
             </div>
           )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex items-center justify-center p-8 relative">
        <div className={gridClass}>
          {isJoined && (
            <VoiceUserCard 
              user={user} 
              isLocal={true} 
              stream={isScreenSharing ? screenStream : (isCameraOn ? videoStream : null)} 
              isSpeaking={voiceSpeaking}
              isScreen={isScreenSharing}
              isMuted={isMuted}
              isDeafened={isDeafened}
            />
          )}
          
          {visibleMembers.map(m => (
            <VoiceUserCard 
              key={m.userId} 
              user={m} 
              stream={remoteStreams[m.socketId]} 
              isSpeaking={voiceOthersSpeak[m.userId]} 
              isMuted={m.muted || m.serverMuted}
              isDeafened={m.deafened || m.serverDeafened}
            />
          ))}

          {!isJoined && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center animate-fade-in group w-full bg-[var(--bg-mid)]/30 rounded-3xl border border-[var(--border-subtle)]">
               <div className="w-24 h-24 bg-[var(--bg-mid)] rounded-full flex items-center justify-center mb-8 border border-[var(--border-pixel)] transition-all duration-500 group-hover:scale-110 group-hover:bg-[var(--bg-light)] shadow-lg">
                  <Volume2 className="w-12 h-12 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
               </div>

               <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">Göl Kenarı Hazır 🐸</h3>
               <p className="text-sm text-[var(--text-muted)] mb-10 max-w-[340px] leading-relaxed">
                 Sessizliği bozmak ve sakinlerle vık-vıklamak için odaya katılın.
               </p>

               <button 
                  onClick={onJoin} 
                  className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white px-12 py-3 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95"
               >
                  Odaya Katıl
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
