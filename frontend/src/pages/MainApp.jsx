import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useGuildStore from '../store/guildStore';
import { useFriendStore } from '../store/friendStore';
import apiClient from '../api/axiosClient';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001');
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const resolveUrl = (url) => {
  if (!url || url === '/logo.png') return '/logo.png';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

const SOUNDS = {
  message: new Audio('https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3'), // Centered short pop
  join: new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'),
  leave: new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3'),
};

// ─── Profil Modal ─────────────────────────────────────────────
function ProfileModal({ user, onClose, soundVolume, setSoundVolume }) {
  const { updateProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(resolveUrl(user?.avatar_url));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setAvatarFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateProfile(displayName, avatarFile);
    setSaving(false);
    if (res.success) onClose(); else setError(res.error);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#17181a] border border-[#2b2d31] rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-100 mb-5">Profili Düzenle</h2>
        {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-4">{error}</div>}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer group">
              <img src={preview} alt="avatar" className="w-16 h-16 rounded-full object-cover bg-[#2b2d31]" />
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <span className="text-white text-xs font-bold">Değiştir</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            <div>
              <p className="text-gray-200 font-semibold">{user?.username}</p>
              <p className="text-[#80848e] text-xs">Avatara tıkla</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">Görünen Ad</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2.5 text-gray-200 focus:outline-none focus:border-[#5865f2] transition" />
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">Uygulama Sesi</label>
            <div className="flex items-center gap-3 bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2">
              <span className="text-lg text-[#80848e]">🔈</span>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={soundVolume} 
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSoundVolume(val);
                  localStorage.setItem('soundVolume', val);
                }}
                className="w-full accent-[#5865f2] h-1.5 bg-[#4e5058] rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-lg text-[#80848e]">🔊</span>
            </div>
            <div className="text-xs text-[#80848e] text-right mt-1">% {Math.round(soundVolume * 100)}</div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[#949ba4] hover:text-gray-200 text-sm">İptal</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded-md text-sm">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sunucu Ayarları Modal ────────────────────────────────────
function GuildSettingsModal({ guild, user, onClose }) {
  const { updateGuild, deleteGuild, leaveGuild, createChannel } = useGuildStore();
  const [tab, setTab] = useState('general');
  const [name, setName] = useState(guild.name);
  const [description, setDescription] = useState(guild.description || '');
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(resolveUrl(guild.icon_url));
  const [newChannel, setNewChannel] = useState('');
  const [channelType, setChannelType] = useState('text');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOwner = guild.owner_id === user?.id;

  const handleIconChange = (e) => { const f = e.target.files[0]; if (!f) return; setIconFile(f); setIconPreview(URL.createObjectURL(f)); };
  const handleSave = async (e) => { e.preventDefault(); setSaving(true); const res = await updateGuild(guild.id, name, description, iconFile); setSaving(false); if (res.success) onClose(); else setError(res.error); };
  const handleDelete = async () => { const res = await deleteGuild(guild.id); if (res.success) onClose(); else setError(res.error); };
  const handleLeave = async () => { const res = await leaveGuild(guild.id); if (res.success) onClose(); else setError(res.error); };
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannel.trim()) return;
    const res = await createChannel(guild.id, newChannel.trim().toLowerCase().replace(/\s+/g, '-'), channelType);
    if (res.success) setNewChannel(''); else setError(res.error);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#17181a] border border-[#2b2d31] rounded-xl w-full max-w-2xl flex overflow-hidden shadow-2xl" style={{ maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="w-48 bg-[#111214] flex flex-col p-4 gap-1 flex-shrink-0">
          <p className="text-[#80848e] text-xs font-bold uppercase tracking-wider mb-2 truncate">{guild.name}</p>
          {isOwner && (
            <>
              <button onClick={() => setTab('general')} className={`text-left px-3 py-1.5 rounded-md text-sm transition ${tab === 'general' ? 'bg-[#2b2d31] text-gray-200' : 'text-[#949ba4] hover:text-gray-200 hover:bg-[#1e1f22]'}`}>Genel</button>
              <button onClick={() => setTab('channels')} className={`text-left px-3 py-1.5 rounded-md text-sm transition ${tab === 'channels' ? 'bg-[#2b2d31] text-gray-200' : 'text-[#949ba4] hover:text-gray-200 hover:bg-[#1e1f22]'}`}>Kanallar</button>
              <div className="h-px bg-[#2b2d31] my-2" />
              <button onClick={() => setTab('danger')} className="text-left px-3 py-1.5 rounded-md text-sm text-red-400 hover:bg-red-500/10">Tehlike Bölgesi</button>
            </>
          )}
          {!isOwner && <button onClick={() => setTab('leave')} className="text-left px-3 py-1.5 rounded-md text-sm text-red-400 hover:bg-red-500/10">Sunucudan Ayrıl</button>}
          <div className="flex-1" />
          <button onClick={onClose} className="text-left px-3 py-1.5 rounded-md text-sm text-[#949ba4] hover:text-gray-200 hover:bg-[#1e1f22]">✕ Kapat</button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-4">{error}</div>}

          {tab === 'general' && (
            <form onSubmit={handleSave} className="flex flex-col gap-5">
              <h2 className="text-xl font-bold text-gray-100">Sunucu Ayarları</h2>
              <div className="flex items-center gap-5">
                <label className="relative cursor-pointer group">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#2b2d31] flex items-center justify-center text-3xl">
                    {iconPreview ? <img src={iconPreview} alt="icon" className="w-full h-full object-cover" /> : guild.name.charAt(0)}
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <span className="text-white text-xs font-bold">Değiştir</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
                </label>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">Sunucu Adı</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required
                    className="bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-[#5865f2] transition" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">Açıklama</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  className="bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-[#5865f2] resize-none transition" />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={saving} className="px-5 py-2 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded-md text-sm font-medium">
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          )}

          {tab === 'channels' && (
            <div className="flex flex-col gap-5">
              <h2 className="text-xl font-bold text-gray-100">Kanallar</h2>
              <div className="flex flex-col gap-2">
                {guild.channels?.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between bg-[#1e1f22] rounded-md px-3 py-2">
                    <div className="flex items-center gap-2 text-gray-200 text-sm">
                      <span className="text-[#80848e]">{ch.channel_type === 'voice' ? '🔊' : '#'}</span>
                      {ch.name}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleCreateChannel} className="flex flex-col gap-3 border-t border-[#2b2d31] pt-4">
                <h3 className="text-sm font-bold text-gray-200">Yeni Kanal Ekle</h3>
                <div className="flex gap-2">
                  <select value={channelType} onChange={(e) => setChannelType(e.target.value)}
                    className="bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2 text-gray-200 text-sm focus:outline-none flex-shrink-0">
                    <option value="text"># Metin</option>
                    <option value="voice">🔊 Ses</option>
                  </select>
                  <input value={newChannel} onChange={(e) => setNewChannel(e.target.value)} placeholder="kanal-adı" required
                    className="flex-1 bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2 text-gray-200 placeholder-[#80848e] focus:outline-none focus:border-[#5865f2] text-sm transition" />
                  <button type="submit" className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-md text-sm">Ekle</button>
                </div>
              </form>
            </div>
          )}

          {tab === 'danger' && (
            <div className="flex flex-col gap-5">
              <h2 className="text-xl font-bold text-red-400">Tehlike Bölgesi</h2>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <h3 className="font-bold text-gray-200 mb-1">Sunucuyu Sil</h3>
                <p className="text-[#949ba4] text-sm mb-4">Bu işlem geri alınamaz. Tüm kanallar ve mesajlar silinecek.</p>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-md text-sm font-medium border border-red-500/30 transition">
                    Sunucuyu Sil
                  </button>
                ) : (
                  <div className="flex gap-3 items-center">
                    <span className="text-red-400 text-sm">Emin misin?</span>
                    <button onClick={handleDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-bold">Evet, Sil</button>
                    <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 bg-[#2b2d31] text-gray-200 rounded-md text-sm">İptal</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'leave' && (
            <div className="flex flex-col gap-5">
              <h2 className="text-xl font-bold text-red-400">Sunucudan Ayrıl</h2>
              <p className="text-[#949ba4]"><strong>{guild.name}</strong> sunucusundan ayrılmak istediğinden emin misin?</p>
              <button onClick={handleLeave} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-bold self-start">Ayrıl</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hızlı Kanal Oluştur ─────────────────────────────────────
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
    await createChannel(guildId, name.trim().toLowerCase().replace(/\s+/g, '-'), type);
    close();
  };

  return (
    <>
      <button onClick={open} title={`${type === 'voice' ? 'Ses' : 'Metin'} kanalı ekle`}
        className="ml-auto text-[#80848e] hover:text-gray-200 transition text-base leading-none px-1">+</button>
      {show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={close}>
          <div className="bg-[#17181a] border border-[#2b2d31] rounded-xl w-72 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-200 font-semibold mb-3">{type === 'voice' ? '🔊 Ses' : '# Metin'} Kanalı Oluştur</p>
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#17181a] border border-[#2b2d31] rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-100 mb-1">Sunucu Oluştur veya Katıl</h2>
        <p className="text-[#949ba4] text-sm mb-5">Kendi sunucunu oluştur veya davet koduyla birine katıl.</p>
        <div className="flex gap-2 mb-5">
          {['create', 'join'].map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${tab === t ? 'bg-[#5865f2] text-white' : 'bg-[#2b2d31] text-[#949ba4] hover:text-gray-200'}`}>
              {t === 'create' ? '+ Oluştur' : '🔗 Katıl'}
            </button>
          ))}
        </div>
        {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-4">{error}</div>}
        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <label className="relative cursor-pointer group">
                <div className="w-16 h-16 rounded-2xl bg-[#2b2d31] overflow-hidden flex items-center justify-center text-2xl">
                  {iconPreview ? <img src={iconPreview} alt="icon" className="w-full h-full object-cover" /> : '🐸'}
                </div>
                <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <span className="text-white text-xs">Logo</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
              </label>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">Sunucu Adı</label>
                <input value={guildName} onChange={(e) => setGuildName(e.target.value)} placeholder="Harika Sunucu" required
                  className="bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2.5 text-gray-200 placeholder-[#80848e] focus:outline-none focus:border-[#5865f2]" />
              </div>
            </div>
            <button type="submit" className="bg-[#5865f2] hover:bg-[#4752c4] text-white py-2.5 rounded-md font-medium transition">Oluştur</button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Davet kodu (örn: AB12CD34)" required
              className="bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2.5 text-gray-200 placeholder-[#80848e] focus:outline-none focus:border-[#5865f2]" />
            <button type="submit" className="bg-[#23a559] hover:bg-[#1a7a42] text-white py-2.5 rounded-md font-medium transition">Katıl</button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Ses Durum Çubuğu (Frogcord Tarzı) ──────────────────────────
function VoiceStatusBar({ channel, onLeave, isMuted, onToggleMute }) {
  if (!channel) return null;
  return (
    <div className="bg-[#232428] px-3 py-2 flex flex-col gap-1 border-b border-[#1f2023]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1 text-[#23a559] font-bold text-[13px] leading-tight">
            <span className="text-lg">📡</span> Ses Bağlandı
          </div>
          <div className="text-[#949ba4] text-xs truncate leading-tight">{channel.name}</div>
        </div>
        <div className="flex gap-1">
          <button onClick={onToggleMute} title={isMuted ? "Sesi Aç" : "Sessize Al"}
            className={`w-8 h-8 rounded flex items-center justify-center transition ${isMuted ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-gray-200'}`}>
            {isMuted ? '🔇' : '🎙️'}
          </button>
          <button onClick={onLeave} title="Bağlantıyı Kes"
            className="w-8 h-8 rounded flex items-center justify-center text-red-400 hover:bg-red-500/10 transition">
            <span className="text-xl rotate-[135deg]">📞</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ses Kanalı (Yenilenmiş WebRTC Mesh) ──────────────────────
function VoiceChannel({ channel, user, playSound: propsPlaySound, onJoinStateChange }) {
  const [inVoice, setInVoice] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [othersSpeak, setOthersSpeak] = useState({}); // {userId: bool}
  
  const streamRef = useRef(null);
  const peerConnections = useRef({}); // {socketId: RTCPeerConnection}
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const remoteAudiosRef = useRef({}); // {socketId: HTMLAudioElement}

  useEffect(() => {
    const onVoiceUsers = (users) => {
      const channelMembers = users.filter((u) => u.channelId === channel.id);
      setVoiceUsers(channelMembers);
      
      // Eğer biz içerdeysek ve yeni biri geldiyse onlara Offer gönderelim
      if (inVoice) {
        channelMembers.forEach(u => {
          if (u.socketId !== socket.id && !peerConnections.current[u.socketId]) {
            initiateCall(u.socketId);
          }
        });
      }
    };

    const onUserSpeak = ({ userId, speaking: s }) => setOthersSpeak((p) => ({ ...p, [userId]: s }));
    
    const onOffer = async ({ from, offer, userId }) => {
      if (!inVoice) return;
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { to: from, answer });
    };

    const onAnswer = async ({ from, answer }) => {
      const pc = peerConnections.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const onIceCandidate = async ({ from, candidate }) => {
      const pc = peerConnections.current[from];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    socket.on('voice_users', onVoiceUsers);
    socket.on('user_speaking', onUserSpeak);
    socket.on('webrtc_offer', onOffer);
    socket.on('webrtc_answer', onAnswer);
    socket.on('webrtc_ice_candidate', onIceCandidate);

    return () => {
      socket.off('voice_users', onVoiceUsers);
      socket.off('user_speaking', onUserSpeak);
      socket.off('webrtc_offer', onOffer);
      socket.off('webrtc_answer', onAnswer);
      socket.off('webrtc_ice_candidate', onIceCandidate);
    };
  }, [channel.id, inVoice]);

  const createPeerConnection = (remoteSocketId) => {
    if (peerConnections.current[remoteSocketId]) return peerConnections.current[remoteSocketId];

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_ice_candidate', { to: remoteSocketId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      let audio = remoteAudiosRef.current[remoteSocketId];
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        remoteAudiosRef.current[remoteSocketId] = audio;
      }
      audio.srcObject = event.streams[0];
    };

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current));
    }

    peerConnections.current[remoteSocketId] = pc;
    return pc;
  };

  const initiateCall = async (remoteSocketId) => {
    const pc = createPeerConnection(remoteSocketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc_offer', { to: remoteSocketId, offer, from: user.id, channelId: channel.id });
  };

  const joinVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Speaking detection
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let wasSpeaking = false;
        intervalRef.current = setInterval(() => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          const isSpeaking = avg > 12;
          if (isSpeaking !== wasSpeaking) {
            wasSpeaking = isSpeaking;
            setSpeaking(isSpeaking);
            socket.emit('voice_speaking', { channelId: channel.id, userId: user.id, speaking: isSpeaking });
          }
        }, 150);
      } catch (e) { console.warn('Audio detection error:', e); }

      socket.emit('voice_join', { channelId: channel.id, userId: user.id, username: user.display_name || user.username, avatarUrl: user.avatar_url });
      setInVoice(true);
      if (onJoinStateChange) onJoinStateChange(true, channel, isMuted, toggleMute, leaveVoice);
      if (typeof propsPlaySound === 'function') propsPlaySound('join');
    } catch (err) {
      console.error(err);
      alert('Mikrofon izni gerekli!');
    }
  };

  const leaveVoice = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    
    // Peer connections temizle
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    Object.values(remoteAudiosRef.current).forEach(a => { a.srcObject = null; a.remove(); });
    remoteAudiosRef.current = {};

    socket.emit('voice_leave', { channelId: channel.id, userId: user.id });
    socket.emit('voice_speaking', { channelId: channel.id, userId: user.id, speaking: false });
    
    setInVoice(false); 
    setSpeaking(false); 
    setOthersSpeak({});
    if (onJoinStateChange) onJoinStateChange(false, null);
    if (typeof propsPlaySound === 'function') propsPlaySound('leave');
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const muted = !isMuted;
      streamRef.current.getAudioTracks().forEach((t) => { t.enabled = !muted; });
      setIsMuted(muted);
      socket.emit('voice_mute', { channelId: channel.id, userId: user.id, muted });
      if (muted) { 
        setSpeaking(false); 
        socket.emit('voice_speaking', { channelId: channel.id, userId: user.id, speaking: false }); 
      }
      if (onJoinStateChange) onJoinStateChange(true, channel, muted, toggleMute, leaveVoice);
    }
  };

  const channelUsers = voiceUsers.filter((u) => u.channelId === channel.id);

  return (
    <div className="flex flex-col mb-1">
      <div onClick={() => !inVoice && joinVoice()} 
        className={`group flex items-center justify-between px-2 py-1.5 mx-2 rounded-md transition cursor-pointer ${inVoice ? 'bg-[#2b2d31] text-gray-200' : 'text-[#949ba4] hover:bg-[#1e1f22] hover:text-gray-200'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none text-[#80848e]">🔊</span>
          <span className="truncate text-sm font-medium">{channel.name}</span>
        </div>
      </div>
      
      {channelUsers.length > 0 && (
        <div className="ml-9 flex flex-col gap-1.5 mt-1 mb-2">
          {channelUsers.map((u) => {
            const isTalking = (othersSpeak[u.userId] || (u.userId === user.id && speaking)) && !u.muted;
            return (
              <div key={u.userId} className="flex items-center gap-2 group/user cursor-default">
                <div className={`relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 transition-all ${isTalking ? 'ring-2 ring-[#23a559] ring-offset-1 ring-offset-[#17181a]' : ''}`}>
                  <img src={resolveUrl(u.avatarUrl)} alt="" className="w-full h-full object-cover bg-[#2b2d31]" />
                </div>
                <span className={`text-sm truncate transition ${isTalking ? 'text-white' : u.muted ? 'text-[#4e5058]' : 'text-[#949ba4] group-hover/user:text-gray-300'}`}>
                  {u.username}
                </span>
                {u.muted && <span className="ml-auto mr-2 text-[10px] opacity-70">🔇</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sağ Panel: Üye Listesi ───────────────────────────────────
function MembersPanel({ onlineUsers, currentUser, onUserClick }) {
  const others = onlineUsers.filter((u) => u.userId !== currentUser?.id);
  const [width, setWidth] = useState(() => parseInt(localStorage.getItem('rightPanelWidth') || '240', 10));

  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMouseMove = (moveEvent) => {
      const w = Math.max(200, Math.min(600, startWidth - (moveEvent.clientX - startX)));
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

  return (
    <div className="relative flex-shrink-0 h-full flex flex-col bg-[#17181a] border-l border-[#1f2023]" style={{ width: `${width}px` }}>
      <div className="absolute left-[-2px] top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#5865f2] z-50 transition" onMouseDown={startResize} />
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
      <div className="px-4 pt-4 pb-2 text-[#80848e] font-bold text-xs uppercase tracking-wider">Üyeler</div>
      <div className="px-4 pb-1 text-[#80848e] text-[10px] uppercase tracking-wider font-bold">
        Çevrimiçi — {onlineUsers.length}
      </div>
      <div className="flex flex-col gap-0.5 px-2 pb-4">
        {currentUser && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[#1e1f22] transition cursor-pointer" onClick={(e) => onUserClick?.(e, { userId: currentUser.id, username: currentUser.username, displayName: currentUser.display_name, avatarUrl: currentUser.avatar_url })}>
            <div className="relative flex-shrink-0">
              <img src={resolveUrl(currentUser.avatar_url)} alt="" className="w-8 h-8 rounded-full object-cover bg-[#2b2d31]" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#23a559] rounded-full border-2 border-[#17181a]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-200 font-medium truncate">{currentUser.display_name || currentUser.username}</p>
              <p className="text-[10px] text-[#80848e]">sen</p>
            </div>
          </div>
        )}
        {others.map((u) => (
          <div key={u.userId} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[#1e1f22] transition cursor-pointer" onClick={(e) => onUserClick?.(e, u)}>
            <div className="relative flex-shrink-0">
              <img src={resolveUrl(u.avatarUrl)} alt="" className="w-8 h-8 rounded-full object-cover bg-[#2b2d31]" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#23a559] rounded-full border-2 border-[#17181a]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-[#dbdee1] font-medium truncate">{u.displayName || u.username}</p>
              <p className="text-[10px] text-[#80848e] truncate">#{u.username}</p>
            </div>
          </div>
        ))}
        {onlineUsers.length === 0 && (
          <div className="flex flex-col items-center py-6 text-[#80848e] text-center">
            <div className="text-2xl mb-1">👻</div>
            <p className="text-xs">Henüz kimse yok</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── Ana Uygulama ─────────────────────────────────────────────
export default function MainApp() {
  const { user, logout } = useAuthStore();
  const { guilds, activeGuild, activeChannel, messages, fetchGuilds, selectGuild, selectChannel, addMessage, removeMessage } = useGuildStore();
  const { friends, fetchFriends, addPendingRequest, updateRequestToAccepted, acceptFriendRequest, rejectFriendRequest, sendFriendRequest } = useFriendStore();
  const [friendTab, setFriendTab] = useState('online'); // online, all, pending
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGuildSettings, setShowGuildSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [popoutUser, setPopoutUser] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(() => {
    const saved = localStorage.getItem('soundVolume');
    return saved !== null ? parseFloat(saved) : 0.08; // Default %8 volume for very soft sounds
  });

  const [channelsWidth, setChannelsWidth] = useState(() => parseInt(localStorage.getItem('leftPanelWidth') || '288', 10));

  const handleUserClick = (e, u) => {
    e.stopPropagation();
    setPopoutUser({
      user: u,
      rect: { top: e.clientY, left: e.clientX }
    });
  };

  const startLeftResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = channelsWidth;
    const onMouseMove = (moveEvent) => {
      const w = Math.max(200, Math.min(600, startWidth + (moveEvent.clientX - startX)));
      setChannelsWidth(w);
      localStorage.setItem('leftPanelWidth', w.toString());
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Ses Kanalı Durumu
  const [currentVoice, setCurrentVoice] = useState(null); // { id, name, ... }
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [toggleVoiceMuteFn, setToggleVoiceMuteFn] = useState(null);
  const [leaveVoiceFn, setLeaveVoiceFn] = useState(null);

  const handleVoiceJoinState = (active, channel, muted, toggleFn, leaveFn) => {
    if (active) {
      setCurrentVoice(channel);
      setIsVoiceMuted(muted);
      setToggleVoiceMuteFn(() => toggleFn);
      setLeaveVoiceFn(() => leaveFn);
    } else {
      setCurrentVoice(null);
      setToggleVoiceMuteFn(null);
      setLeaveVoiceFn(null);
    }
  };

  const typingTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const playSound = (type) => {
    if (soundEnabled && SOUNDS[type]) {
      const el = SOUNDS[type];
      el.volume = soundVolume;
      el.currentTime = 0;
      el.play().catch(() => {});
    }
  };

  useEffect(() => {
    const init = async () => {
      await useAuthStore.getState().initialize();
    };
    init();
    if (user) {
      socket.emit('user_connected', { userId: user.id, username: user.username, displayName: user.display_name, avatarUrl: user.avatar_url });
      fetchFriends();
    }
    fetchGuilds();
    socket.on('online_users', setOnlineUsers);
    
    // Arkadaşlık Socket dinleyicileri
    socket.on('friend_request_received', addPendingRequest);
    socket.on('friend_request_accepted_notify', updateRequestToAccepted);
    
    return () => {
      socket.off('online_users');
      socket.off('friend_request_received');
      socket.off('friend_request_accepted_notify');
    };
  }, [user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!activeChannel) return;
    socket.emit('join_channel', activeChannel.id);
    const onMsg = (data) => { 
      if (data.channel_id === activeChannel.id) {
        addMessage(data); 
        if (data.author_id !== user?.id) playSound('message');
      }
    };
    const onTyping = ({ username }) => setTypingUsers((p) => p.includes(username) ? p : [...p, username]);
    const onStopTyping = ({ username }) => setTypingUsers((p) => p.filter((u) => u !== username));
    socket.on('receive_message', onMsg);
    socket.on('user_typing', onTyping);
    socket.on('user_stopped_typing', onStopTyping);
    return () => { socket.off('receive_message', onMsg); socket.off('user_typing', onTyping); socket.off('user_stopped_typing', onStopTyping); };
  }, [activeChannel]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (!activeChannel) return;
    socket.emit('typing_start', { channelId: activeChannel.id, username: user?.display_name || user?.username });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => socket.emit('typing_stop', { channelId: activeChannel.id, username: user?.display_name || user?.username }), 1500);
  };

  const handleSendMessage = async (e) => {
    if (e.key !== 'Enter' || !inputValue.trim() || !activeChannel) return;
    const content = inputValue.trim();
    setInputValue('');
    socket.emit('typing_stop', { channelId: activeChannel.id, username: user?.username });
    try {
      const res = await apiClient.post(`/api/channels/${activeChannel.id}/messages`, { content });
      const msgData = { ...res.data, channel_id: activeChannel.id };
      addMessage(msgData);
      socket.emit('send_message', msgData);
    } catch (err) { console.error(err); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChannel) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiClient.post(`/api/channels/${activeChannel.id}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const msgData = { ...res.data, channel_id: activeChannel.id };
      addMessage(msgData);
      socket.emit('send_message', msgData);
    } catch (err) { console.error(err); }
    e.target.value = '';
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';

  const renderContent = (content) => {
    if (!content) return null;
    if (content.startsWith('[image:')) {
      const url = content.slice(7, -1);
      return <img src={resolveUrl(url)} alt="resim" className="max-w-xs max-h-60 rounded-lg mt-1 cursor-pointer hover:opacity-90 transition" onClick={() => window.open(resolveUrl(url))} />;
    }
    if (content.startsWith('[file:')) {
      const parts = content.slice(6, -1).split(':');
      const fileName = parts[0];
      const fileUrl = parts.slice(1).join(':');
      return <a href={resolveUrl(fileUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#2b2d31] hover:bg-[#1e1f22] rounded-lg px-3 py-2 mt-1 text-[#00a8fc] hover:underline text-sm transition max-w-xs">📎 {fileName}</a>;
    }
    return <div className="text-[#dbdee1] text-sm leading-relaxed break-words">{content}</div>;
  };

  return (
    <div className="flex h-screen w-screen bg-[#111214] text-gray-300 font-sans overflow-hidden">
      {showModal && <GuildModal onClose={() => setShowModal(false)} />}
      {showProfileModal && <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />}
      {showGuildSettings && activeGuild && <GuildSettingsModal guild={activeGuild} user={user} onClose={() => setShowGuildSettings(false)} />}

      {/* ── Sunucu Listesi ── */}
      <div className="w-[72px] bg-[#0b0c0d] flex flex-col items-center py-3 gap-3 z-20 flex-shrink-0">
        <div className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 cursor-pointer overflow-hidden flex-shrink-0 border-2 ${!activeGuild ? 'border-white' : 'border-transparent'}`} onClick={() => selectGuild(null)}>
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain bg-[#2b2d31]" />
        </div>
        <div className="w-8 h-[2px] bg-[#1f2023] rounded-full" />
        {guilds.map((g) => (
          <div key={g.id} title={g.name} onClick={() => selectGuild(g)}
            className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 cursor-pointer flex items-center justify-center font-bold text-lg flex-shrink-0 overflow-hidden border-2 ${activeGuild?.id === g.id ? 'border-white' : 'border-transparent hover:border-white/30'}`}
            style={{ background: '#23272a' }}>
            <img src={resolveUrl(g.icon_url)} alt={g.name} className="w-full h-full object-cover" />
          </div>
        ))}
        <button onClick={() => setShowModal(true)} className="w-12 h-12 bg-[#1e1f22] hover:bg-[#23a559] rounded-[24px] hover:rounded-[16px] transition-all duration-200 text-[#23a559] hover:text-white flex items-center justify-center text-2xl font-light">+</button>
      </div>

      {/* ── Kanal Listesi ── */}
      <div className="relative flex flex-col bg-[#17181a] border-r border-[#1f2023] flex-shrink-0" style={{ width: `${channelsWidth}px` }}>
        <div className="absolute right-[-2px] top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#5865f2] z-50 transition" onMouseDown={startLeftResize} />
        {activeGuild ? (
          <>
            <div className="h-14 border-b border-[#111214] flex items-center justify-between px-4 font-bold text-gray-200 cursor-pointer hover:bg-[#1f2023] transition group flex-shrink-0" onClick={() => setShowGuildSettings(true)}>
              <div className="flex items-center gap-2 min-w-0">
                <img src={resolveUrl(activeGuild.icon_url)} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
                <span className="truncate">{activeGuild.name}</span>
              </div>
              <span className="text-[#80848e] text-xs opacity-0 group-hover:opacity-100 transition">⚙</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-4 pt-4 pb-1 flex items-center">
                <span className="text-[#80848e] font-bold text-xs uppercase tracking-wider flex-1">Metin Kanalları</span>
                <QuickAddChannel guildId={activeGuild.id} type="text" />
              </div>
              <div className="px-2 flex flex-col gap-0.5">
                {activeGuild.channels?.filter((c) => c.channel_type === 'text').map((ch) => (
                  <div key={ch.id} onClick={() => selectChannel(ch)}
                    className={`px-2 py-1.5 rounded-md cursor-pointer flex items-center gap-2 transition ${activeChannel?.id === ch.id ? 'bg-[#2b2d31] text-gray-200' : 'text-[#949ba4] hover:bg-[#1e1f22] hover:text-gray-200'}`}>
                    <span className="text-[#80848e] text-xl font-light">#</span>
                    <span className="truncate text-sm">{ch.name}</span>
                  </div>
                ))}
                {activeGuild.channels?.filter((c) => c.channel_type === 'text').length === 0 && (
                  <p className="px-2 text-[#80848e] text-xs py-1">Henüz kanal yok</p>
                )}
              </div>

              <div className="px-4 pt-4 pb-1 flex items-center">
                <span className="text-[#80848e] font-bold text-xs uppercase tracking-wider flex-1">Ses Kanalları</span>
                <QuickAddChannel guildId={activeGuild.id} type="voice" />
              </div>
              {activeGuild.channels?.filter((c) => c.channel_type === 'voice').map((ch) => (
                <VoiceChannel key={ch.id} channel={ch} user={user} playSound={playSound} onJoinStateChange={handleVoiceJoinState} />
              ))}
              {activeGuild.channels?.filter((c) => c.channel_type === 'voice').length === 0 && (
                <p className="px-4 text-[#80848e] text-xs py-1">Henüz ses kanalı yok</p>
              )}
            </div>

            {showInvite && (
              <div className="mx-2 mb-1 bg-[#0b0c0d] border border-[#2b2d31] rounded-md p-3">
                <p className="text-[#80848e] text-[10px] font-bold uppercase mb-1">Davet Kodu</p>
                <p className="text-[#5865f2] font-mono font-bold tracking-widest text-sm">{activeGuild.invite_code}</p>
              </div>
            )}
            <div className="px-2 py-1 border-t border-[#111214] flex-shrink-0">
              <button onClick={() => setShowInvite(!showInvite)} className="w-full text-left px-2 py-1.5 text-xs text-[#80848e] hover:text-gray-200 transition">
                🔗 {showInvite ? 'Kodu Gizle' : 'Davet Kodu Göster'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col h-full bg-[#313338]">
            <div className="h-12 border-b border-[#1f2023] flex items-center px-4 shadow-sm gap-4">
              <div className="flex items-center gap-2 text-gray-200 px-2 border-r border-[#3f4147] pr-4">
                <span className="text-xl">👋</span>
                <span className="font-bold">Arkadaşlar</span>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium">
                <button onClick={() => setFriendTab('online')} className={`px-2 py-1 rounded transition ${friendTab === 'online' ? 'bg-[#404249] text-gray-100' : 'text-[#b5bac1] hover:bg-[#3f4147] hover:text-gray-200'}`}>Çevrimiçi</button>
                <button onClick={() => setFriendTab('all')} className={`px-2 py-1 rounded transition ${friendTab === 'all' ? 'bg-[#404249] text-gray-100' : 'text-[#b5bac1] hover:bg-[#3f4147] hover:text-gray-200'}`}>Tümü</button>
                <button onClick={() => setFriendTab('pending')} className={`px-2 py-1 rounded transition flex items-center gap-1 ${friendTab === 'pending' ? 'bg-[#404249] text-gray-100' : 'text-[#b5bac1] hover:bg-[#3f4147] hover:text-gray-200'}`}>
                  Bekleyen
                  {friends.filter(f => f.status === 'pending' && f.user_id_2 === user?.id).length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{friends.filter(f => f.status === 'pending' && f.user_id_2 === user?.id).length}</span>
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              {friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#80848e] p-4 text-center">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-sm font-semibold text-gray-300 mb-1">Kimse yok buralarda</p>
                  <p className="text-xs">Biraz arkadaş edinme vakti!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-w-2xl mx-auto mt-4 border-t border-[#1f2023] pt-4">
                  {friends
                    .filter(f => {
                      if (friendTab === 'pending') return f.status === 'pending';
                      if (friendTab === 'all') return f.status === 'accepted';
                      if (friendTab === 'online') {
                         return f.status === 'accepted' && onlineUsers.some(ou => ou.userId === f.friend?.id);
                      }
                      return false;
                    })
                    .map(f => (
                      <div key={f.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-[#2b2d31] border-t border-transparent transition cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={resolveUrl(f.friend?.avatar_url)} alt="avatar" className="w-10 h-10 rounded-full object-cover bg-[#1e1f22]" />
                            {onlineUsers.some(ou => ou.userId === f.friend?.id) ? (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#23a559] rounded-full border-[2.5px] border-[#313338] group-hover:border-[#2b2d31]" />
                            ) : (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#80848e] rounded-full border-[2.5px] border-[#313338] group-hover:border-[#2b2d31]" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-100 font-bold">{f.friend?.display_name || f.friend?.username}</span>
                              <span className="text-xs text-[#b5bac1] hidden group-hover:block">{f.friend?.username}</span>
                            </div>
                            <span className="text-[#b5bac1] text-xs font-semibold">
                              {f.status === 'pending' 
                                ? (f.user_id_1 === user?.id ? 'Giden İstek' : 'Gelen İstek') 
                                : (onlineUsers.some(ou => ou.userId === f.friend?.id) ? 'Çevrimiçi' : 'Çevrimdışı')
                              }
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {f.status === 'pending' && f.user_id_2 === user?.id && (
                            <button onClick={(e) => { e.stopPropagation(); acceptFriendRequest(f.id); socket.emit('friend_request_accepted', { targetUserId: f.friend?.id, friend: { ...f, friend: user } }); }} className="p-2 bg-[#2b2d31] hover:bg-[#23a559] text-[#b5bac1] hover:text-white rounded-full transition" title="Kabul Et">
                              ✅
                            </button>
                          )}
                          {f.status === 'pending' && (
                            <button onClick={(e) => { e.stopPropagation(); rejectFriendRequest(f.id); }} className="p-2 bg-[#2b2d31] hover:bg-red-500 text-[#b5bac1] hover:text-white rounded-full transition" title={f.user_id_1 === user?.id ? "İptal Et" : "Reddet"}>
                              ❌
                            </button>
                          )}
                          {f.status === 'accepted' && (
                            <>
                              <button className="p-2 bg-[#2b2d31] hover:bg-[#1e1f22] text-[#b5bac1] hover:text-gray-200 rounded-full transition" title="Mesaj Gönder">
                                💬
                              </button>
                              <button className="p-2 bg-[#2b2d31] hover:bg-[#1e1f22] text-[#b5bac1] hover:text-gray-200 rounded-full transition" title="Daha fazla">
                                ⋮
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-auto bg-[#111214] flex flex-col flex-shrink-0 z-10">
          <VoiceStatusBar channel={currentVoice} isMuted={isVoiceMuted} onToggleMute={toggleVoiceMuteFn} onLeave={leaveVoiceFn} />
          
          <div className="bg-[#232428] flex items-center p-1.5 border-t border-[#1e1f22]">
            <button onClick={() => setShowProfileModal(true)} className="group flex flex-1 items-center justify-between w-full hover:bg-[#35373c] rounded-md px-2 py-1.5 transition">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <img src={resolveUrl(user?.avatar_url)} alt="avatar" className="w-9 h-9 object-cover bg-[#2b2d31]" style={{ imageRendering: 'pixelated' }} />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#23a559] border-2 border-[#232428]" style={{ imageRendering: 'pixelated' }} />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-sm font-bold text-gray-200 truncate font-mono tracking-wide" style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>{user?.display_name || user?.username}</div>
                  <div className="text-[10px] text-[#b5bac1] truncate font-mono uppercase tracking-widest">USER_{user?.username}</div>
                </div>
              </div>
              <div className="text-sm text-[#80848e] group-hover:text-gray-200 transition font-mono pr-1" style={{ imageRendering: 'pixelated' }}>
                ⚙️
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Chat Alanı ── */}
      <div className="flex-1 flex flex-col bg-[#111214] min-w-0">
        {activeChannel ? (
          <>
            <div className="h-14 border-b border-[#1f2023] flex items-center px-4 font-semibold text-gray-200 gap-2 flex-shrink-0">
              <span className="text-[#80848e] text-2xl font-light">{activeChannel.channel_type === 'voice' ? '🔊' : '#'}</span>
              <span>{activeChannel.name}</span>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-[#80848e]">
                <span className="w-2 h-2 bg-[#23a559] rounded-full inline-block" />
                {onlineUsers.length} çevrimiçi
              </div>
            </div>

            {activeChannel.channel_type === 'voice' ? (
              <div className="flex-1 flex items-center justify-center text-[#80848e]">
                <div className="text-center">
                  <div className="text-5xl mb-4">🔊</div>
                  <p className="text-lg font-bold text-gray-300">Ses Kanalı</p>
                  <p className="text-sm mt-1">Soldaki <strong>Katıl</strong> butonunu kullan</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-1">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-[#80848e]">
                      <div className="text-5xl mb-3">#</div>
                      <p className="font-bold text-gray-300 text-lg">{activeChannel.name} kanalına hoş geldin!</p>
                      <p className="text-sm mt-1">İlk mesajı sen gönder!</p>
                    </div>
                  )}
                  {messages.map((msg, idx) => {
                    const prev = messages[idx - 1];
                    const same = prev && (prev.author?.id || prev.author_id) === (msg.author?.id || msg.author_id);
                    return (
                      <div key={msg.id || idx} className={`flex gap-4 hover:bg-[#17181a]/80 px-2 rounded-md transition group ${same ? 'mt-0.5 py-0' : 'mt-4 py-0.5'}`}>
                        {same ? (
                          <div className="w-10 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-[10px] text-[#80848e] leading-[22px]">{formatTime(msg.created_at)}</span>
                          </div>
                        ) : (
                          <div 
                            className="w-10 h-10 bg-[#2b2d31] rounded-full flex-shrink-0 overflow-hidden mt-0.5 cursor-pointer"
                            onClick={(e) => handleUserClick(e, { userId: msg.author?.id || msg.author_id, username: msg.author?.username || msg.username, displayName: msg.author?.display_name || msg.author?.username || msg.username, avatarUrl: msg.author?.avatar_url })}
                          >
                            <img 
                              src={resolveUrl(
                                onlineUsers.find(u => u.userId === (msg.author?.id || msg.author_id))?.avatarUrl || 
                                msg.author?.avatar_url
                              )} 
                              alt="Avatar" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          {!same && (
                            <div className="flex items-baseline gap-2 mb-1">
                              <span 
                                className="font-semibold text-gray-200 text-sm hover:underline cursor-pointer"
                                onClick={(e) => handleUserClick(e, { userId: msg.author?.id || msg.author_id, username: msg.author?.username || msg.username, displayName: msg.author?.display_name || msg.author?.username || msg.username, avatarUrl: msg.author?.avatar_url })}
                              >
                                {msg.author?.display_name || msg.author?.username || msg.username || 'Kullanıcı'}
                              </span>
                              <span className="text-xs text-[#80848e]">{formatTime(msg.created_at)}</span>
                            </div>
                          )}
                          {renderContent(msg.content || msg.text)}
                        </div>
                        {(msg.author?.id || msg.author_id) === user?.id && (
                          <button onClick={() => removeMessage(msg.id)} className="opacity-0 group-hover:opacity-100 text-[#80848e] hover:text-red-400 transition text-xs flex-shrink-0 self-start mt-1">✕</button>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {typingUsers.length > 0 && (
                  <div className="px-6 py-1 text-xs text-[#949ba4] flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 bg-[#949ba4] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                    <span><strong>{typingUsers.join(', ')}</strong> yazıyor...</span>
                  </div>
                )}

                <div className="p-4 pt-1 flex-shrink-0">
                  <div className="bg-[#1e1f22] rounded-lg px-4 py-3 flex items-center gap-2 border border-[#2b2d31]/50">
                    <button onClick={() => fileInputRef.current?.click()} className="text-[#80848e] hover:text-gray-200 transition text-xl flex-shrink-0" title="Dosya yükle">📎</button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <input type="text" placeholder={`#${activeChannel.name} kanalına mesaj gönder`}
                      className="bg-transparent border-none outline-none w-full text-gray-200 placeholder-[#80848e] text-sm"
                      value={inputValue} onChange={handleInputChange} onKeyDown={handleSendMessage} />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#80848e]">
            <div className="w-24 h-24 mb-6 rounded-3xl overflow-hidden bg-[#2b2d31] shadow-lg p-2">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain rounded-2xl" />
            </div>
            <p className="text-xl font-bold text-gray-200 mb-2">FrogCord'a Hoş Geldin!</p>
            <p className="text-sm text-center max-w-sm">
              Burası senin özel alanın. Yakında buraya arkadaşlarını ekleyebilecek ve onlarla özel olarak mesajlaşabileceksin!
            </p>
            <button className="mt-6 bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium py-2 px-6 rounded-md transition duration-200">
              Arkadaş Ekle (Yakında)
            </button>
          </div>
        )}
      </div>

      {/* ── Sağ: Üye Paneli (veya DM görünümü sağ panel) ── */}
      {activeGuild ? (
        <MembersPanel onlineUsers={onlineUsers} currentUser={user} onUserClick={handleUserClick} />
      ) : (
        <div className="w-56 bg-[#17181a] border-l border-[#1f2023] flex flex-col flex-shrink-0 items-center justify-center p-4 text-center">
          <p className="text-sm font-bold text-gray-200 mb-2">Şimdilik Boş</p>
          <p className="text-xs text-[#80848e]">Arkadaşlarınla etkileşime geçtiğinde burası canlanacak.</p>
        </div>
      )}

      {popoutUser && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setPopoutUser(null)} />
          <div 
            className="fixed z-[110] w-80 bg-[#111214] rounded-lg shadow-2xl overflow-hidden border border-[#1e1f22]"
            style={{
              top: Math.min(popoutUser.rect.top, window.innerHeight - 350),
              left: Math.min(popoutUser.rect.left + 20, window.innerWidth - 340)
            }}
          >
            <div className="h-16 bg-[#5865f2]" />
            <div className="px-4 pb-4 relative">
              <div className="w-20 h-20 rounded-full border-[6px] border-[#111214] absolute -top-10 left-4 bg-[#2b2d31]">
                <img src={resolveUrl(popoutUser.user.avatarUrl || popoutUser.user.avatar_url)} alt="" className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="pt-14">
                <p className="text-xl font-bold text-gray-200">{popoutUser.user.displayName || popoutUser.user.display_name || popoutUser.user.username}</p>
                <p className="text-sm text-gray-400 font-medium">@{popoutUser.user.username}</p>
              </div>
              
              <div className="my-3 h-[1px] bg-[#2b2d31]" />
              
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-400 uppercase">Hakkında</p>
                <p className="text-sm text-gray-300">Bu çok havalı bir FrogCord kullanıcısı!</p>
                
                {(popoutUser.user.userId !== user?.id && popoutUser.user.id !== user?.id) && (
                  <button onClick={async () => {
                      const res = await sendFriendRequest(popoutUser.user.username);
                      if (res.success) {
                        socket.emit('friend_request_sent', { targetUserId: popoutUser.user.id || popoutUser.user.userId, request: res.data });
                        alert("Arkadaşlık isteği gönderildi!");
                        setPopoutUser(null);
                      } else {
                        alert(res.error);
                      }
                    }}
                    className="w-full bg-[#248046] hover:bg-[#1a6334] text-white font-medium py-1.5 rounded text-sm transition mt-1">
                    Arkadaş Ekle
                  </button>
                )}
              </div>
            </div>
            
            {(popoutUser.user.userId !== user?.id && popoutUser.user.id !== user?.id) && (
              <div className="bg-[#1e1f22] p-3 border-t border-[#2b2d31]">
                <input 
                  type="text" 
                  placeholder={`@${popoutUser.user.username} kullanıcısına mesaj gönder`}
                  className="w-full bg-[#111214] text-sm text-gray-200 placeholder-gray-500 rounded px-3 py-2 outline-none border border-[#1e1f22] focus:border-[#5865f2] transition"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      console.log("DM Gönder:", e.target.value);
                      e.target.value = '';
                      setPopoutUser(null);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
