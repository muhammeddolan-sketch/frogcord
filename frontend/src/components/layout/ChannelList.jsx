import React from 'react';
import { Hash, ChevronDown } from 'lucide-react';
import { resolveUrl } from '../../utils';
import QuickAddChannel from './QuickAddChannel';
import VoiceSidebarItem from './VoiceSidebarItem';

export default // ─── Kanal Listesi (Guild Seçiliyken) ──────────────────────────
function ChannelList({ channels, activeChannel, onChannelSelect, onShowGuildSettings, guildId, user, voiceUsersGlobal, globalOthersSpeak, activeGuild, voiceSpeaking }) {
  // Kanalları tiplerine göre grupla
  const textChannels = (channels || []).filter(c => c.channel_type === 'text' || !c.channel_type);
  const voiceChannels = (channels || []).filter(c => c.channel_type === 'voice');

  return (
    <div className="flex flex-col gap-5 px-2">
      {/* Metin Kanalları */}
      <div>
        <div className="flex items-center justify-between px-2 mb-1 group">
          <span className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-white cursor-pointer flex items-center gap-1">
            <ChevronDown className="w-3 h-3" /> Metin Kanalları
          </span>
          <QuickAddChannel guildId={guildId} type="text" />
        </div>
        <div className="flex flex-col gap-0.5">
          {textChannels.map(ch => (
            <button 
              key={ch.id}
              onClick={() => onChannelSelect(ch)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition-all font-medium text-[14px] group ${activeChannel?.id === ch.id ? 'bg-[var(--bg-hover)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
              <Hash className="w-5 h-5 opacity-40 group-hover:opacity-100" />
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ses Kanalları */}
      <div>
        <div className="flex items-center justify-between px-2 mb-1 group">
          <span className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-white cursor-pointer flex items-center gap-1">
            <ChevronDown className="w-3 h-3" /> Ses Kanalları
          </span>
          <QuickAddChannel guildId={guildId} type="voice" />
        </div>
        <div className="flex flex-col gap-0.5">
          {voiceChannels.map(ch => (
            <VoiceSidebarItem 
              key={ch.id}
              channel={ch}
              user={user}
              onJoin={onChannelSelect}
              activeChannelId={activeChannel?.id}
              voiceUsersGlobal={voiceUsersGlobal}
              globalOthersSpeak={globalOthersSpeak}
              activeGuild={activeGuild}
              voiceSpeaking={voiceSpeaking}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DM Listesi (Home Seçiliyken) ──────────────────────────────
