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

export default // ─── Kullanıcı Ayarları Modal ─────────────────────────────────────
function UserSettingsModal({ user, onClose, soundVolume, setSoundVolume, profileEffect, setProfileEffect }) {
  const { updateProfile, logout } = useAuthStore();
  const [tab, setTab] = useState('profile');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bannerColor, setBannerColor] = useState(user?.banner_color || '#5865f2');
  const [aboutMe, setAboutMe] = useState(user?.about_me || '');
  const [customStatus, setCustomStatus] = useState(user?.custom_status || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(resolveUrl(user?.avatar_url));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [currentAccent, setCurrentAccent] = useState(() => localStorage.getItem('accent') || 'green');
  const [currentDensity, setCurrentDensity] = useState(() => localStorage.getItem('density') || 'cozy');
  
  // Rozetler (Mock data for UI demostration)
  const [selectedBadges, setSelectedBadges] = useState(user?.badges || ['early_supporter']);

  const [devices, setDevices] = useState([]);
  const [selectedInput, setSelectedInput] = useState(localStorage.getItem('inputDeviceId') || 'default');
  const [selectedOutput, setSelectedOutput] = useState(localStorage.getItem('outputDeviceId') || 'default');
  const [showUltraModal, setShowUltraModal] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(list => {
      setDevices(list);
    });
  }, []);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setAvatarFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await updateProfile(displayName, bannerColor, aboutMe, customStatus, avatarFile);
    if (!res.success) setError(res.error);
    else onClose();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="premium-glass w-full max-w-2xl flex overflow-hidden shadow-2xl h-[580px] animate-fade-up" onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <div className="w-48 bg-black/20 p-6 flex flex-col gap-1 border-r border-[var(--glass-border)]">
          <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-4">Ayarlar</p>
          <button onClick={() => setTab('profile')} className={`text-left px-3 py-2 text-xs font-bold uppercase transition ${tab === 'profile' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-light)]'}`}>Profilim</button>
          <button onClick={() => setTab('voice')} className={`text-left px-3 py-2 text-xs font-bold uppercase transition ${tab === 'voice' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-light)]'}`}>Ses & Video</button>
          <button onClick={() => setTab('appearance')} className={`text-left px-3 py-2 text-xs font-bold uppercase transition ${tab === 'appearance' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-light)]'}`}>Görünüm</button>
          <div className="flex-1" />
          <button 
            onClick={() => { logout(); onClose(); }} 
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase text-red-400 hover:text-red-300 hover:bg-red-500/10 transition mb-2"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
          <button onClick={onClose} className="pixel-btn text-xs uppercase w-full">Kapat</button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto bg-[var(--bg-dark)]/40">
          {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 mb-6">{error}</div>}

          {tab === 'profile' && (
            <div className="flex flex-col gap-8">
              <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">Kullanıcı Profili</h2>
              <div className="relative group border border-[var(--border-pixel)] overflow-hidden">
                <div className="h-24" style={{ backgroundColor: bannerColor }}>
                  <input type="color" value={bannerColor} onChange={(e) => setBannerColor(e.target.value)} className="absolute top-2 right-2 w-8 h-8 cursor-pointer opacity-0 group-hover:opacity-100 transition" />
                </div>
                <div className="bg-[var(--bg-mid)] p-6 pt-14 relative">
                  <div className="absolute -top-12 left-6 p-1 bg-[var(--bg-mid)] border border-[var(--border-pixel)]">
                    <label className="relative cursor-pointer group block">
                      <img src={preview} alt="avatar" className="w-20 h-20 object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                         <span className="text-white text-[10px] font-bold">DÜZENLE</span>
                      </div>
                      <input type="file" onChange={handleFile} className="hidden" />
                    </label>
                  </div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">{user?.username}</h3>
                </div>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Görünen Ad</label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="pixel-input text-sm" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Özel Durum (Ne yapıyorsun?)</label>
                  <input value={customStatus} onChange={(e) => setCustomStatus(e.target.value)} placeholder="Örn: Oyun oynuyor 🎮" className="pixel-input text-sm" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Hakkımda</label>
                  <textarea value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} rows={3} placeholder="Kendinden bahset..." className="pixel-input text-sm resize-none"></textarea>
                </div>
                <div className="flex flex-col gap-4 border-t border-[var(--border-pixel)] pt-6">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Profil Kartı Efekti</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'none', name: 'Sade' },
                      { id: 'glow', name: 'Işıltı' },
                      { id: 'sparkle', name: 'Parıltı' },
                      { id: 'gradient', name: 'Gradyan' }
                    ].map(e => (
                      <button key={e.id} type="button" onClick={() => { setProfileEffect(e.id); localStorage.setItem('profileEffect', e.id); }} className={`px-3 py-2 text-[10px] font-bold uppercase border-2 transition ${profileEffect === e.id ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-white' : 'border-[var(--border-pixel)] text-[var(--text-muted)] hover:text-white'}`}>
                        {e.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4 border-t border-[var(--border-pixel)] pt-6">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Kazanılan Rozetler</label>
                  <div className="flex gap-2">
                    <div className="bg-yellow-500/20 text-yellow-500 p-1.5 rounded" title="Gölün Sakini"><Zap className="w-4 h-4" /></div>
                    <div className="bg-blue-500/20 text-blue-500 p-1.5 rounded" title="Erken Destekçi"><Zap className="w-4 h-4" /></div>
                    <div className="bg-green-500/20 text-green-500 p-1.5 rounded" title="Hata Avcısı"><Gamepad className="w-4 h-4" /></div>
                  </div>
                </div>

                <button type="submit" disabled={saving} className="pixel-btn-primary self-end px-8 py-2 text-xs uppercase font-bold mt-4">
                  {saving ? 'Kaydediliyor...' : 'Profil Ayarlarını Kaydet'}
                </button>
              </form>
            </div>
          )}

          {tab === 'voice' && (
            <div className="flex flex-col gap-8 animate-fade-in">
              <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">Ses & Görüntü Ayarları</h2>
              
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Giriş Aygıtı</label>
                  <select value={selectedInput} onChange={(e) => { setSelectedInput(e.target.value); localStorage.setItem('inputDeviceId', e.target.value); }}
                    className="pixel-input text-sm">
                    <option value="default">Varsayılan Giriş</option>
                    {devices.filter(d => d.kind === 'audioinput').map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Mikrofon (${d.deviceId.slice(0,5)})`}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Çıkış Aygıtı</label>
                  <select value={selectedOutput} onChange={(e) => { setSelectedOutput(e.target.value); localStorage.setItem('outputDeviceId', e.target.value); }}
                    className="pixel-input text-sm">
                    <option value="default">Varsayılan Çıkış</option>
                    {devices.filter(d => d.kind === 'audiooutput').map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Hoparlör (${d.deviceId.slice(0,5)})`}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Uygulama Sesi</label>
                  <div className="flex items-center gap-4 bg-[var(--bg-darker)] border border-[var(--border-pixel)] px-4 py-3">
                    <span className="text-[var(--text-secondary)]"><Volume1 className="w-5 h-5" /></span>
                    <input
                      type="range" min="0" max="1" step="0.01"
                      value={soundVolume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSoundVolume(val);
                        localStorage.setItem('soundVolume', val.toString());
                      }}
                      className="flex-1 h-1 bg-[var(--bg-light)] appearance-none cursor-pointer accent-[var(--accent-primary)]"
                    />
                    <span className="text-[var(--accent-primary)]"><Volume2 className="w-5 h-5" /></span>
                    <span className="text-[var(--text-primary)] font-bold text-xs min-w-[32px]">%{(soundVolume * 100).toFixed(0)}</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="flex flex-col gap-8 animate-fade-in">
              <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">Görünüm Ayarları</h2>
              
              <div className="flex flex-col gap-8">
                {/* Tema Seçimi */}
                <div className="flex flex-col gap-4">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Tema</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'dark', name: 'Frog Dark', class: '' },
                      { id: 'amoled', name: 'AMOLED (Siyah)', class: 'theme-amoled' },
                      { id: 'light', name: 'Aydınlık', class: 'theme-light' },
                      { id: 'forest', name: 'Derin Orman', class: 'theme-forest' }
                    ].map(t => (
                      <div key={t.id} 
                        onClick={() => {
                          const root = document.documentElement;
                          root.classList.remove('theme-amoled', 'theme-light', 'theme-forest');
                          if (t.class) root.classList.add(t.class);
                          localStorage.setItem('theme', t.id);
                          setCurrentTheme(t.id);
                        }}
                        className={`p-4 border-2 cursor-pointer transition-all ${currentTheme === t.id ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'border-[var(--border-pixel)] hover:border-[var(--text-muted)] bg-[var(--bg-darker)]'}`}>
                        <span className="text-xs font-bold uppercase">{t.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vurgu Rengi */}
                <div className="flex flex-col gap-4">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Vurgu Rengi</label>
                  <div className="flex gap-4">
                    {[
                      { id: 'green', class: '' },
                      { id: 'blue', class: 'accent-blue' },
                      { id: 'purple', class: 'accent-purple' },
                      { id: 'pink', class: 'accent-pink' },
                      { id: 'gold', class: 'accent-gold' }
                    ].map(a => (
                      <div key={a.id}
                        onClick={() => {
                          const root = document.documentElement;
                          root.classList.remove('accent-blue', 'accent-purple', 'accent-pink', 'accent-gold');
                          if (a.class) root.classList.add(a.class);
                          localStorage.setItem('accent', a.id);
                          setCurrentAccent(a.id);
                        }}
                        className={`w-10 h-10 rounded-full cursor-pointer border-4 transition-all ${currentAccent === a.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        style={{ background: a.id === 'green' ? '#22c55e' : a.id === 'blue' ? '#3b82f6' : a.id === 'purple' ? '#a855f7' : a.id === 'pink' ? '#ec4899' : '#eab308' }}
                      />
                    ))}
                  </div>
                </div>

                {/* Mesaj Yoğunluğu */}
                <div className="flex flex-col gap-4">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Mesaj Yoğunluğu</label>
                  <div className="flex gap-4 bg-[var(--bg-darker)] p-1 border border-[var(--border-pixel)]">
                    <button 
                      onClick={() => { document.documentElement.classList.remove('density-compact'); localStorage.setItem('density', 'cozy'); setCurrentDensity('cozy'); }}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase transition ${currentDensity !== 'compact' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-muted)] hover:text-white'}`}>
                      Rahat (Cozy)
                    </button>
                    <button 
                      onClick={() => { document.documentElement.classList.add('density-compact'); localStorage.setItem('density', 'compact'); setCurrentDensity('compact'); }}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase transition ${currentDensity === 'compact' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-muted)] hover:text-white'}`}>
                      Kompakt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// ─── Sunucu Ayarları Modal ────────────────────────────────────
