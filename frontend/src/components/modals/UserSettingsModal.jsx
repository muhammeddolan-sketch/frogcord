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
      <div className="premium-glass w-full max-w-4xl flex overflow-hidden shadow-2xl h-[650px] animate-fade-up rounded-2xl border border-white/5" onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <div className="w-60 bg-black/40 p-6 flex flex-col gap-1 border-r border-white/5 backdrop-blur-xl">
          <div className="mb-6 px-3">
            <h2 className="text-[var(--text-primary)] text-xs font-black uppercase tracking-widest opacity-40">Ayarlar</h2>
          </div>
          
          <nav className="flex flex-col gap-1 px-1">
            <button onClick={() => setTab('profile')} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 group ${tab === 'profile' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}>
              <User className={`w-4 h-4 ${tab === 'profile' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
              Kullanıcı Profili
            </button>
            <button onClick={() => setTab('voice')} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 group ${tab === 'voice' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}>
              <Mic className={`w-4 h-4 ${tab === 'voice' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
              Ses & Video
            </button>
            <button onClick={() => setTab('appearance')} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 group ${tab === 'appearance' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}>
              <Monitor className={`w-4 h-4 ${tab === 'appearance' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
              Görünüm
            </button>
          </nav>

          <div className="flex-1" />
          
          <div className="px-2 pb-2">
            <button 
              onClick={() => { logout(); onClose(); }} 
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
            >
              <span>Çıkış Yap</span>
              <LogOut className="w-4 h-4" />
            </button>
            
            <button onClick={onClose} className="mt-3 w-full py-3 bg-[var(--bg-light)] hover:bg-[var(--bg-hover)] text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2">
              <X className="w-4 h-4" />
              Kapat
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-10 overflow-y-auto bg-[var(--bg-dark)]/60 scrollbar-hide">
          {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg mb-8 animate-shake">{error}</div>}

          {tab === 'profile' && (
            <div className="flex flex-col gap-10 max-w-xl mx-auto">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight mb-1">Profilim</h1>
                <p className="text-[var(--text-secondary)] text-sm">Görünümünü özelleştir ve insanlara kendini tanıt.</p>
              </div>

              {/* Profile Card Preview */}
              <div className="relative group rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/40">
                <div className="h-28 relative overflow-hidden" style={{ backgroundColor: bannerColor }}>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
                  <label className="absolute top-4 right-4 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full cursor-pointer flex items-center justify-center text-white border border-white/10 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                    <Paperclip className="w-4 h-4" />
                    <input type="color" value={bannerColor} onChange={(e) => setBannerColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </label>
                </div>
                
                <div className="px-6 py-6 pt-16 relative">
                  <div className="absolute -top-12 left-6">
                    <label className="relative cursor-pointer group block p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
                      <img src={preview} alt="avatar" className="w-24 h-24 rounded-xl object-cover shadow-2xl" />
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-xl">
                        <Paperclip className="w-5 h-5 text-white mb-1" />
                        <span className="text-white text-[8px] font-black tracking-widest uppercase">Değiştir</span>
                      </div>
                      <input type="file" onChange={handleFile} className="hidden" />
                    </label>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{user?.username}</h3>
                      <p className="text-[var(--text-muted)] text-[11px] font-bold uppercase tracking-wider">FrogCord Deneyimli Sakini</p>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="bg-yellow-500/10 text-yellow-500 p-2 rounded-lg border border-yellow-500/20 shadow-glow cursor-help" title="Gölün Sakini"><Zap className="w-3.5 h-3.5" /></div>
                      <div className="bg-blue-500/10 text-blue-500 p-2 rounded-lg border border-blue-500/20 shadow-glow cursor-help" title="Erken Destekçi"><Zap className="w-3.5 h-3.5" /></div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-4">
                    <div className="h-px bg-white/5" />
                    <div>
                      <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Özel Durum</p>
                      <p className="text-sm text-white font-medium">{customStatus || 'Herhangi bir durum belirtilmemiş.'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full" />
                      Görünen Ad
                    </label>
                    <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-black/20 border border-white/5 p-3 rounded-xl text-sm text-white focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/10 transition-all outline-none" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full" />
                      Özel Durum
                    </label>
                    <input value={customStatus} onChange={(e) => setCustomStatus(e.target.value)} placeholder="Şu an ne yapıyorsun?" className="w-full bg-black/20 border border-white/5 p-3 rounded-xl text-sm text-white focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/10 transition-all outline-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full" />
                    Hakkımda (Markdown Destekli)
                  </label>
                  <textarea value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} rows={3} placeholder="İnsanlara kendinden bahset..." className="w-full bg-black/20 border border-white/5 p-3 rounded-xl text-sm text-white focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/10 transition-all outline-none resize-none"></textarea>
                </div>

                <div className="p-6 rounded-2xl bg-black/20 border border-white/5">
                  <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mb-4 block">Profil Kartı Efekti</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: 'none', name: 'Sade', icon: <X className="w-3.5 h-3.5" /> },
                      { id: 'glow', name: 'Işıltı', icon: <Zap className="w-3.5 h-3.5" /> },
                      { id: 'sparkle', name: 'Parıltı', icon: <Zap className="w-3.5 h-3.5" /> },
                      { id: 'gradient', name: 'Gradyan', icon: <Zap className="w-3.5 h-3.5" /> }
                    ].map(e => (
                      <button key={e.id} type="button" onClick={() => { setProfileEffect(e.id); localStorage.setItem('profileEffect', e.id); }} 
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300 ${profileEffect === e.id ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-white shadow-glow' : 'bg-white/5 border-transparent text-[var(--text-muted)] hover:bg-white/10 hover:text-white'}`}>
                        <div className={`p-2 rounded-lg ${profileEffect === e.id ? 'bg-[var(--accent-primary)]/20 shadow-glow' : 'bg-black/20'}`}>{e.icon}</div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{e.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest">Henüz kaydedilmemiş değişikliklerin var.</p>
                  <button type="submit" disabled={saving} className="px-8 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-glow hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100">
                    {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'voice' && (
            <div className="flex flex-col gap-10 max-w-xl mx-auto animate-fade-in">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight mb-1">Ses & Görüntü</h1>
                <p className="text-[var(--text-secondary)] text-sm">Giriş çıkış ayarlarını ve uygulama seslerini kontrol et.</p>
              </div>
              
              <div className="flex flex-col gap-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                      Giriş Aygıtı
                    </label>
                    <div className="relative group">
                      <select value={selectedInput} onChange={(e) => { setSelectedInput(e.target.value); localStorage.setItem('inputDeviceId', e.target.value); }}
                        className="w-full bg-black/20 border border-white/5 p-3 rounded-xl text-sm text-white focus:border-[var(--accent-primary)] appearance-none cursor-pointer outline-none transition-all">
                        <option value="default">Varsayılan Giriş</option>
                        {devices.filter(d => d.kind === 'audioinput').map(d => (
                          <option key={d.deviceId} value={d.deviceId}>{d.label || `Mikrofon (${d.deviceId.slice(0,5)})`}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none group-hover:text-white transition-colors" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                      Çıkış Aygıtı
                    </label>
                    <div className="relative group">
                      <select value={selectedOutput} onChange={(e) => { setSelectedOutput(e.target.value); localStorage.setItem('outputDeviceId', e.target.value); }}
                        className="w-full bg-black/20 border border-white/5 p-3 rounded-xl text-sm text-white focus:border-[var(--accent-primary)] appearance-none cursor-pointer outline-none transition-all">
                        <option value="default">Varsayılan Çıkış</option>
                        {devices.filter(d => d.kind === 'audiooutput').map(d => (
                          <option key={d.deviceId} value={d.deviceId}>{d.label || `Hoparlör (${d.deviceId.slice(0,5)})`}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-black/20 border border-white/5">
                  <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mb-6 block">Uygulama Sesi</label>
                  <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-2xl transition-all ${soundVolume > 0 ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shadow-glow' : 'bg-white/5 text-[var(--text-muted)]'}`}>
                      {soundVolume === 0 ? <MicOff className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <input
                        type="range" min="0" max="1" step="0.01"
                        value={soundVolume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSoundVolume(val);
                          localStorage.setItem('soundVolume', val.toString());
                        }}
                        className="w-full h-1.5 bg-white/10 appearance-none cursor-pointer accent-[var(--accent-primary)] rounded-full hover:bg-white/20 transition-all"
                      />
                      <div className="flex justify-between mt-3">
                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Sessiz</span>
                        <span className="text-sm font-black text-[var(--accent-primary)] tracking-tighter drop-shadow-sm">%{(soundVolume * 100).toFixed(0)}</span>
                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Maksimum</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-5 bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 rounded-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Zap className="w-6 h-6 text-[var(--accent-primary)] relative z-10" />
                  <div className="relative z-10">
                    <p className="text-[11px] text-[var(--accent-primary)] font-black uppercase tracking-widest mb-0.5">Vık-Susturucu (Pro)</p>
                    <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-relaxed">
                      Krisp gürültü engelleme teknolojisi ile arka plandaki tüm vık-vık seslerini otomatik olarak temizleriz.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="flex flex-col gap-10 max-w-xl mx-auto animate-fade-in">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight mb-1">Görünüm</h1>
                <p className="text-[var(--text-secondary)] text-sm">FrogCord'u kendine göre renklendir ve vık-vıkla.</p>
              </div>
              
              <div className="flex flex-col gap-10">
                {/* Tema Seçimi */}
                <div className="flex flex-col gap-4">
                  <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mb-2 block">Tema Modu</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'dark', name: 'Frog Dark', color: '#121512' },
                      { id: 'amoled', name: 'AMOLED Siyah', color: '#000000' },
                      { id: 'light', name: 'Aydınlık', color: '#ffffff' },
                      { id: 'forest', name: 'Derin Orman', color: '#0d1a0d' }
                    ].map(t => (
                      <button key={t.id} 
                        onClick={() => {
                          const root = document.documentElement;
                          root.classList.remove('theme-amoled', 'theme-light', 'theme-forest');
                          if (t.id !== 'dark') root.classList.add(`theme-${t.id}`);
                          localStorage.setItem('theme', t.id);
                          setCurrentTheme(t.id);
                        }}
                        className={`group relative p-4 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden ${currentTheme === t.id ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-glow' : 'border-white/5 bg-black/20 hover:border-white/20'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <span className={`text-xs font-black uppercase tracking-widest ${currentTheme === t.id ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-white'}`}>{t.name}</span>
                          {currentTheme === t.id && <div className="p-1 bg-[var(--accent-primary)] rounded-full"><Check className="w-3 h-3 text-white" /></div>}
                        </div>
                        <div className="flex gap-1.5 h-12">
                          <div className="w-full rounded-lg" style={{ backgroundColor: t.color }} />
                          <div className="w-1/3 bg-[var(--accent-primary)]/40 rounded-lg blur-[2px]" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vurgu Rengi */}
                <div className="flex flex-col gap-4">
                  <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mb-2 block">Vurgu Rengi</label>
                  <div className="flex flex-wrap gap-4 p-6 rounded-2xl bg-black/20 border border-white/5">
                    {[
                      { id: 'green', color: '#22c55e', name: 'Fıstık' },
                      { id: 'blue', color: '#3b82f6', name: 'Deniz' },
                      { id: 'purple', color: '#a855f7', name: 'Lavanta' },
                      { id: 'pink', color: '#ec4899', name: 'Gül' },
                      { id: 'gold', color: '#eab308', name: 'Güneş' }
                    ].map(a => (
                      <button key={a.id}
                        onClick={() => {
                          const root = document.documentElement;
                          root.classList.remove('accent-blue', 'accent-purple', 'accent-pink', 'accent-gold');
                          if (a.id !== 'green') root.classList.add(`accent-${a.id}`);
                          localStorage.setItem('accent', a.id);
                          setCurrentAccent(a.id);
                        }}
                        className="group flex flex-col items-center gap-2"
                      >
                        <div className={`w-14 h-14 rounded-2xl cursor-pointer border-4 transition-all duration-300 transform group-hover:rotate-6 ${currentAccent === a.id ? 'border-white scale-110 shadow-glow' : 'border-transparent opacity-40 hover:opacity-100'}`}
                          style={{ background: a.color }}
                        />
                        <span className={`text-[9px] font-black uppercase tracking-widest transition-all ${currentAccent === a.id ? 'text-white opacity-100' : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100'}`}>{a.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mesaj Yoğunluğu */}
                <div className="flex flex-col gap-4">
                  <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mb-2 block">Mesaj Yoğunluğu</label>
                  <div className="flex p-1.5 rounded-2xl bg-black/20 border border-white/5">
                    <button 
                      onClick={() => { document.documentElement.classList.remove('density-compact'); localStorage.setItem('density', 'cozy'); setCurrentDensity('cozy'); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${currentDensity !== 'compact' ? 'bg-[var(--accent-primary)] text-white shadow-glow' : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'}`}>
                      <Users className="w-3.5 h-3.5" />
                      Rahat
                    </button>
                    <button 
                      onClick={() => { document.documentElement.classList.add('density-compact'); localStorage.setItem('density', 'compact'); setCurrentDensity('compact'); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${currentDensity === 'compact' ? 'bg-[var(--accent-primary)] text-white shadow-glow' : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'}`}>
                      <Users className="w-3.5 h-3.5" />
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
