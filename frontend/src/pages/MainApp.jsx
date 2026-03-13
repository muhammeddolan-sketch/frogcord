import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useGuildStore from '../store/guildStore';
import { useFriendStore } from '../store/friendStore';
import apiClient from '../api/axiosClient';
import { 
  Signal, Mic, MicOff, Headphone, Phone, SettingsCog, SettingsCog2, MessageText, Hash, 
  Plus, Users, Attachment, Gamepad, Home, User, Volume1, Volume2, Cancel, Delete, 
  Logout, Link, Frown, Check, CheckboxOn 
} from 'pixelarticons/react';

const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
  path: '/socket.io',
});
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const resolveUrl = (url) => {
  if (!url || url === '/logo.png') return '/logo.png';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

// Speaking Animation CSS
const PULSE_CSS = `
  @keyframes speak-pulse {
    0% { box-shadow: 0 0 0 0 rgba(35, 165, 89, 0.7); }
    50% { box-shadow: 0 0 0 4px rgba(35, 165, 89, 0.3); }
    100% { box-shadow: 0 0 0 0 rgba(35, 165, 89, 0); }
  }
  .speaking-pulse {
    animation: speak-pulse 1.5s ease-in-out infinite;
    position: relative;
    z-index: 1;
  }
  
  @keyframes tile-enter {
    from { opacity: 0; transform: scale(0.9) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .tile-animation {
    animation: tile-enter 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }
  .grid-transition {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

const SOUNDS = {
  message: new Audio('https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3'), // Centered short pop
  join: new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'),
  leave: new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3'),
};

// ─── Profil Modal ─────────────────────────────────────────────
function ProfileModal({ user, onClose, soundVolume, setSoundVolume }) {
  const { updateProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bannerColor, setBannerColor] = useState(user?.banner_color || '#5865f2');
  const [aboutMe, setAboutMe] = useState(user?.about_me || '');
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
    const res = await updateProfile(displayName, bannerColor, aboutMe, avatarFile);
    setSaving(false);
    if (res.success) onClose(); else setError(res.error);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#17181a] border border-[#2b2d31] rounded-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="h-28 relative" style={{ backgroundColor: bannerColor }}>
          <label className="absolute inset-0 cursor-pointer group flex shadow-inner">
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200">
               <span className="text-white text-xs font-bold mb-1">Arka Plan Rengi</span>
            </div>
            {/* hidden color input over the banner */}
            <input type="color" value={bannerColor} onChange={(e) => setBannerColor(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
          </label>
        </div>
        
        <div className="px-6 pb-6 relative">
          <div className="absolute -top-12 left-6 p-1.5 bg-[#17181a] rounded-full">
            <label className="relative cursor-pointer group block">
              <img src={preview} alt="avatar" className="w-20 h-20 rounded-full object-cover bg-[#2b2d31]" />
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <span className="text-white text-xs font-bold">Değiştir</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          </div>

          <div className="flex justify-end pt-4 pb-2">
            <p className="text-gray-200 font-bold text-lg">{user?.username}</p>
          </div>

          <h2 className="text-xl font-bold text-gray-100 mb-4 mt-2">Profili Düzenle</h2>
          {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-4">{error}</div>}
          
          <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">Görünen Ad</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2.5 text-gray-200 focus:outline-none focus:border-[#5865f2] transition" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">Hakkımda</label>
            <textarea value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} rows={3}
              placeholder="Kendinden bahset..."
              className="bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2.5 text-gray-200 focus:outline-none focus:border-[#5865f2] transition resize-none" />
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">Uygulama Sesi</label>
            <div className="flex items-center gap-3 bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2">
              <span className="text-[#80848e]"><Volume1 className="w-5 h-5" /></span>
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
              <span className="text-[#80848e]"><Volume2 className="w-5 h-5" /></span>
            </div>
            <div className="text-xs text-[#80848e] text-right mt-1">% {Math.round((isNaN(soundVolume) ? 1.0 : soundVolume) * 100)}</div>
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[#949ba4] hover:text-gray-200 text-sm">İptal</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded-md text-sm font-medium">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
        </div>
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
          <button onClick={onClose} className="text-left px-3 py-1.5 rounded-md text-sm text-[#949ba4] hover:text-gray-200 hover:bg-[#1e1f22] flex items-center gap-2"><Cancel className="w-4 h-4" /> Kapat</button>
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
                      <span className="text-[#80848e]">{ch.channel_type === 'voice' ? <Volume2 className="w-4 h-4" /> : <Hash className="w-4 h-4" />}</span>
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
                    <option value="voice">Ses</option>
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
              className={`flex-1 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${tab === t ? 'bg-[#5865f2] text-white' : 'bg-[#2b2d31] text-[#949ba4] hover:text-gray-200'}`}>
              {t === 'create' ? <Plus className="w-4 h-4" /> : <Link className="w-4 h-4" />}
              {t === 'create' ? 'Oluştur' : 'Katıl'}
            </button>
          ))}
        </div>
        {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-4">{error}</div>}
        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <label className="relative cursor-pointer group">
                <div className="w-16 h-16 rounded-2xl bg-[#2b2d31] overflow-hidden flex items-center justify-center text-gray-400">
                  {iconPreview ? <img src={iconPreview} alt="icon" className="w-full h-full object-cover" /> : <Plus className="w-8 h-8" />}
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

// ─── Video Görünüm Yardımcıları ──────────────────────────
function LocalVideoView({ stream }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />;
}

function RemoteVideoView({ stream, muted }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={videoRef} autoPlay playsInline muted={true} className="w-full h-full object-cover" />;
}

function RemoteAudio({ stream, muted }) {
  const audioRef = useRef(null);
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);
  return <audio ref={audioRef} autoPlay muted={muted} className="hidden" />;
}

// ─── Ses Durum Çubuğu (Frogcord Tarzı) ──────────────────────────
// ─── Ses Durum Çubuğu (Discord Tarzı) ──────────────────────────
function VoiceStatusBar({ channel, onLeave, isMuted, onToggleMute, isDeafened, onToggleDeafen, isVideoOn, onToggleVideo, isScreenOn, onToggleScreen, onTitleClick }) {
  if (!channel) return null;
  return (
    <div className="bg-[#232428] px-3 py-2 flex flex-col gap-2 border-b border-[#1f2023]">
      {/* Üst Satır: Durum ve Bağlantı Kesme */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col min-w-0 cursor-pointer hover:opacity-80 transition" onClick={() => onTitleClick?.()}>
          <div className="flex items-center gap-1.5 text-[#23a559] font-bold text-[13px] leading-tight select-none group/status">
             <div className="flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-[#23a559] fill-current"><path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm4.5 14h-9v-2h9v2zm0-4h-9v-2h9v2zm0-4h-9V7h9v2z" opacity=".3"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M7 15h10v2H7zm0-4h10v2H7zm0-4h10v2H7z"/></svg>
             </div>
             <span className="group-hover/status:underline">Ses Bağlantısı Kuruldu</span>
          </div>
          <div className="text-[#949ba4] text-xs truncate leading-tight select-none opacity-80">{channel.name} / {channel.guild_name || 'Sunucu'}</div>
        </div>
        <div className="flex gap-1 items-center">
            {/* Bağlantıyı Kes Tuşu (Üst Sağda) */}
            <button onClick={() => onLeave?.()} title="Bağlantıyı Kes"
                className="w-8 h-8 rounded-md flex items-center justify-center text-[#b5bac1] hover:text-[#f23f42] hover:bg-[#f23f42]/10 transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.36 11H11V4c0-.55-.45-1-1-1s-1 .45-1 1v7H2c-.55 0-1 .45-1 1s.45 1 1 1h7v7c0 .55.45 1 1 1s1-.45 1-1v-7h7.36c.52 0 .93-.47.85-1-.1-.66-.69-1-1.21-1zm-6.36 0H11v1h1v-1z"/><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="2.5"/></svg>
            </button>
        </div>
      </div>
      
      {/* Alt Satır: Medya ve Ses Kontrolleri Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* 1. Kamera */}
        <button onClick={() => onToggleVideo?.()} 
          className={`h-8 rounded-md flex items-center justify-center transition border border-transparent ${isVideoOn ? 'bg-[#23a559] text-white' : 'bg-[#2b2d31] text-white hover:bg-[#4e5058]'}`} title="Kamera">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        </button>
        {/* 2. Ekran Paylaş */}
        <button onClick={() => onToggleScreen?.()} 
          className={`h-8 rounded-md flex items-center justify-center transition border border-transparent ${isScreenOn ? 'bg-[#23a559] text-white' : 'bg-[#2b2d31] text-white hover:bg-[#4e5058]'}`} title="Ekran Paylaş">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </button>
        {/* 3. Mikrofon Kapatma */}
        <button onClick={() => onToggleMute?.()} 
          className={`h-8 rounded-md flex items-center justify-center transition border border-transparent ${isMuted ? 'bg-[#f23f42] text-white' : 'bg-[#2b2d31] text-white hover:bg-[#4e5058]'}`} title={isMuted ? "Sesi Aç" : "Sessize Al"}>
          {isMuted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1.1 0 2 .9 2 2v7c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm7 9c0 3.87-3.13 7-7 7s-7-3.13-7-7H3.9c0 4.11 3.08 7.51 7.1 7.91V22h2v-3.09c4.02-.4 7.1-3.8 7.1-7.91H19zM4.41 2.29L3 3.71l17.29 17.29 1.41-1.41-17.29-17.3z"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          )}
        </button>
        {/* 4. Sağırlaştırma */}
        <button onClick={() => onToggleDeafen?.()} 
          className={`h-8 rounded-md flex items-center justify-center transition border border-transparent relative ${isDeafened ? 'bg-[#f23f42] text-white' : 'bg-[#2b2d31] text-white hover:bg-[#4e5058]'}`} title={isDeafened ? "Sesi Duy" : "Sağırlaştır"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h3v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-3v8h3c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z"/></svg>
            {isDeafened && <div className="absolute w-[2px] h-6 bg-white rotate-45" style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))' }} />}
        </button>
      </div>
    </div>
  );
}




// ─── Ses Birimi (Mantıksal - Kalıcı Bağlantı) ──────────────────
function PersistentVoiceController({ channel, user, playSound: propsPlaySound, onJoinStateChange }) {
  const [voiceUsers, setVoiceUsers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenOn, setIsScreenOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [othersSpeak, setOthersSpeak] = useState({});
  const [remoteStreams, setRemoteStreams] = useState({});

  const inVoiceRef = useRef(true); // Always true when this is mounted
  const isMutedRef = useRef(false);
  const isDeafenedRef = useRef(false);
  const streamRef = useRef(null);
  const videoStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnections = useRef({});
  const remoteStreamsRef = useRef({});
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);

  const notifyStateChange = () => {
    if (onJoinStateChange) {
      onJoinStateChange(
        true, channel, isMutedRef.current, isDeafenedRef.current, 
        toggleMute, toggleDeafen, leaveVoice, isVideoOn, toggleCamera, 
        isScreenOn, toggleScreenShare, remoteStreamsRef.current, 
        videoStreamRef.current, screenStreamRef.current, 
        speaking, othersSpeak, voiceUsers
      );
    }
  };

  useEffect(() => {
    notifyStateChange();
  }, [isVideoOn, isScreenOn, isMuted, isDeafened, remoteStreams, speaking, othersSpeak, voiceUsers]);

  useEffect(() => {
    const onVoiceUsers = (users) => {
      const channelMembers = users.filter((u) => u.channelId === channel.id);
      const memberIds = channelMembers.map(m => m.socketId);
      Object.keys(peerConnections.current).forEach(sid => {
        if (!memberIds.includes(sid)) {
          if (peerConnections.current[sid]) peerConnections.current[sid].close();
          delete peerConnections.current[sid];
          delete remoteStreamsRef.current[sid];
        }
      });
      setRemoteStreams({ ...remoteStreamsRef.current });
      setVoiceUsers(channelMembers);
      channelMembers.forEach(u => {
        if (u.socketId !== socket.id && !peerConnections.current[u.socketId]) {
          if (socket.id > u.socketId) initiateCall(u.socketId);
        }
      });
    };

    const onUserSpeak = ({ userId, speaking: s }) => setOthersSpeak((p) => ({ ...p, [userId]: s }));
    const onOffer = async ({ from, offer }) => {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { to: from, answer });
    };
    const onAnswer = async ({ from, answer }) => {
        const pc = peerConnections.current[from];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };
    const onIceCandidate = async ({ from, candidate }) => {
        const pc = peerConnections.current[from];
        if (pc && candidate) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
        }
    };

    socket.on('voice_users', onVoiceUsers);
    socket.on('user_speaking', onUserSpeak);
    socket.on('webrtc_offer', onOffer);
    socket.on('webrtc_answer', onAnswer);
    socket.on('webrtc_ice_candidate', onIceCandidate);

    joinVoice();

    return () => {
      socket.off('voice_users', onVoiceUsers);
      socket.off('user_speaking', onUserSpeak);
      socket.off('webrtc_offer', onOffer);
      socket.off('webrtc_answer', onAnswer);
      socket.off('webrtc_ice_candidate', onIceCandidate);
      cleanup();
    };
  }, [channel.id]);

  const joinVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;
      intervalRef.current = setInterval(() => {
        if (isMutedRef.current) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const isSpk = avg > 12;
        if (isSpk !== wasSpeaking) {
          wasSpeaking = isSpk;
          setSpeaking(isSpk);
          socket.emit('voice_speaking', { channelId: channel.id, userId: user.id, speaking: isSpk });
        }
      }, 150);
      socket.emit('voice_join', { channelId: channel.id, userId: user.id, username: user.display_name || user.username, avatarUrl: user.avatar_url });
      if (typeof propsPlaySound === 'function') propsPlaySound('join');
    } catch (err) { alert('Mikrofon izni gerekli!'); leaveVoice(); }
  };

  const cleanup = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (audioCtxRef.current) try { audioCtxRef.current.close(); } catch {}
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach((t) => t.stop());
    if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach((t) => t.stop());
    Object.values(peerConnections.current).forEach(pc => pc.close());
    socket.emit('voice_leave', { channelId: channel.id, userId: user.id });
  };

  const leaveVoice = () => {
    cleanup();
    if (onJoinStateChange) onJoinStateChange(false, null, false, false, null, null, null);
    if (typeof propsPlaySound === 'function') propsPlaySound('leave');
  };

  const createPeerConnection = (remoteSocketId) => {
    if (peerConnections.current[remoteSocketId]) return peerConnections.current[remoteSocketId];
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = (e) => e.candidate && socket.emit('webrtc_ice_candidate', { to: remoteSocketId, candidate: e.candidate });
    pc.ontrack = (e) => {
      remoteStreamsRef.current[remoteSocketId] = e.streams[0];
      setRemoteStreams({ ...remoteStreamsRef.current });
    };
    [streamRef.current, videoStreamRef.current, screenStreamRef.current].forEach(s => s && s.getTracks().forEach(t => pc.addTrack(t, s)));
    peerConnections.current[remoteSocketId] = pc;
    return pc;
  };

  const initiateCall = async (rid) => {
    const pc = createPeerConnection(rid);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc_offer', { to: rid, offer, from: user.id, channelId: channel.id });
  };

  const toggleCamera = async () => {
    try {
      if (isVideoOn) {
        if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(t => t.stop());
        videoStreamRef.current = null;
        setIsVideoOn(false);
      } else {
        const st = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStreamRef.current = st;
        setIsVideoOn(true);
      }
      Object.values(peerConnections.current).forEach(pc => {
        pc.getSenders().forEach(s => { if (s.track?.kind === 'video' && s.track !== screenStreamRef.current?.getVideoTracks()[0]) pc.removeTrack(s); });
        if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(t => pc.addTrack(t, videoStreamRef.current));
      });
      Object.keys(peerConnections.current).forEach(id => initiateCall(id));
    } catch (e) { alert("Kamera açılamadı!"); }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenOn) {
        if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
        setIsScreenOn(false);
      } else {
        const st = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = st;
        setIsScreenOn(true);
        st.getTracks()[0].onended = () => { setIsScreenOn(false); screenStreamRef.current = null; };
      }
      Object.values(peerConnections.current).forEach(pc => {
        pc.getSenders().forEach(s => { if (s.track?.kind === 'video' && s.track !== videoStreamRef.current?.getVideoTracks()[0]) pc.removeTrack(s); });
        if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => pc.addTrack(t, screenStreamRef.current));
      });
      Object.keys(peerConnections.current).forEach(id => initiateCall(id));
    } catch (e) {}
  };

  const toggleMute = (f) => {
    if (streamRef.current) {
      const m = typeof f === 'boolean' ? f : !isMutedRef.current;
      streamRef.current.getAudioTracks().forEach(t => t.enabled = !m);
      setIsMuted(m);
      isMutedRef.current = m;
      socket.emit('voice_status', { channelId: channel.id, userId: user.id, muted: m });
      if (m) { setSpeaking(false); socket.emit('voice_speaking', { channelId: channel.id, userId: user.id, speaking: false }); }
    }
  };

  const toggleDeafen = () => {
    const d = !isDeafenedRef.current;
    setIsDeafened(d);
    isDeafenedRef.current = d;
    Object.values(remoteStreamsRef.current).forEach(s => s.getAudioTracks().forEach(t => t.enabled = !d));
    if (d) toggleMute(true);
    else socket.emit('voice_status', { channelId: channel.id, userId: user.id, deafened: false });
  };

  return null;
}

// ─── Ses Kanalı (Yandan Görünüm UI) ──────────────────────────
function VoiceSidebarItem({ channel, user, onJoin, activeChannelId, voiceUsersGlobal, globalOthersSpeak }) {
  const users = voiceUsersGlobal.filter((u) => u.channelId === channel.id);
  const inVoice = users.some(u => u.userId === user?.id);

  return (
    <div className="flex flex-col mb-1">
      <div onClick={() => onJoin(channel)}
        className={`group flex items-center justify-between px-2 py-1.5 mx-2 rounded-md transition cursor-pointer ${inVoice ? 'bg-[#2b2d31] text-gray-200' : 'text-[#949ba4] hover:bg-[#1e1f22] hover:text-gray-200'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Volume2 className="w-5 h-5 text-[#80848e]" />
          <span className="truncate text-sm font-medium">{channel.name}</span>
        </div>
      </div>
      {users.length > 0 && (
        <div className="ml-9 flex flex-col gap-1.5 mt-1 mb-2">
          {users.map((u) => {
            const isSpeaking = globalOthersSpeak[u.userId] && !u.muted;
            return (
              <div key={u.userId} className="flex items-center gap-2 group/user cursor-default">
                <div className={`relative w-6 h-6 rounded-full flex-shrink-0 transition-all ${isSpeaking ? 'ring-2 ring-[#23a559]' : ''}`}>
                  <img src={resolveUrl(u.avatarUrl)} alt="" className="w-full h-full rounded-full object-cover bg-[#2b2d31]" />
                </div>
                <span className={`text-sm truncate transition ${isSpeaking ? 'text-white' : 'text-[#949ba4] group-hover/user:text-gray-300'}`}>{u.username}</span>
                <div className="ml-auto flex items-center gap-1.5 pr-2">
                  {u.deafened && <Headphone className="w-3.5 h-3.5 opacity-70 text-red-400" />}
                  {u.muted && <MicOff className="w-3.5 h-3.5 opacity-70 text-red-400" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sağ Panel: Üye Listesi ───────────────────────────────────
function MembersPanel({ onlineUsers, currentUser, onUserClick, speaking = false, othersSpeak = {} }) {
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
            <div className={`relative flex-shrink-0 w-8 h-8 rounded-full transition-all duration-300 ${speaking ? 'speaking-pulse ring-2 ring-[#23a559]' : ''}`}>
              <img src={resolveUrl(currentUser.avatar_url)} alt="" className="w-full h-full rounded-full object-cover bg-[#2b2d31]" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#23a559] rounded-full border-2 border-[#17181a]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-200 font-medium truncate">{currentUser.display_name || currentUser.username}</p>
              <p className="text-[10px] text-[#80848e]">sen</p>
            </div>
          </div>
        )}
        {others.map((u) => {
          const isTalking = othersSpeak[u.userId];
          return (
            <div key={u.userId} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[#1e1f22] transition cursor-pointer" onClick={(e) => onUserClick?.(e, u)}>
              <div className={`relative flex-shrink-0 w-8 h-8 rounded-full transition-all duration-300 ${isTalking ? 'speaking-pulse ring-2 ring-[#23a559]' : ''}`}>
                <img src={resolveUrl(u.avatarUrl)} alt="" className="w-full h-full rounded-full object-cover bg-[#2b2d31]" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#23a559] rounded-full border-2 border-[#17181a]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-[#dbdee1] font-medium truncate">{u.displayName || u.username}</p>
                <p className="text-[10px] text-[#80848e] truncate">#{u.username}</p>
              </div>
            </div>
          );
        })}
        {onlineUsers.length === 0 && (
          <div className="flex flex-col items-center py-6 text-[#80848e] text-center">
            <div className="text-2xl mb-1 flex justify-center"><Frown className="w-8 h-8 opacity-50" /></div>
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
  const [currentVoice, setCurrentVoice] = useState(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isVoiceDeafened, setIsVoiceDeafened] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [toggleVoiceMuteFn, setToggleVoiceMuteFn] = useState(() => () => {});
  const [toggleVoiceDeafenFn, setToggleVoiceDeafenFn] = useState(() => () => {});
  const [toggleCameraFn, setToggleCameraFn] = useState(() => () => {});
  const [toggleScreenShareFn, setToggleScreenShareFn] = useState(() => () => {});
  const [leaveVoiceFn, setLeaveVoiceFn] = useState(() => () => {});
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [voiceOthersSpeak, setVoiceOthersSpeak] = useState({});
  const [focusedStreamId, setFocusedStreamId] = useState(null); // 'local' or socketId
  const [voiceMembers, setVoiceMembers] = useState([]);

  const [remoteStreams, setRemoteStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const [voiceUsersGlobal, setVoiceUsersGlobal] = useState([]);
  const [globalOthersSpeak, setGlobalOthersSpeak] = useState({});

  useEffect(() => {
    const onVU = (users) => setVoiceUsersGlobal(users);
    const onSpk = ({ userId, speaking }) => setGlobalOthersSpeak(p => ({ ...p, [userId]: speaking }));
    socket.on('voice_users', onVU);
    socket.on('user_speaking', onSpk);
    return () => {
      socket.off('voice_users', onVU);
      socket.off('user_speaking', onSpk);
    };
  }, []);

  const handleVoiceJoinState = (active, channel, muted, deafened, toggleMuteFn, toggleDeafenFn, leaveFn, videoOn, toggleVideo, screenOn, toggleScreen, remStreams, locStream, locScreenStream, speaking, othersSpeak, members) => {
    if (active) {
      setCurrentVoice(channel);
      setIsVoiceMuted(muted);
      setIsVoiceDeafened(deafened);
      setIsCameraOn(!!videoOn);
      setIsScreenSharing(!!screenOn);
      setToggleVoiceMuteFn(() => toggleMuteFn);
      setToggleVoiceDeafenFn(() => toggleDeafenFn);
      setToggleCameraFn(() => toggleVideo);
      setToggleScreenShareFn(() => toggleScreen);
      setLeaveVoiceFn(() => leaveFn);
      setRemoteStreams(remStreams || {});
      setLocalStream(locStream);
      setLocalScreenStream(locScreenStream);
      setVoiceSpeaking(!!speaking);
      setVoiceOthersSpeak(othersSpeak || {});
      setVoiceMembers(members || []);
    } else {
      setCurrentVoice(null);
      setIsCameraOn(false);
      setIsScreenSharing(false);
      setRemoteStreams({});
      setLocalStream(null);
      setLocalScreenStream(null);
      setVoiceSpeaking(false);
      setVoiceOthersSpeak({});
      setFocusedStreamId(null);
      setVoiceMembers([]);
    }
  };

  const handleJoinVoiceFromSidebar = (channel) => {
    if (currentVoice?.id === channel.id) {
       selectChannel(channel);
       return;
    }
    setCurrentVoice(channel); 
    selectChannel(channel);
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

  // Mount işlemleri (Yalnızca bir kez çalışır)
  useEffect(() => {
    const init = async () => {
      await useAuthStore.getState().initialize();
    };
    init();
    fetchFriends();
    fetchGuilds();

    socket.on('online_users', setOnlineUsers);
    socket.on('friend_request_received', addPendingRequest);
    socket.on('friend_request_accepted_notify', updateRequestToAccepted);
    
    return () => {
      socket.off('online_users');
      socket.off('friend_request_received');
      socket.off('friend_request_accepted_notify');
    };
  }, []);

  // Kullanıcı yüklendiğinde sokete bağlan (ID'ye göre bağlanır)
  useEffect(() => {
    if (user && user.id) {
      socket.emit('user_connected', { 
        userId: user.id, 
        username: user.username, 
        displayName: user.display_name, 
        avatarUrl: user.avatar_url,
        banner_color: user.banner_color,
        about_me: user.about_me
      });
    }
  }, [user?.id]);

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
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || !inputValue.trim() || !activeChannel) return;
    e.preventDefault();
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
      return <a href={resolveUrl(fileUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#2b2d31] hover:bg-[#1e1f22] rounded-lg px-3 py-2 mt-1 text-[#00a8fc] hover:underline text-sm transition max-w-xs"><Attachment className="w-4 h-4" /> {fileName}</a>;
    }
    return <div className="text-[#dbdee1] text-sm leading-relaxed break-words">{content}</div>;
  };

  return (
    <div className="flex h-screen w-screen bg-[#111214] text-gray-300 font-sans overflow-hidden">
      {showModal && <GuildModal onClose={() => setShowModal(false)} />}
      {showProfileModal && <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />}
      {showGuildSettings && activeGuild && <GuildSettingsModal guild={activeGuild} user={user} onClose={() => setShowGuildSettings(false)} />}

      {/* Persistent Voice Logic (Always mounted) */}
      {currentVoice && (
        <PersistentVoiceController 
          key={`voice-logic-${currentVoice.id}`}
          channel={currentVoice}
          user={user}
          playSound={playSound}
          onJoinStateChange={handleVoiceJoinState}
        />
      )}

      {/* ── Sunucu Listesi ── */}
      <div className="w-[72px] bg-[#0b0c0d] flex flex-col items-center py-3 gap-3 z-20 flex-shrink-0">
        <div className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 cursor-pointer overflow-hidden flex-shrink-0 border-2 ${!activeGuild ? 'border-white' : 'border-transparent'}`} onClick={() => selectGuild(null)}>
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain bg-[#2b2d31]" />
        </div>
        <div className="w-8 h-[2px] bg-[#1f2023] rounded-full" />
        {guilds.map((g) => (
          <div key={g.id} title={g.name} onClick={() => g.id && selectGuild(g)}
            className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 cursor-pointer flex items-center justify-center font-bold text-lg flex-shrink-0 overflow-hidden border-2 ${activeGuild?.id === g.id ? 'border-white' : 'border-transparent hover:border-white/30'}`}
            style={{ background: '#23272a' }}>
            <img src={resolveUrl(g.icon_url)} alt={g.name} className="w-full h-full object-cover" />
          </div>
        ))}
        <button onClick={() => setShowModal(true)} className="w-12 h-12 bg-[#1e1f22] hover:bg-[#23a559] rounded-[24px] hover:rounded-[16px] transition-all duration-200 text-[#23a559] hover:text-white flex items-center justify-center text-2xl font-light"><Plus className="w-6 h-6" /></button>
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
              <span className="text-[#80848e] text-xs opacity-0 group-hover:opacity-100 transition"><SettingsCog className="w-4 h-4" /></span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-4 pt-4 pb-1 flex items-center">
                <span className="text-[#80848e] font-bold text-xs uppercase tracking-wider flex-1">Metin Kanalları</span>
                <QuickAddChannel guildId={activeGuild.id} type="text" />
              </div>
              <div className="px-2 flex flex-col gap-0.5">
                {(activeGuild.channels || []).filter((c) => c.channel_type === 'text').map((ch) => (
                  <div key={ch.id} onClick={() => selectChannel(ch)}
                    className={`px-2 py-1.5 rounded-md cursor-pointer flex items-center gap-2 transition ${activeChannel?.id === ch.id ? 'bg-[#2b2d31] text-gray-200' : 'text-[#949ba4] hover:bg-[#1e1f22] hover:text-gray-200'}`}>
                    <span className="text-[#80848e] flex"><Hash className="w-5 h-5 opacity-70" /></span>
                    <span className="truncate text-sm">{ch.name}</span>
                  </div>
                ))}
                {(activeGuild.channels || []).filter((c) => c.channel_type === 'text').length === 0 && (
                  <p className="px-2 text-[#80848e] text-xs py-1">Henüz kanal yok</p>
                )}
              </div>

              <div className="px-4 pt-4 pb-1 flex items-center">
                <span className="text-[#80848e] font-bold text-xs uppercase tracking-wider flex-1">Ses Kanalları</span>
                <QuickAddChannel guildId={activeGuild.id} type="voice" />
              </div>
              <div className="px-2 flex flex-col gap-0.5">
                {(activeGuild.channels || []).filter((c) => c.channel_type === 'voice').map((ch) => (
                  <VoiceSidebarItem 
                    key={ch.id} 
                    channel={ch} 
                    user={user} 
                    onJoin={handleJoinVoiceFromSidebar} 
                    voiceUsersGlobal={voiceUsersGlobal}
                    globalOthersSpeak={globalOthersSpeak}
                  />
                ))}
                {(activeGuild.channels || []).filter((c) => c.channel_type === 'voice').length === 0 && (
                  <p className="px-4 text-[#80848e] text-xs py-1">Henüz ses kanalı yok</p>
                )}
              </div>
            </div>

            {showInvite && (
              <div 
                className="mx-2 mb-1 bg-[#0b0c0d] border border-[#2b2d31] hover:border-[#5865f2] rounded-md p-3 cursor-copy group transition relative"
                onClick={() => {
                  navigator.clipboard.writeText(activeGuild.invite_code);
                  const el = document.getElementById('copy-tooltip');
                  if (el) {
                    el.innerText = 'Kopyalandı!';
                    el.classList.add('text-[#23a559]');
                    setTimeout(() => {
                      el.innerText = 'Kopyalamak için tıkla';
                      el.classList.remove('text-[#23a559]');
                    }, 2000);
                  }
                }}
              >
                <div className="flex items-center justify-between pointer-events-none">
                  <p className="text-[#80848e] text-[10px] font-bold uppercase mb-1">Davet Kodu</p>
                  <p id="copy-tooltip" className="text-[#80848e] text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Kopyalamak için tıkla</p>
                </div>
                <p className="text-[#5865f2] font-mono font-bold tracking-widest text-sm pointer-events-none">{activeGuild.invite_code}</p>
              </div>
            )}
            <div className="px-2 py-1 border-t border-[#111214] flex-shrink-0">
              <button onClick={() => setShowInvite(!showInvite)} className="w-full text-left px-2 py-1.5 text-xs text-[#80848e] hover:text-gray-200 transition flex items-center gap-2">
                <Link className="w-4 h-4" />
                {showInvite ? 'Kodu Gizle' : 'Davet Kodu Göster'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col h-full bg-[#17181a]">
            <div className="flex flex-col gap-3 p-4 border-b border-[#1f2023] shadow-sm">
              <div className="flex items-center gap-2 text-gray-200 font-bold px-1">
                <Users className="w-6 h-6" />
                <span className="text-lg">Arkadaşlar</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <button onClick={() => setFriendTab('online')} className={`px-3 py-1.5 rounded-md transition ${friendTab === 'online' ? 'bg-[#2b2d31] text-white' : 'bg-[#1e1f22] text-[#b5bac1] hover:text-gray-200'}`}>Çevrimiçi</button>
                <button onClick={() => setFriendTab('all')} className={`px-3 py-1.5 rounded-md transition ${friendTab === 'all' ? 'bg-[#2b2d31] text-white' : 'bg-[#1e1f22] text-[#b5bac1] hover:text-gray-200'}`}>Tümü</button>
                <button onClick={() => setFriendTab('pending')} className={`px-3 py-1.5 rounded-md transition flex items-center gap-1 ${friendTab === 'pending' ? 'bg-[#2b2d31] text-white' : 'bg-[#1e1f22] text-[#b5bac1] hover:text-gray-200'}`}>
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
                  <div className="text-4xl mb-3 flex justify-center"><MessageText className="w-12 h-12" /></div>
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
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {f.status === 'pending' && (
                            <button onClick={(e) => { e.stopPropagation(); rejectFriendRequest(f.id); }} className="p-2 bg-[#2b2d31] hover:bg-red-500 text-[#b5bac1] hover:text-white rounded-full transition" title={f.user_id_1 === user?.id ? "İptal Et" : "Reddet"}>
                              <Cancel className="w-4 h-4" />
                            </button>
                          )}
                          {f.status === 'accepted' && (
                            <>
                              <button className="p-2 bg-[#2b2d31] hover:bg-[#1e1f22] text-[#b5bac1] hover:text-gray-200 rounded-full transition" title="Mesaj Gönder">
                                <MessageText className="w-5 h-5" />
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

        <div className="mt-auto bg-[#232428] flex flex-col flex-shrink-0 z-10 border-t border-[#1e1f22]">
          {currentVoice && (
            <VoiceStatusBar 
              channel={currentVoice} 
              isMuted={isVoiceMuted}
              onToggleMute={toggleVoiceMuteFn}
              isDeafened={isVoiceDeafened}
              onToggleDeafen={toggleVoiceDeafenFn}
              isVideoOn={isCameraOn}
              isScreenOn={isScreenSharing}
              onToggleVideo={toggleCameraFn}
              onToggleScreen={toggleScreenShareFn}
              onLeave={leaveVoiceFn}
              onTitleClick={() => selectChannel(currentVoice)}
            />
          )}
          
          <div className="flex items-center p-1.5">
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 hover:bg-[#35373c] rounded-md px-2 py-1 transition w-full min-w-0 group">
              <div className="relative flex-shrink-0">
                <img src={resolveUrl(user?.avatar_url)} alt="avatar" className="w-8 h-8 rounded-full object-cover bg-[#2b2d31]" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#23a559] border-2 border-[#232428] rounded-full" />
              </div>
              <div className="min-w-0 text-left">
                <div className="text-[13px] font-bold text-gray-100 truncate tracking-tight">{user?.display_name || user?.username}</div>
                <div className="text-[11px] text-[#b5bac1] truncate opacity-70">Profil Ayarları</div>
              </div>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition text-[#b5bac1]">
                <SettingsCog2 className="w-4 h-4" />
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
              <span className="text-[#80848e] flex items-center justify-center w-6">{activeChannel.channel_type === 'voice' ? <Volume2 className="w-6 h-6" /> : <Hash className="w-6 h-6" />}</span>
              <span>{activeChannel.name}</span>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-[#80848e]">
                <span className="w-2 h-2 bg-[#23a559] rounded-full inline-block" />
                {onlineUsers.length} çevrimiçi
              </div>
            </div>

            {activeChannel.channel_type === 'voice' ? (
              <div className="flex-1 bg-[#1e1f22] flex flex-col relative overflow-hidden">
                {/* Voice Header - Discord Like */}
                <div className="absolute top-0 left-0 right-0 h-12 bg-transparent z-10 flex items-center px-4 pointer-events-none">
                  <div className="flex items-center gap-2 bg-[#111214]/40 backdrop-blur-md px-3 py-1.5 rounded-full pointer-events-auto cursor-default border border-white/5">
                    <Volume2 className="w-4 h-4 text-[#80848e]" />
                    <span className="text-sm font-semibold text-gray-200">{activeChannel.name}</span>
                  </div>
                </div>

                {/* Video/Participant Grid */}
                <div className="flex-1 p-4 md:p-6 flex flex-col items-center justify-center overflow-auto custom-scrollbar pt-14 pb-14">
                  {focusedStreamId ? (
                    <div className="w-full h-full flex flex-col lg:flex-row gap-4 max-w-[1600px]">
                      {/* Large Main View */}
                      <div className="flex-[3] relative bg-[#111214] rounded-2xl overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center group">
                        {focusedStreamId === 'local' ? (
                          <>
                            {isCameraOn || isScreenSharing ? (
                              <LocalVideoView stream={isScreenSharing ? localScreenStream : localStream} />
                            ) : (
                              <div className="flex flex-col items-center gap-4">
                                <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-[4px] border-transparent transition-all duration-300 ${voiceSpeaking ? 'border-[#23a559] shadow-[0_0_30px_rgba(35,165,89,0.3)]' : ''}`}>
                                  <img src={resolveUrl(user?.avatar_url)} alt="" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-xl font-bold text-gray-100">{user?.display_name || user?.username}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {(() => {
                              const stream = remoteStreams[focusedStreamId];
                              if (!stream) {
                                setTimeout(() => setFocusedStreamId(null), 0);
                                return null;
                              }
                              const u = onlineUsers.find(ou => ou.socketIds?.includes(focusedStreamId)) || { username: 'Bilinmeyen' };
                              const hasVideo = stream.getVideoTracks().length > 0;
                              const userSpeaking = voiceOthersSpeak[u.userId];
                              
                              return hasVideo ? (
                                <RemoteVideoView stream={stream} muted={true} />
                              ) : (
                                <div className="flex flex-col items-center gap-4">
                                  <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-[4px] border-transparent transition-all duration-300 ${userSpeaking ? 'border-[#23a559] shadow-[0_0_30px_rgba(35,165,89,0.3)]' : ''}`}>
                                    <img src={resolveUrl(u.avatarUrl || u.avatar_url)} alt="" className="w-full h-full object-cover" />
                                  </div>
                                  <span className="text-xl font-bold text-gray-100">{u.displayName || u.username}</span>
                                </div>
                              );
                            })()}
                          </>
                        )}
                        
                        <div className="absolute top-4 right-4 z-30 opacity-60 hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setFocusedStreamId(null)}
                            className="bg-black/60 hover:bg-black/80 text-white px-3 py-2 rounded-lg backdrop-blur-md border border-white/10 transition flex items-center gap-2 text-sm font-semibold shadow-2xl"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                            Izgaraya Dön
                          </button>
                        </div>
                      </div>

                      {/* Small Sidebar List */}
                      <div className="flex-1 flex lg:flex-col flex-row gap-3 min-w-0 lg:max-w-[280px] overflow-auto custom-scrollbar p-1">
                        {focusedStreamId !== 'local' && (
                          <div 
                            onClick={() => setFocusedStreamId('local')}
                            className={`flex-shrink-0 relative aspect-video bg-[#2b2d31] rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#5865f2] transition-all border-2 ${voiceSpeaking ? 'border-[#23a559]' : 'border-transparent'}`}
                          >
                            {isCameraOn || isScreenSharing ? (
                              <LocalVideoView stream={isScreenSharing ? localScreenStream : localStream} />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-[#111214]">
                                <div className="w-12 h-12 rounded-full overflow-hidden">
                                  <img src={resolveUrl(user?.avatar_url)} alt="" className="w-full h-full object-cover" />
                                </div>
                              </div>
                            )}
                            <div className="absolute bottom-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-bold text-white truncate max-w-[80%]">
                              {user?.display_name || user?.username} (Sen)
                            </div>
                          </div>
                        )}

                        {/* Remotes in sidebar (if not focused) */}
                        {voiceMembers.filter(m => m.socketId !== socket.id).map((u) => {
                          const socketId = u.socketId;
                          if (focusedStreamId === socketId) return null;
                          const stream = remoteStreams[socketId];
                          const hasVideo = stream && stream.getVideoTracks().length > 0;
                          const userSpeaking = voiceOthersSpeak[u.userId];

                          return (
                            <div 
                              key={socketId}
                              onClick={() => setFocusedStreamId(socketId)}
                              className={`flex-shrink-0 relative aspect-video bg-[#2b2d31] rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#5865f2] transition-all border-2 ${userSpeaking ? 'border-[#23a559]' : 'border-transparent'} tile-animation`}
                            >
                              {hasVideo ? (
                                <RemoteVideoView stream={stream} muted={true} />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-[#111214]">
                                  <div className="w-12 h-12 rounded-full overflow-hidden">
                                    <img src={resolveUrl(u.avatarUrl || u.avatar_url)} alt="" className="w-full h-full object-cover" />
                                  </div>
                                </div>
                              )}
                              <div className="absolute bottom-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-bold text-white truncate max-w-[80%]">
                                {u.displayName || u.username}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className={`w-full max-w-7xl grid gap-4 ${
                      voiceMembers.length <= 1 ? 'grid-cols-1 max-w-4xl' : 
                      voiceMembers.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 
                      'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    }`}>
                      
                      <div 
                        onClick={() => setFocusedStreamId('local')}
                        className={`group relative aspect-video bg-[#2b2d31] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 border-2 cursor-pointer hover:border-[#5865f2]/50 ${voiceSpeaking ? 'border-[#23a559] speaking-pulse' : 'border-transparent'} tile-animation`}
                      >
                        {isCameraOn || isScreenSharing ? (
                          <LocalVideoView stream={isScreenSharing ? localScreenStream : localStream} />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#111214]">
                            <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border-[3px] transition-all duration-300 ${voiceSpeaking ? 'border-[#23a559] shadow-[0_0_15px_rgba(35,165,89,0.25)]' : 'border-transparent'}`}>
                              <img src={resolveUrl(user?.avatar_url)} alt="" className="w-full h-full object-cover select-none" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-[#111214]/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/5">
                          <span className="text-[13px] font-bold text-gray-100">{user?.display_name || user?.username}</span>
                          {isVoiceMuted && <MicOff className="w-3.5 h-3.5 text-[#f23f42]" />}
                        </div>

                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black/60 p-3 rounded-full backdrop-blur-sm border border-white/10">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                            </div>
                        </div>
                      </div>

                      {/* Remote User Tiles - Mapping from voiceMembers for instant updates */}
                      {voiceMembers.filter(m => m.socketId !== socket.id).map((u) => {
                        const socketId = u.socketId;
                        const stream = remoteStreams[socketId];
                        const hasVideo = stream && stream.getVideoTracks().length > 0;
                        const userSpeaking = voiceOthersSpeak[u.userId];
                        
                        return (
                          <div 
                            key={socketId} 
                            onClick={() => setFocusedStreamId(socketId)}
                            className={`group relative aspect-video bg-[#2b2d31] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 border-2 cursor-pointer hover:border-[#5865f2]/50 ${userSpeaking ? 'border-[#23a559] speaking-pulse' : 'border-transparent'} tile-animation`}
                          >
                            {hasVideo ? (
                              <RemoteVideoView stream={stream} muted={true} />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-[#111214]">
                                <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border-[3px] transition-all duration-300 ${userSpeaking ? 'border-[#23a559] shadow-[0_0_15px_rgba(35,165,89,0.25)]' : 'border-transparent'}`}>
                                  <img src={resolveUrl(u.avatarUrl || u.avatar_url)} alt="" className="w-full h-full object-cover select-none" />
                                </div>
                              </div>
                            )}
                            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-[#111214]/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/5">
                              <span className="text-[13px] font-bold text-gray-100">{u.displayName || u.username}</span>
                              {u.muted && <MicOff className="w-3.5 h-3.5 text-[#f23f42]" />}
                            </div>

                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-black/60 p-3 rounded-full backdrop-blur-sm border border-white/10">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                                </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Floating Controls Removed by User Request */}
              </div>
            ) : (
              <>
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-1">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-[#80848e]">
                      <div className="text-5xl mb-3 flex justify-center"><Hash className="w-14 h-14" /></div>
                      <p className="font-bold text-gray-300 text-lg">{activeChannel.name} kanalına hoş geldin!</p>
                      <p className="text-sm mt-1">İlk mesajı sen gönder!</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-[2px] mt-auto">
                    {messages.map((msg, idx) => {
                      const prev = messages[idx - 1];
                      const same = prev && (prev.author?.id || prev.author_id) === (msg.author?.id || msg.author_id);
                      return (
                        <div key={msg.id || idx} className={`flex gap-4 hover:bg-[#2e3035] pl-4 pr-12 rounded-sm transition group relative ${same ? 'py-[2px]' : 'mt-[14px] py-[2px]'}`}>
                          {same ? (
                            <div className="w-10 relative flex-shrink-0 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                              <span className="text-[10px] text-[#949ba4] font-medium absolute right-2 select-none" style={{ top: '4px' }}>{formatTime(msg.created_at)}</span>
                            </div>
                          ) : (
                            <div 
                              className="w-10 h-10 bg-[#2b2d31] rounded-full flex-shrink-0 overflow-hidden mt-1 cursor-pointer hover:opacity-80 transition active:translate-y-px"
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
                              <div className="flex items-baseline gap-2 mb-0.5 mt-0.5">
                                <span 
                                  className="font-medium text-[15px] text-gray-100 hover:underline cursor-pointer"
                                  onClick={(e) => handleUserClick(e, { userId: msg.author?.id || msg.author_id, username: msg.author?.username || msg.username, displayName: msg.author?.display_name || msg.author?.username || msg.username, avatarUrl: msg.author?.avatar_url })}
                                >
                                  {msg.author?.display_name || msg.author?.username || msg.username || 'Kullanıcı'}
                                </span>
                                <span className="text-xs text-[#949ba4] font-medium">{formatTime(msg.created_at)}</span>
                              </div>
                            )}
                            {renderContent(msg.content || msg.text)}
                          </div>
                          {(msg.author?.id || msg.author_id) === user?.id && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-[#313338] border border-[#1e1f22] rounded shadow-sm overflow-hidden flex z-10 transition-opacity duration-150">
                              <button onClick={() => removeMessage(msg.id)} title="Mesajı Sil" className="p-1.5 text-[#b5bac1] hover:text-[#da373c] hover:bg-[#2b2d31] transition">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                    <button onClick={() => fileInputRef.current?.click()} className="text-[#80848e] hover:text-gray-200 transition flex-shrink-0" title="Dosya yükle">
                      <Attachment className="w-6 h-6" />
                    </button>
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
          <div className="flex-1 flex flex-col items-center justify-center text-[#80848e] h-full w-full">
            <div className="flex flex-col items-center justify-center translate-y-[-10%]">
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
          </div>
        )}
      </div>

      {/* Global Voice Audio Renderer - Ensures audio keeps playing even when switching views */}
      {currentVoice && Object.entries(remoteStreams).map(([socketId, stream]) => (
        <RemoteAudio key={`audio-${socketId}`} stream={stream} muted={isVoiceDeafened} />
      ))}
      
      {/* ── Sağ: Üye Paneli (veya DM görünümü sağ panel) ── */}
      <style>{PULSE_CSS}</style>
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
            <div className="h-16" style={{ backgroundColor: popoutUser.user.banner_color || '#5865f2' }} />
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
                <p className="text-sm text-gray-300 break-words">{popoutUser.user.aboutMe || popoutUser.user.about_me || 'Bu çok havalı bir FrogCord kullanıcısı!'}</p>
                
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
