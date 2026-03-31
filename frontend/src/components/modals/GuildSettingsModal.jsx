import React, { useState, useEffect, useRef } from 'react';
import { Signal, Mic, MicOff, Headphones, Phone, Settings, MessageSquare, Hash, Plus, Users, Paperclip, Gamepad, Home, User, Volume1, Volume2, X, Trash2, LogOut, Link, Frown, Check, CheckSquare, Clipboard, Zap, ArrowLeft, Video, Monitor, ChevronDown, Search, MessageCircle, Code, FileText } from 'lucide-react';
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

export default // ─── Sunucu Ayarları Modal ────────────────────────────────────
function GuildSettingsModal({ guild, user, onClose }) {
  const { updateGuild, deleteGuild, leaveGuild, createChannel, roles, createRole, updateRole, deleteRole, wikiPages, fetchWiki, createWikiPage, updateWikiPage, deleteWikiPage } = useGuildStore();
  const [tab, setTab] = useState('general');
  const [editingRole, setEditingRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#99aab5');
  const [rolePerms, setRolePerms] = useState(0);
  const [name, setName] = useState(guild.name);
  const [description, setDescription] = useState(guild.description || '');
  const [region, setRegion] = useState(guild.region || 'derin-gol');
  const [systemChannelId, setSystemChannelId] = useState(guild.system_channel_id || '');
  const [afkChannelId, setAfkChannelId] = useState(guild.afk_channel_id || '');
  const [afkTimeout, setAfkTimeout] = useState(guild.afk_timeout || 300);
  const [verificationLevel, setVerificationLevel] = useState(guild.verification_level || 0);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(resolveUrl(guild.icon_url));
  const [newChannel, setNewChannel] = useState('');
  const [channelType, setChannelType] = useState('text');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOwner = guild.owner_id === user?.id;

  // Wiki state
  const [wikiTitle, setWikiTitle] = useState('');
  const [wikiContent, setWikiContent] = useState('');
  const [wikiCategory, setWikiCategory] = useState('genel');
  const [editingWiki, setEditingWiki] = useState(null);

  useEffect(() => { fetchWiki(guild.id); }, [guild.id]);

  const handleIconChange = (e) => { const f = e.target.files[0]; if (!f) return; setIconFile(f); setIconPreview(URL.createObjectURL(f)); };
  
  const handleSave = async (e) => { 
    e.preventDefault(); 
    setSaving(true); 
    const res = await updateGuild(guild.id, name, description, iconFile, region, systemChannelId, afkChannelId, afkTimeout, verificationLevel); 
    setSaving(false); 
    if (res.success) onClose(); 
    else setError(res.error); 
  };

  const handleDelete = async () => { const res = await deleteGuild(guild.id); if (res.success) onClose(); else setError(res.error); };
  const handleLeave = async () => { const res = await leaveGuild(guild.id); if (res.success) onClose(); else setError(res.error); };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannel.trim()) return;
    const res = await createChannel(guild.id, newChannel.trim().toLowerCase().replace(/\s+/g, '-'), channelType);
    if (res.success) setNewChannel(''); else setError(res.error);
  };

  const startEditRole = (r) => {
    setEditingRole(r);
    setRoleName(r.name);
    setRoleColor(r.color);
    setRolePerms(r.permissions);
  };

  const handleRoleSave = async () => {
    setSaving(true);
    let res;
    if (editingRole?.id) {
      res = await updateRole(editingRole.id, { name: roleName, color: roleColor, permissions: rolePerms });
    } else {
      res = await createRole(guild.id, roleName, roleColor, rolePerms);
    }
    setSaving(false);
    if (res.success) setEditingRole(null); else setError(res.error);
  };

  const handleTogglePerm = (bit) => {
    setRolePerms(p => (p & bit) ? (p & ~bit) : (p | bit));
  };

  return (
      <div className="premium-glass w-full max-w-4xl flex overflow-hidden shadow-2xl h-[650px] rounded-2xl border border-white/5" onClick={(e) => e.stopPropagation()}>
        <div className="w-60 bg-black/40 flex flex-col p-6 gap-1 flex-shrink-0 border-r border-white/5 backdrop-blur-xl">
          <div className="mb-6 px-3">
            <h2 className="text-[var(--text-primary)] text-xs font-black uppercase tracking-widest opacity-40 truncate">{guild.name}</h2>
          </div>
          
          <nav className="flex flex-col gap-1 px-1">
            {isOwner && (
              <>
                <button onClick={() => { setTab('general'); setEditingRole(null); }} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 group ${tab === 'general' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}>
                  <Settings className={`w-4 h-4 ${tab === 'general' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
                  Genel
                </button>
                <button onClick={() => { setTab('channels'); setEditingRole(null); }} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 group ${tab === 'channels' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}>
                  <Hash className={`w-4 h-4 ${tab === 'channels' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
                  Kanallar
                </button>
                <button onClick={() => { setTab('roles'); setEditingRole(null); }} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 group ${tab === 'roles' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}>
                  <Users className={`w-4 h-4 ${tab === 'roles' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
                  Roller
                </button>
                <button onClick={() => { setTab('wiki'); setEditingRole(null); }} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 group ${tab === 'wiki' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}>
                  <Code className={`w-4 h-4 ${tab === 'wiki' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
                  Wiki
                </button>
                <div className="h-px bg-white/5 my-3 mx-3" />
                <button onClick={() => { setTab('danger'); setEditingRole(null); }} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 group ${tab === 'danger' ? 'bg-red-500/10 text-red-400' : 'text-red-400/60 hover:text-red-400 hover:bg-red-500/5'}`}>
                  <Trash2 className="w-4 h-4" />
                  Tehlike Bölgesi
                </button>
              </>
            )}
            {!isOwner && (
              <>
                <button onClick={() => { setTab('wiki'); setEditingRole(null); }} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 group ${tab === 'wiki' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}>
                  <Code className={`w-4 h-4 ${tab === 'wiki' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
                  Wiki
                </button>
                <button onClick={() => { setTab('leave'); setEditingRole(null); }} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200">
                  <LogOut className="w-4 h-4" />
                  Sunucudan Ayrıl
                </button>
              </>
            )}
          </nav>

          <div className="flex-1" />
          
          <div className="px-2 pb-2">
            <button onClick={onClose} className="w-full py-3 bg-[var(--bg-light)] hover:bg-[var(--bg-hover)] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Geri Dön
            </button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto bg-[var(--bg-dark)]">
          {error && <div className="text-red-400 text-[10px] bg-red-500/10 border border-red-500/20 px-3 py-2 mb-6 font-bold uppercase tracking-wider">🚨 {error}</div>}

          {tab === 'general' && (
            <form onSubmit={handleSave} className="flex flex-col gap-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">Sunucu Genel Ayarları</h2>
              
              {/* Sunucu İkonu ve Adı */}
              <div className="flex items-start gap-6">
                <label className="relative cursor-pointer group block flex-shrink-0">
                  <div className="w-24 h-24 bg-[var(--bg-darker)] border border-[var(--border-pixel)] overflow-hidden flex items-center justify-center text-4xl font-bold text-[var(--text-secondary)]">
                    {iconPreview ? <img src={iconPreview} alt="icon" className="w-full h-full object-cover" /> : guild.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <span className="text-white text-[9px] font-bold uppercase">Değiştir</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
                </label>
                
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Sunucu Adı</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} required
                      className="pixel-input text-sm w-full" />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Göl Bölgesi (Region)</label>
                    <select value={region} onChange={(e) => setRegion(e.target.value)} className="pixel-input text-xs font-bold uppercase bg-[var(--bg-darker)]">
                      <option value="derin-gol">Derin Göl (Avrupa)</option>
                      <option value="kuzey-bataklik">Kuzey Bataklığı (Asya)</option>
                      <option value="gizli-dere">Gizli Dere (ABD)</option>
                      <option value="guney-sazlik">Güney Sazlığı (Brezilya)</option>
                      <option value="donmus-göl">Donmuş Göl (Rusya)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Göl Açıklaması</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  className="pixel-input text-sm w-full resize-none leading-relaxed" placeholder="Bu gölde ne vık vıklanır?" />
              </div>

              <div className="h-px bg-[var(--border-pixel)] my-2" />

              {/* Gelişmiş Ayarlar Bölümü */}
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    Sistem Kanalı
                  </label>
                  <select value={systemChannelId} onChange={(e) => setSystemChannelId(e.target.value)} className="pixel-input text-xs bg-[var(--bg-darker)]">
                    <option value="">Kanal Seçin...</option>
                    {guild.channels?.filter(c => c.channel_type === 'text').map(c => (
                      <option key={c.id} value={c.id}># {c.name}</option>
                    ))}
                  </select>
                  <p className="text-[8px] text-[var(--text-muted)] uppercase font-bold tracking-tighter">Yeni vık-vıklar buraya düşer.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    AFK (Uyku) Kanalı
                  </label>
                  <select value={afkChannelId} onChange={(e) => setAfkChannelId(e.target.value)} className="pixel-input text-xs bg-[var(--bg-darker)]">
                    <option value="">Kanal Seçin...</option>
                    {guild.channels?.filter(c => c.channel_type === 'voice').map(c => (
                      <option key={c.id} value={c.id}>🔊 {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Uyku Zaman Aşımı</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { l: '5 DK', v: 300 },
                      { l: '15 DK', v: 900 },
                      { l: '1 SAAT', v: 3600 }
                    ].map(t => (
                      <button key={t.v} type="button" onClick={() => setAfkTimeout(t.v)} className={`py-2 text-[8px] font-bold border transition-all ${afkTimeout === t.v ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-sm' : 'bg-black/10 border-[var(--border-pixel)] text-[var(--text-muted)] hover:text-white'}`}>
                        {t.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    Güvenlik Seviyesi
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { l: 'YOK', v: 0 },
                      { l: 'E-POSTA', v: 1 },
                      { l: 'YÜKSEK', v: 2 }
                    ].map(lv => (
                      <button key={lv.v} type="button" onClick={() => setVerificationLevel(lv.v)} className={`py-2 text-[8px] font-bold border transition-all ${verificationLevel === lv.v ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-sm' : 'bg-black/10 border-[var(--border-pixel)] text-[var(--text-muted)] hover:text-white'}`}>
                        {lv.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[var(--border-pixel)] mt-2">
                <button type="submit" disabled={saving} className="pixel-btn-primary px-10 py-2.5 text-[10px] uppercase font-bold tracking-widest shadow-lg active:scale-95 transition-transform">
                  {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          )}

          {tab === 'channels' && (
            <div className="flex flex-col gap-10 max-w-2xl mx-auto animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight mb-1">Kanal Yönetimi</h1>
                  <p className="text-[var(--text-secondary)] text-sm">Sunucudaki yaşam alanlarını düzenle.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-1.5 rounded-2xl bg-black/20 border border-white/5">
                {guild.channels?.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between hover:bg-white/5 px-5 py-4 rounded-xl transition-all group border border-transparent hover:border-white/5">
                    <div className="flex items-center gap-4 text-white text-sm font-bold">
                      <div className="p-2 bg-black/20 rounded-lg text-[var(--accent-primary)] group-hover:scale-110 transition-transform">
                        {ch.channel_type === 'voice' ? <Volume2 className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                      </div>
                      <span className="uppercase tracking-widest">{ch.name}</span>
                    </div>
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                      <button className="p-2 hover:bg-white/10 rounded-lg text-[var(--text-muted)] hover:text-white transition-all"><Settings className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleCreateChannel} className="flex flex-col gap-6 p-8 rounded-3xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-[var(--accent-primary)]/20 rounded-xl"><Plus className="w-5 h-5 text-[var(--accent-primary)]" /></div>
                   <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Yeni Kanal Oluştur</h3>
                 </div>
                 
                 <div className="flex gap-4">
                   <div className="relative group min-w-[140px]">
                     <select value={channelType} onChange={(e) => setChannelType(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest appearance-none cursor-pointer outline-none transition-all focus:border-[var(--accent-primary)]">
                        <option value="text"># Metin</option>
                        <option value="voice">🔊 Sesli</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none group-hover:text-white" />
                   </div>
                   <input value={newChannel} onChange={(e) => setNewChannel(e.target.value)} placeholder="kanal-adi" required
                    className="flex-1 bg-black/40 border border-white/10 p-3.5 rounded-xl text-sm text-white focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/10 outline-none transition-all" />
                   <button type="submit" className="px-8 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-glow active:scale-95">EKLE</button>
                </div>
              </form>
            </div>
          )}

          {tab === 'roles' && (
            <div className="flex flex-col gap-8 h-full max-w-2xl mx-auto animate-fade-in">
              {!editingRole ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-black text-white tracking-tight mb-1">Roller</h1>
                      <p className="text-[var(--text-secondary)] text-sm">Üyeleri yetkilendir ve renklendir.</p>
                    </div>
                    <button onClick={() => startEditRole({ name: 'yeni rol', color: '#99aab5', permissions: 0 })} className="px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-glow active:scale-95">Yeni Rol</button>
                  </div>
                  
                  <div className="flex flex-col gap-2 p-1.5 rounded-2xl bg-black/20 border border-white/5">
                    {(roles || []).map(r => (
                      <div key={r.id} className="flex items-center justify-between p-4 px-5 rounded-xl transition-all hover:bg-white/5 group border border-transparent hover:border-white/5">
                        <div className="flex items-center gap-4">
                          <div className="w-4 h-4 rounded-full border-2 border-white/20 shadow-sm" style={{ backgroundColor: r.color }} />
                          <span className="text-white text-sm font-black uppercase tracking-[0.15em]">{r.name}</span>
                        </div>
                        <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => startEditRole(r)} className="px-3 py-1.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[var(--accent-primary)]/20 transition-all">Düzenle</button>
                          {r.name !== '@everyone' && (
                            <button onClick={() => deleteRole(r.id)} className="px-3 py-1.5 bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500/20 transition-all">Sil</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-10">
                  <div className="flex items-center justify-between">
                    <button className="flex items-center gap-2 text-[var(--accent-primary)] hover:underline text-[10px] font-black uppercase tracking-widest" onClick={() => setEditingRole(null)}>
                      <ArrowLeft className="w-4 h-4" /> 
                      Listeye Dön
                    </button>
                    <div className="px-3 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-lg text-[9px] font-black uppercase tracking-widest border border-[var(--accent-primary)]/20">Düzenleniyor</div>
                  </div>

                  <div className="p-8 rounded-3xl bg-black/20 border border-white/5 flex flex-col gap-8 shadow-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="flex flex-col gap-3">
                        <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full" />
                          Rol Adı
                        </label>
                        <input value={roleName} onChange={(e) => setRoleName(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl text-sm text-white focus:border-[var(--accent-primary)] outline-none transition-all" />
                      </div>
                      <div className="flex flex-col gap-3">
                         <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                           <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full" />
                           Göl Rengi
                         </label>
                         <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-2.5 rounded-xl">
                           <input type="color" value={roleColor} onChange={(e) => setRoleColor(e.target.value)}
                            className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                           <span className="text-xs font-black text-white tracking-widest font-mono">{roleColor.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <label className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-[0.2em]">Sunucu Yetkileri</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 border border-white/5 rounded-2xl bg-black/10 max-h-60 overflow-y-auto scrollbar-hide">
                            {PERMISSIONS.map(p => (
                                <label key={p.bit} className="flex items-center justify-between cursor-pointer hover:bg-white/5 px-4 py-3 rounded-xl transition-all group border border-transparent hover:border-white/5">
                                    <span className="text-white text-[10px] font-bold uppercase tracking-tight opacity-70 group-hover:opacity-100">{p.name}</span>
                                    <div className="relative">
                                      <input type="checkbox" checked={!!(rolePerms & p.bit)} onChange={() => handleTogglePerm(p.bit)}
                                          className="w-5 h-5 rounded-lg border-white/10 bg-black/40 checked:bg-[var(--accent-primary)] cursor-pointer appearance-none transition-all border-2" />
                                      {!!(rolePerms & p.bit) && <Check className="absolute inset-0 m-auto w-3 h-3 text-white pointer-events-none" />}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-white/5">
                        <button onClick={() => setEditingRole(null)} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">İptal</button>
                        <button onClick={handleRoleSave} disabled={saving} className="px-10 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-glow active:scale-95 disabled:opacity-50">
                            {saving ? 'Vıklanıyor...' : 'Kaydet'}
                        </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'danger' && (
            <div className="flex flex-col gap-8 max-w-xl mx-auto animate-fade-in">
              <div>
                <h1 className="text-2xl font-black text-red-400 tracking-tight mb-1">Tehlike Bölgesi</h1>
                <p className="text-[var(--text-secondary)] text-sm">Dikkat: Bu işlemler geri alınamaz.</p>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 p-8 rounded-3xl flex flex-col gap-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Trash2 className="w-24 h-24 text-red-500" /></div>
                <div>
                   <h3 className="font-black text-red-400 text-xs uppercase tracking-[0.2em] mb-2">Gölü Kurut (Sil)</h3>
                   <p className="text-[var(--text-secondary)] text-xs font-medium leading-relaxed uppercase tracking-tight">Tüm kanallar, vık-vıklamalar ve wiki sayfaları ebediyen silinecek.</p>
                </div>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="px-8 py-4 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-red-500 hover:text-white transition-all w-fit shadow-lg shadow-red-500/5">
                    Sunucuyu Sil
                  </button>
                ) : (
                  <div className="flex gap-4 items-center animate-shake">
                    <span className="text-red-400 text-[10px] font-black uppercase tracking-[0.2em]">EMİN MİSİN?</span>
                    <button onClick={handleDelete} className="px-8 py-3 bg-red-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-glow active:scale-95">EVET</button>
                    <button onClick={() => setConfirmDelete(false)} className="px-8 py-3 bg-white/5 text-white text-[10px] font-black uppercase rounded-xl tracking-widest">İPTAL</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'leave' && (
            <div className="flex flex-col gap-8 max-w-xl mx-auto animate-fade-in">
              <div>
                <h1 className="text-2xl font-black text-red-400 tracking-tight mb-1">Ayrıl</h1>
                <p className="text-[var(--text-secondary)] text-sm">Sunucudan ayrılmak üzeresin.</p>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 p-8 rounded-3xl flex flex-col gap-6">
                <p className="text-[var(--text-secondary)] text-[11px] font-medium leading-relaxed uppercase tracking-widest">Bu gölden ayrılmak istediğine emin misin? Tekrar vıklamak için yeni bir davete ihtiyacın olacak.</p>
                <button onClick={handleLeave} 
                  className="px-10 py-4 bg-red-400/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-[10px] font-black uppercase rounded-xl tracking-widest transition-all w-fit shadow-lg shadow-red-500/5">
                  AYRIL
                </button>
              </div>
            </div>
          )}

          {tab === 'wiki' && (
            <div className="flex flex-col gap-8 max-w-3xl mx-auto animate-fade-in">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight mb-1">📝 Sunucu Wiki</h1>
                <p className="text-[var(--text-secondary)] text-sm">Sunucunun tarihçesi ve kuralları burada yaşar.</p>
              </div>
              
              {!editingWiki ? (
                <div className="flex flex-col gap-10">
                  {/* Yeni Sayfa Oluştur */}
                  <div className="bg-black/20 border border-white/5 p-8 rounded-3xl flex flex-col gap-6 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--accent-primary)]/20 rounded-xl"><Plus className="w-5 h-5 text-[var(--accent-primary)]" /></div>
                      <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Yeni Bilgi Sayfası Katmanlaşdır</h3>
                    </div>
                    <div className="flex flex-col gap-4">
                      <input value={wikiTitle} onChange={(e) => setWikiTitle(e.target.value)} placeholder="Sayfa Başlığı" className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl text-sm text-white focus:border-[var(--accent-primary)] outline-none" />
                      <div className="flex gap-4">
                        <div className="relative group flex-1">
                          <select value={wikiCategory} onChange={(e) => setWikiCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl text-[10px] font-black uppercase text-white tracking-widest appearance-none cursor-pointer outline-none">
                            <option value="genel">Genel</option>
                            <option value="kurallar">Kurallar</option>
                            <option value="rehber">Rehber</option>
                            <option value="sss">SSS</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none group-hover:text-white" />
                        </div>
                        <button onClick={async () => {
                          if (!wikiTitle.trim()) return;
                          const res = await createWikiPage(guild.id, wikiTitle.trim(), '', wikiCategory);
                          if (res.success) { setWikiTitle(''); }
                          else setError(res.error);
                        }} className="px-10 py-3.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-glow transition-all active:scale-95">Oluştur</button>
                      </div>
                    </div>
                  </div>

                  {/* Sayfa Listesi */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(wikiPages || []).length === 0 && (
                      <div className="col-span-full py-20 flex flex-col items-center gap-4 opacity-30">
                        <Code className="w-16 h-16" />
                        <p className="text-xs font-black uppercase tracking-[0.3em]">Bilgelik sayfanız henüz boş...</p>
                      </div>
                    )}
                    {(wikiPages || []).map(p => (
                      <div key={p.id} className="group p-6 bg-black/20 border border-white/5 rounded-3xl hover:border-[var(--accent-primary)]/50 transition-all cursor-pointer relative overflow-hidden shadow-lg active:scale-95" onClick={() => setEditingWiki(p)}>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 scale-150 transition-all"><FileText className="w-12 h-12" /></div>
                        <p className="text-[var(--accent-primary)] text-[9px] font-black uppercase tracking-[0.2em] mb-2">{p.category}</p>
                        <h3 className="text-white text-lg font-black tracking-tight mb-1 group-hover:translate-x-1 transition-transform">{p.title}</h3>
                        <p className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest">{new Date(p.created_at).toLocaleDateString('tr-TR')} tarihinde vıklandı</p>
                        
                        <div className="mt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all">
                           <span className="text-[9px] font-black text-white px-3 py-1 bg-white/5 rounded-full uppercase tracking-widest">OKU & DÜZENLE</span>
                           <button onClick={(e) => { e.stopPropagation(); deleteWikiPage(p.id); }} className="p-2 text-red-500/50 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-8 animate-fade-in h-[500px]">
                  <div className="flex items-center justify-between">
                    <button className="flex items-center gap-2 text-[var(--accent-primary)] hover:underline text-[10px] font-black uppercase tracking-widest" onClick={() => setEditingWiki(null)}>
                      <ArrowLeft className="w-4 h-4" />
                      Listeye Dön
                    </button>
                    <span className="px-4 py-1.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-[9px] font-black uppercase tracking-widest border border-[var(--accent-primary)]/20 animate-pulse">Düzenleme Modu</span>
                  </div>
                  
                  <div className="flex flex-col gap-4 flex-1">
                    <input value={editingWiki.title} onChange={(e) => setEditingWiki({...editingWiki, title: e.target.value})} className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-2xl font-black text-white focus:border-[var(--accent-primary)] outline-none tracking-tight" />
                    <textarea value={editingWiki.content} onChange={(e) => setEditingWiki({...editingWiki, content: e.target.value})}
                      className="flex-1 w-full bg-black/40 border border-white/5 p-6 rounded-3xl text-sm text-white focus:border-[var(--accent-primary)] outline-none leading-relaxed resize-none scrollbar-hide font-medium" placeholder="Markdown desteği ile bilgiyi buraya kaz..." />
                  </div>

                  <div className="flex justify-end gap-4 p-4 bg-black/20 border border-white/5 rounded-2xl">
                    <button onClick={() => setEditingWiki(null)} className="px-8 py-3 text-[10px] font-black text-white uppercase hover:bg-white/5 rounded-xl transition-all">İptal</button>
                    <button onClick={async () => {
                      const res = await updateWikiPage(editingWiki.id, { title: editingWiki.title, content: editingWiki.content });
                      if (res.success) setEditingWiki(null);
                      else setError(res.error);
                    }} className="px-12 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-glow">Bilgiyi Sakla</button>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

// ─── Yetki Bitmaskleri ─────────────────────────────────────
const PERMISSIONS = [
  { name: 'Sunucuyu Yönet', bit: 1 },
  { name: 'Rolleri Yönet', bit: 2 },
  { name: 'Kanalları Yönet', bit: 4 },
  { name: 'Üyeleri At (Kick)', bit: 8 },
  { name: 'Üyeleri Yasakla (Ban)', bit: 16 },
  { name: 'Mesajları Yönet', bit: 32 },
  { name: 'Takma Ad Değiştir', bit: 64 },
  { name: 'Başkasının Takma Adını Değiştir', bit: 128 },
  { name: 'Emoji Yönet', bit: 256 },
  { name: 'Webhook Yönet', bit: 512 },
  { name: 'Mesaj Gönder', bit: 1024 },
  { name: 'Mesaj Geçmişini Oku', bit: 2048 },
  { name: 'Bahsetme (@everyone)', bit: 4096 },
  { name: 'Sesli Bağlan', bit: 8192 },
  { name: 'Sesli Konuş', bit: 16384 },
  { name: 'Video Paylaş', bit: 32768 },
];
