import React, { useState, useEffect } from 'react';
import { Users, UserPlus, MessageCircle, MoreVertical, Search, Check, X, Bell, UserMinus, Monitor, Gamepad, Zap } from 'lucide-react';
import { useFriendStore } from '../store/friendStore';
import useAuthStore from '../store/authStore';
import UserAvatar from './UserAvatar';
import { resolveUrl } from '../utils';

export default function FriendsView() {
  const { user } = useAuthStore();
  const { friends, fetchFriends, acceptFriendRequest, rejectFriendRequest, sendFriendRequest } = useFriendStore();
  
  const [activeTab, setActiveTab] = useState('online'); // 'online', 'all', 'pending', 'add'
  const [searchTerm, setSearchTerm] = useState('');
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [requestStatus, setRequestStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!newFriendUsername.trim()) return;
    
    const res = await sendFriendRequest(newFriendUsername);
    if (res.success) {
      setRequestStatus({ type: 'success', message: `İstek ${newFriendUsername} kullanıcısına gönderildi!` });
      setNewFriendUsername('');
    } else {
      setRequestStatus({ type: 'error', message: res.error });
    }
    setTimeout(() => setRequestStatus({ type: '', message: '' }), 4000);
  };

  const filteredFriends = friends.filter(f => {
    const friend = f.friend || f.sender || f.receiver;
    if (!friend) return false;
    const nameMatch = (friend.display_name || friend.username || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'online') return f.status === 'accepted' && nameMatch; // Mock online status for now
    if (activeTab === 'all') return f.status === 'accepted' && nameMatch;
    if (activeTab === 'pending') return f.status === 'pending' && nameMatch;
    return false;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-dark)] animate-fade-in overflow-hidden">
      {/* ── Header ── */}
      <div className="h-12 border-b border-[var(--border-pixel)] flex items-center px-4 justify-between bg-[var(--bg-dark)] shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] font-bold text-sm">
            <Users className="w-5 h-5 opacity-40" />
            <span className="uppercase tracking-widest text-xs">Arkadaşlar</span>
          </div>
          <div className="w-[1px] h-6 bg-[var(--border-pixel)] mx-2" />
          
          <div className="flex gap-2">
            {[
              { id: 'online', label: 'Çevrimiçi' },
              { id: 'all', label: 'Tümü' },
              { id: 'pending', label: 'Bekleyen' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-xs font-bold uppercase transition rounded-md ${activeTab === tab.id ? 'bg-[var(--bg-hover)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white'}`}
              >
                {tab.label}
                {tab.id === 'pending' && friends.filter(f => f.status === 'pending' && f.receiver_id === user?.id).length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse-slow">
                    {friends.filter(f => f.status === 'pending' && f.receiver_id === user?.id).length}
                  </span>
                )}
              </button>
            ))}
            <button 
              onClick={() => setActiveTab('add')}
              className={`px-3 py-1 text-xs font-bold uppercase transition rounded-md border border-transparent ${activeTab === 'add' ? 'text-[var(--accent-primary)] border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 shadow-sm' : 'bg-[#248046] text-white hover:bg-[#1a6334]'}`}
            >
              Arkadaş Ekle
            </button>
          </div>
        </div>
        
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin flex justify-center">
        <div className="w-full max-w-4xl">
          {activeTab === 'add' ? (
            <div className="animate-fade-up flex flex-col items-center w-full">
              <div className="max-w-xl w-full">
                <h2 className="text-white text-lg font-bold uppercase tracking-tight mb-2">Arkadaş Ekle</h2>
                <p className="text-xs text-[var(--text-muted)] mb-6 font-medium">Arkadaşlar eklemek için kullanıcının kullanıcı adını yazabilirsin. Büyük/küçük harf duyarlıdır!</p>
                
                <form onSubmit={handleSendRequest} className="relative group flex flex-col gap-4">
                  <div className="relative">
                    <input 
                      value={newFriendUsername}
                      onChange={(e) => setNewFriendUsername(e.target.value)}
                      placeholder="Kullanıcı adı yaz..." 
                      className="w-full bg-[var(--bg-darker)] border border-[var(--border-pixel)] px-4 py-4 rounded-xl text-sm focus:border-[var(--accent-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] font-medium pr-32" 
                    />
                    <button 
                      type="submit" 
                      disabled={!newFriendUsername.trim()}
                      className="absolute right-2 top-1.5 bottom-1.5 bg-[var(--accent-primary)] hover:bg-[#1a6334] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 rounded-lg text-xs font-bold uppercase transition shadow-lg active:scale-95"
                    >
                      İstek Gönder
                    </button>
                  </div>
                  
                  {requestStatus.message && (
                    <div className={`text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg border flex items-center gap-2 animate-fade-in ${requestStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                       {requestStatus.type === 'success' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                       {requestStatus.message}
                    </div>
                  )}
                </form>
                
                <div className="mt-12 flex flex-col items-center justify-center py-20 opacity-20 select-none grayscale pointer-events-none">
                   <div className="w-48 h-48 bg-[var(--bg-mid)] rounded-full flex items-center justify-center mb-8 border border-[var(--border-pixel)]">
                      <UserPlus className="w-24 h-24 text-[var(--text-muted)]" />
                   </div>
                   <p className="text-lg font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Göl yeni sakinlere her zaman açık 🐸</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1 w-full max-w-4xl">
              <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 px-2">
                {activeTab === 'online' ? `Çevrimiçi — ${filteredFriends.length}` : activeTab === 'all' ? `Tüm Arkadaşlar — ${filteredFriends.length}` : `Bekleyen İstekler — ${filteredFriends.length}`}
              </h3>
              
              <div className="flex flex-col gap-0.5">
                {filteredFriends.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 opacity-30 select-none grayscale">
                     <div className="w-32 h-32 bg-[var(--bg-mid)] rounded-full flex items-center justify-center mb-8 border border-[var(--border-pixel)]">
                        <Frown className="w-16 h-16 text-[var(--text-muted)]" />
                     </div>
                     <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] text-center max-w-[280px]">Burası biraz sessiz... Arkadaş ekleyerek gölü canlandırabilirsin!</p>
                  </div>
                ) : (
                  filteredFriends.map(f => {
                    const isIncoming = f.receiver_id === user?.id;
                    const friend = isIncoming ? f.sender : f.friend || f.receiver;
                    
                    return (
                      <div key={f.id} className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-all border border-transparent hover:border-[var(--border-pixel)]/30">
                        <div className="flex items-center gap-3">
                          <UserAvatar src={friend.avatar_url} name={friend.display_name || friend.username} size="w-10 h-10 shadow-md group-hover:shadow-lg transition-transform group-hover:scale-105" />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--text-primary)] font-bold text-sm truncate">{friend.display_name || friend.username}</span>
                              <span className="text-[var(--text-muted)] text-[10px] opacity-40 font-medium font-mono group-hover:opacity-100 transition-opacity">@{friend.username}</span>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.4)]" />
                               <span className="text-[10px] text-[var(--text-muted)] font-medium tracking-tight">Vıklıyor...</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
                          {f.status === 'pending' ? (
                            isIncoming ? (
                              <>
                                <button onClick={() => acceptFriendRequest(f.id)} className="p-2 bg-[var(--bg-darker)] hover:bg-[#248046] text-white rounded-full transition-all border border-[var(--border-pixel)] shadow-sm hover:scale-110 active:scale-95 group/btn" title="Kabul Et">
                                  <Check className="w-4 h-4 text-green-500 group-hover/btn:text-white" />
                                </button>
                                <button onClick={() => rejectFriendRequest(f.id)} className="p-2 bg-[var(--bg-darker)] hover:bg-[#da373c] text-white rounded-full transition-all border border-[var(--border-pixel)] shadow-sm hover:scale-110 active:scale-95 group/btn" title="Reddet">
                                  <X className="w-4 h-4 text-red-500 group-hover/btn:text-white" />
                                </button>
                              </>
                            ) : (
                              <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-darker)] px-3 py-1.5 rounded-full border border-[var(--border-pixel)] flex items-center gap-2 opacity-60">
                                 <Bell className="w-3 h-3 animate-bounce" /> Bekleyen İstek
                              </div>
                            )
                          ) : (
                            <>
                              <button className="p-2.5 bg-[#2b2d31] hover:bg-[var(--accent-primary)] text-white rounded-full transition-all border border-white/5 shadow-sm hover:scale-110" title="Mesaj Gönder">
                                <MessageCircle className="w-4.5 h-4.5" />
                              </button>
                              <button className="p-2.5 bg-[#2b2d31] hover:bg-orange-500 text-white rounded-full transition-all border border-white/5 shadow-sm hover:scale-110" title="Daha Fazla">
                                <MoreVertical className="w-4.5 h-4.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Frown(props) {
  return (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-frown">
      <circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  );
}
