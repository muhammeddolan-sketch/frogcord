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
  const handleSave = async (e) => { e.preventDefault(); setSaving(true); const res = await updateGuild(guild.id, name, description, iconFile); setSaving(false); if (res.success) onClose(); else setError(res.error); };
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--bg-dark)] border border-[var(--border-pixel)] w-full max-w-2xl flex overflow-hidden shadow-2xl h-[600px]" onClick={(e) => e.stopPropagation()}>
        <div className="w-48 bg-[var(--bg-darker)] flex flex-col p-6 gap-1 flex-shrink-0 border-r border-[var(--border-pixel)]">
          <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-4 truncate">{guild.name}</p>
          {isOwner && (
            <>
              <button onClick={() => { setTab('general'); setEditingRole(null); }} className={`text-left px-3 py-2 text-[10px] font-bold uppercase transition ${tab === 'general' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-light)]'}`}>Genel</button>
              <button onClick={() => { setTab('channels'); setEditingRole(null); }} className={`text-left px-3 py-2 text-[10px] font-bold uppercase transition ${tab === 'channels' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-light)]'}`}>Kanallar</button>
              <button onClick={() => { setTab('roles'); setEditingRole(null); }} className={`text-left px-3 py-2 text-[10px] font-bold uppercase transition ${tab === 'roles' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-light)]'}`}>Roller</button>
              <button onClick={() => { setTab('wiki'); setEditingRole(null); }} className={`text-left px-3 py-2 text-[10px] font-bold uppercase transition ${tab === 'wiki' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-light)]'}`}>📝 Wiki</button>
              <div className="h-px bg-[var(--border-pixel)] my-2" />
              <button onClick={() => { setTab('danger'); setEditingRole(null); }} className={`text-left px-3 py-2 text-[10px] font-bold uppercase transition ${tab === 'danger' ? 'bg-[var(--danger)] text-white' : 'text-[var(--danger)] hover:bg-red-500/10'}`}>Tehlike Bölgesi</button>
            </>
          )}
          {!isOwner && (
            <>
              <button onClick={() => { setTab('wiki'); setEditingRole(null); }} className={`text-left px-3 py-2 text-[10px] font-bold uppercase transition ${tab === 'wiki' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-light)]'}`}>📝 Wiki</button>
              <button onClick={() => { setTab('leave'); setEditingRole(null); }} className="text-left px-3 py-2 text-[10px] font-bold uppercase text-[var(--danger)] hover:bg-red-500/10">Sunucudan Ayrıl</button>
            </>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="pixel-btn text-[10px] uppercase w-full">Geri Dön</button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto bg-[var(--bg-dark)]">
          {error && <div className="text-red-400 text-[10px] bg-red-500/10 border border-red-500/20 px-3 py-2 mb-6 font-bold uppercase tracking-wider">🚨 {error}</div>}

          {tab === 'general' && (
            <form onSubmit={handleSave} className="flex flex-col gap-8">
              <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">Sunucu Genel Ayarları</h2>
              <div className="flex items-center gap-6">
                <label className="relative cursor-pointer group block">
                  <div className="w-20 h-20 bg-[var(--bg-darker)] border border-[var(--border-pixel)] overflow-hidden flex items-center justify-center text-3xl font-bold text-[var(--text-secondary)]">
                    {iconPreview ? <img src={iconPreview} alt="icon" className="w-full h-full object-cover" /> : guild.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <span className="text-white text-[9px] font-bold uppercase">Değiştir</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
                </label>
                <div className="flex-1 flex flex-col gap-2">
                   <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Sunucu Adı</label>
                   <input value={name} onChange={(e) => setName(e.target.value)} required
                    className="pixel-input text-sm w-full" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Göl Açıklaması</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  className="pixel-input text-sm w-full resize-none" placeholder="Bu gölde ne vık vıklanır?" />
              </div>
              <div className="flex justify-end pt-4 border-t border-[var(--border-pixel)]">
                <button type="submit" disabled={saving} className="pixel-btn-primary px-8 py-2 text-[10px] uppercase font-bold tracking-widest">
                  {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          )}

          {tab === 'channels' && (
            <div className="flex flex-col gap-8">
              <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">Kanal Yönetimi</h2>
              <div className="flex flex-col gap-1 border border-[var(--border-pixel)] bg-[var(--bg-darker)] p-1">
                {guild.channels?.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between hover:bg-[var(--bg-light)] px-4 py-2 transition group border border-transparent hover:border-[var(--border-pixel)]">
                    <div className="flex items-center gap-3 text-[var(--text-primary)] text-xs font-bold uppercase">
                      <span className="text-[var(--text-secondary)] opacity-50">{ch.channel_type === 'voice' ? <Volume2 className="w-3 h-3" /> : <Hash className="w-3 h-3" />}</span>
                      {ch.name}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleCreateChannel} className="flex flex-col gap-4 border-t border-[var(--border-pixel)] pt-8">
                 <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Yeni Kanal Kaz</h3>
                 <div className="flex gap-2">
                   <select value={channelType} onChange={(e) => setChannelType(e.target.value)}
                    className="pixel-input text-[10px] font-bold uppercase bg-[var(--bg-darker)] max-w-[120px]">
                    <option value="text"># Metin</option>
                    <option value="voice">Ses</option>
                  </select>
                  <input value={newChannel} onChange={(e) => setNewChannel(e.target.value)} placeholder="vık-kanalı" required
                    className="pixel-input flex-1 text-xs" />
                  <button type="submit" className="pixel-btn text-[10px] font-bold uppercase px-6">EKLE</button>
                </div>
              </form>
            </div>
          )}

          {tab === 'roles' && (
            <div className="flex flex-col gap-4 h-full">
              {!editingRole ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">Roller</h2>
                    <button onClick={() => startEditRole({ name: 'yeni kurbağa rolü', color: '#99aab5', permissions: 0 })} className="pixel-btn text-[10px] uppercase px-4 py-2">Yeni Rol</button>
                  </div>
                  <div className="flex flex-col gap-1 border border-[var(--border-pixel)] bg-[var(--bg-darker)] p-1">
                    {(roles || []).map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 transition hover:bg-[var(--bg-light)] border border-transparent hover:border-[var(--border-pixel)] group">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 border border-white/20" style={{ backgroundColor: r.color }} />
                          <span className="text-[var(--text-primary)] text-xs font-bold uppercase tracking-tight">{r.name}</span>
                        </div>
                        <div className="flex gap-4">
                          <button onClick={() => startEditRole(r)} className="text-[var(--accent-primary)] font-bold text-[9px] uppercase hover:underline">Düzenle</button>
                          {r.name !== '@everyone' && (
                            <button onClick={() => deleteRole(r.id)} className="text-[var(--danger)] font-bold text-[9px] uppercase hover:underline opacity-0 group-hover:opacity-100 transition">Sil</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-8">
                  <div className="flex items-center gap-2 text-[var(--accent-primary)] cursor-pointer hover:underline text-[10px] font-bold uppercase" onClick={() => setEditingRole(null)}>
                    <ArrowLeft className="w-4 h-4" /> 
                    <span>Listeye Dön</span>
                  </div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">"{roleName}" Rolünü Biçimlendir</h2>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Rol Adı</label>
                      <input value={roleName} onChange={(e) => setRoleName(e.target.value)}
                        className="pixel-input text-sm w-full" />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Rol Rengi</label>
                       <div className="flex items-center gap-4 bg-[var(--bg-darker)] border border-[var(--border-pixel)] p-2">
                         <input type="color" value={roleColor} onChange={(e) => setRoleColor(e.target.value)}
                          className="w-10 h-10 bg-transparent border-none cursor-pointer" />
                         <span className="text-xs font-mono text-[var(--text-primary)]">{roleColor.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 mt-2">
                        <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Vık-Yetkileri</label>
                        <div className="flex flex-col gap-1 bg-[var(--bg-darker)] border border-[var(--border-pixel)] p-1 max-h-48 overflow-y-auto">
                            {PERMISSIONS.map(p => (
                                <label key={p.bit} className="flex items-center justify-between cursor-pointer hover:bg-[var(--bg-light)] px-4 py-3 transition border border-transparent hover:border-[var(--border-pixel)]">
                                    <span className="text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-tight">{p.name}</span>
                                    <CheckSquare checked={!!(rolePerms & p.bit)} onChange={() => handleTogglePerm(p.bit)}
                                        className="w-4 h-4 rounded-none border-[var(--border-pixel)] bg-[var(--bg-dark)] checked:bg-[var(--accent-primary)]" />
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-pixel)]">
                        <button onClick={() => setEditingRole(null)} className="pixel-btn px-6 py-2 text-[10px] uppercase font-bold">İptal</button>
                        <button onClick={handleRoleSave} disabled={saving} className="pixel-btn-primary px-8 py-2 text-[10px] uppercase font-bold">
                            {saving ? 'Vıklanıyor...' : 'Kaydet'}
                        </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'danger' && (
            <div className="flex flex-col gap-8">
              <h2 className="text-lg font-bold text-[var(--danger)] uppercase tracking-wider">Tehlike Bölgesi</h2>
              <div className="bg-red-500/5 border border-red-500/20 p-6 flex flex-col gap-4">
                <div>
                   <h3 className="font-bold text-red-400 text-xs uppercase mb-1">Gölü Kurut (Sil)</h3>
                   <p className="text-[var(--text-secondary)] text-[10px] font-medium leading-relaxed uppercase tracking-tight">Bu işlem geri alınamaz. Tüm kanallar ve vık-vıklamalar ebediyen silinecek.</p>
                </div>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="pixel-btn text-[10px] font-bold uppercase text-[var(--danger)] hover:bg-red-500/20 w-fit px-6 py-2 border-[var(--danger)]/50">
                    Sunucuyu Sil
                  </button>
                ) : (
                  <div className="flex gap-4 items-center">
                    <span className="text-red-400 text-[10px] font-bold uppercase tracking-widest">EMİN MİSİN?</span>
                    <button onClick={handleDelete} className="pixel-btn bg-red-600 text-white font-bold py-2 px-6 uppercase text-[10px]">EVET, KURUT</button>
                    <button onClick={() => setConfirmDelete(false)} className="pixel-btn text-[10px] py-2 px-6 uppercase font-bold">İPTAL</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'leave' && (
            <div className="flex flex-col gap-8">
              <h2 className="text-lg font-bold text-[var(--danger)] uppercase tracking-wider">Sunucudan Ayrıl</h2>
              <div className="bg-red-500/5 border border-red-500/20 p-6 flex flex-col gap-4">
                <p className="text-[var(--text-secondary)] text-[10px] font-medium leading-relaxed uppercase tracking-tight">Bu gölden ayrılmak istediğine emin misin? Tekrar vıklamak için davete ihtiyacın olacak.</p>
                <button onClick={handleLeave} 
                  className="pixel-btn text-[10px] font-bold uppercase text-[var(--danger)] hover:bg-red-500/20 w-fit px-6 py-2 border-[var(--danger)]/50">
                  AYRIL
                </button>
              </div>
            </div>
          )}

          {tab === 'wiki' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">📝 Sunucu Wiki</h2>
              </div>
              
              {!editingWiki ? (
                <>
                  {/* Yeni Sayfa Oluştur */}
                  <div className="bg-[var(--bg-darker)] border border-[var(--border-pixel)] p-4">
                    <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3">Yeni Sayfa</h3>
                    <input value={wikiTitle} onChange={(e) => setWikiTitle(e.target.value)} placeholder="Sayfa Başlığı" className="pixel-input w-full text-xs mb-2" />
                    <div className="flex gap-2">
                      <select value={wikiCategory} onChange={(e) => setWikiCategory(e.target.value)} className="pixel-input text-[10px] font-bold uppercase bg-[var(--bg-darker)] max-w-[140px]">
                        <option value="genel">Genel</option>
                        <option value="kurallar">Kurallar</option>
                        <option value="rehber">Rehber</option>
                        <option value="sss">SSS</option>
                      </select>
                      <button onClick={async () => {
                        if (!wikiTitle.trim()) return;
                        const res = await createWikiPage(guild.id, wikiTitle.trim(), '', wikiCategory);
                        if (res.success) { setWikiTitle(''); }
                        else setError(res.error);
                      }} className="pixel-btn-primary px-4 py-2 text-[9px] uppercase font-bold">Oluştur</button>
                    </div>
                  </div>

                  {/* Sayfa Listesi */}
                  <div className="flex flex-col gap-1">
                    {(wikiPages || []).length === 0 && (
                      <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest opacity-40 text-center py-8">Henüz wiki sayfası yok</p>
                    )}
                    {(wikiPages || []).map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-[var(--bg-darker)] border border-[var(--border-pixel)] hover:border-[var(--accent-primary)]/30 transition group cursor-pointer" onClick={() => setEditingWiki(p)}>
                        <div>
                          <p className="text-[var(--text-primary)] text-xs font-bold uppercase tracking-tight">{p.title}</p>
                          <p className="text-[8px] text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-50">{p.category} • {new Date(p.created_at).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={(e) => { e.stopPropagation(); deleteWikiPage(p.id); }} className="text-[var(--danger)] text-[9px] font-bold uppercase hover:underline">Sil</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-[var(--accent-primary)] cursor-pointer hover:underline text-[10px] font-bold uppercase" onClick={() => setEditingWiki(null)}>
                    <ArrowLeft className="w-4 h-4" />
                    <span>Listeye Dön</span>
                  </div>
                  <input value={editingWiki.title} onChange={(e) => setEditingWiki({...editingWiki, title: e.target.value})} className="pixel-input text-lg font-bold" />
                  <textarea value={editingWiki.content} onChange={(e) => setEditingWiki({...editingWiki, content: e.target.value})} rows={12}
                    className="pixel-input text-xs resize-none w-full leading-relaxed" placeholder="Markdown destekli içerik yazabilirsiniz..." />
                  <div className="flex justify-end gap-3">
                    <button onClick={async () => {
                      const res = await updateWikiPage(editingWiki.id, { title: editingWiki.title, content: editingWiki.content });
                      if (res.success) setEditingWiki(null);
                      else setError(res.error);
                    }} className="pixel-btn-primary px-8 py-2 text-[10px] uppercase font-bold">Kaydet</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hızlı Kanal Oluştur ─────────────────────────────────────
