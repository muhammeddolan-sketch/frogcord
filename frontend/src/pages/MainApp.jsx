import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Signal, Mic, MicOff, Headphones, Phone, Settings, MessageSquare, Hash, 
  Plus, Users, Paperclip, Gamepad, Home, User, Volume1, Volume2, X, Trash2, 
  LogOut, Link, Frown, Check, Square, Monitor, Video, Search, ChevronDown, 
  MessageCircle, Code, Zap
} from 'lucide-react';

// Common Components
import UserAvatar from '../components/UserAvatar';
import { resolveUrl } from '../utils';

// Contexts & Stores
import useAuthStore from '../store/authStore';
import useGuildStore from '../store/guildStore';
import { useFriendStore } from '../store/friendStore';
import { useVoice } from '../context/VoiceContext';
import apiClient from '../api/axiosClient';
import { socket } from '../socket';

// Extracted Components
import UserSettingsModal from '../components/modals/UserSettingsModal';
import GuildSettingsModal from '../components/modals/GuildSettingsModal';
import GuildModal from '../components/modals/GuildModal';
import FrogcordUltraModal from '../components/modals/FrogcordUltraModal';
import CodeSnippetModal from '../components/modals/CodeSnippetModal';

import ServerSidebar from '../components/layout/ServerSidebar';
import ChannelList from '../components/layout/ChannelList';
import DMList from '../components/layout/DMList';
import MembersPanel from '../components/layout/MembersPanel';

import MessageItem from '../components/chat/MessageItem';
import { VoiceChannelView } from '../components/VoiceChannelView';
import { VoiceStatusBar, RemoteAudio } from '../components/VoiceController';
import FriendsView from '../components/FriendsView';

export default function MainApp() {
  const { user, logout } = useAuthStore();
  const { 
    guilds, activeGuild, activeChannel, messages, 
    fetchGuilds, selectGuild, selectChannel, addMessage, removeMessage 
  } = useGuildStore();
  const { 
    friends, fetchFriends, addPendingRequest, updateRequestToAccepted, 
    acceptFriendRequest, rejectFriendRequest, sendFriendRequest 
  } = useFriendStore();
  
  const {
    currentVoiceChannel, voiceUsers, isMuted, isDeafened, isVideoOn, isScreenOn,
    speaking, othersSpeak, remoteStreams, joinVoice, leaveVoice, 
    toggleMute, toggleDeafen, toggleCamera, toggleScreen,
    voiceUsersGlobal, globalOthersSpeak,
    soundVolume, setSoundVolume
  } = useVoice();

  const [friendTab, setFriendTab] = useState('online');
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGuildSettings, setShowGuildSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [popoutUser, setPopoutUser] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  // Settings States
  const [profileEffect, setProfileEffect] = useState(() => localStorage.getItem('profileEffect') || 'none');
  
  const [channelsWidth, setChannelsWidth] = useState(() => 
    parseInt(localStorage.getItem('leftPanelWidth') || '288', 10)
  );

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Initialization
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

  // Connection handling
  useEffect(() => {
    if (user?.id) {
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

  // Channel switching logic
  useEffect(() => {
    if (!activeChannel) return;
    socket.emit('join_channel', activeChannel.id);
    
    const onMsg = (data) => { 
      if (data.channel_id === activeChannel.id) {
        addMessage(data); 
      }
    };
    
    const onTyping = ({ username }) => setTypingUsers((p) => p.includes(username) ? p : [...p, username]);
    const onStopTyping = ({ username }) => setTypingUsers((p) => p.filter((u) => u !== username));
    
    socket.on('receive_message', onMsg);
    socket.on('user_typing', onTyping);
    socket.on('user_stopped_typing', onStopTyping);
    
    return () => { 
      socket.off('receive_message', onMsg); 
      socket.off('user_typing', onTyping); 
      socket.off('user_stopped_typing', onStopTyping); 
    };
  }, [activeChannel]);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  // Event Handlers
  const handleUserClick = (e, u) => {
    e.stopPropagation();
    setPopoutUser({
      user: u,
      rect: { top: e.clientY, left: e.clientX }
    });
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (!activeChannel) return;
    socket.emit('typing_start', { channelId: activeChannel.id, username: user?.display_name || user?.username });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => 
      socket.emit('typing_stop', { channelId: activeChannel.id, username: user?.display_name || user?.username }), 
    1500);
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
      const res = await apiClient.post(`/api/channels/${activeChannel.id}/upload`, formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      const msgData = { ...res.data, channel_id: activeChannel.id };
      addMessage(msgData);
      socket.emit('send_message', msgData);
    } catch (err) { console.error(err); }
    e.target.value = '';
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

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-dark)] text-[var(--text-primary)] font-sans overflow-hidden">
      {/* Modallars */}
      {showModal && <GuildModal onClose={() => setShowModal(false)} />}
       {showProfileModal && (
        <UserSettingsModal 
          user={user} 
          onClose={() => setShowProfileModal(false)}
          soundVolume={soundVolume}
          setSoundVolume={setSoundVolume}
          profileEffect={profileEffect}
          setProfileEffect={setProfileEffect}
        />
      )}
      {showGuildSettings && activeGuild && (
        <GuildSettingsModal 
          guild={activeGuild} 
          user={user} 
          onClose={() => setShowGuildSettings(false)} 
        />
      )}

      {/* ── Sunucu Listesi ── */}
      <ServerSidebar 
        guilds={guilds} 
        activeGuild={activeGuild} 
        onGuildSelect={selectGuild} 
        onShowModal={() => setShowModal(true)}
        onHomeClick={() => selectGuild(null)}
      />

      {/* ── Kanal Listesi / DM Listesi ── */}
      <div className="relative flex flex-col bg-[var(--bg-mid)] border-r border-[var(--border-pixel)] flex-shrink-0" style={{ width: `${channelsWidth}px` }}>
        <div className="absolute right-[-2px] top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#5865f2] z-50 transition" onMouseDown={startLeftResize} />
        
        {activeGuild ? (
          <div className="flex-1 flex flex-col min-h-0">
             <div className="h-14 border-b border-[var(--bg-dark)] flex items-center justify-between px-4 font-bold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--bg-hover)] transition group flex-shrink-0" onClick={() => setShowGuildSettings(true)}>
                <div className="flex items-center gap-2 min-w-0">
                  <img src={resolveUrl(activeGuild.icon_url)} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
                  <span className="truncate">{activeGuild.name}</span>
                </div>
                <span className="text-[var(--text-muted)] text-xs opacity-0 group-hover:opacity-100 transition"><Settings className="w-4 h-4" /></span>
             </div>
             <div className="flex-1 overflow-y-auto pt-4">
                <ChannelList 
                  channels={activeGuild.channels}
                  activeChannel={activeChannel}
                  onChannelSelect={selectChannel}
                  guildId={activeGuild.id}
                  user={user}
                  voiceUsersGlobal={voiceUsersGlobal}
                  globalOthersSpeak={globalOthersSpeak}
                  activeGuild={activeGuild}
                  voiceSpeaking={speaking}
                />
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
             <div className="p-4 border-b border-[var(--border-pixel)] shadow-sm">
                <div className="flex items-center gap-2 text-gray-200 font-bold px-1">
                  <Users className="w-6 h-6 text-[var(--accent-primary)]" />
                  <span className="text-lg">FrogCord</span>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto pt-4">
               <DMList 
                 friends={friends}
                 activeChannel={activeChannel}
                 onSelectDM={(uId) => console.log("DM Select:", uId)}
               />
             </div>
          </div>
        )}

        {/* User Controls Panel */}
        <div className="mt-auto bg-[var(--bg-light)] flex flex-col flex-shrink-0 z-10 border-t border-[var(--border-pixel)]">
          {currentVoiceChannel && (
            <VoiceStatusBar 
              channel={currentVoiceChannel} 
              onLeave={leaveVoice}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              isDeafened={isDeafened}
              onToggleDeafen={toggleDeafen}
              isVideoOn={isVideoOn}
              onToggleCamera={toggleCamera}
              isScreenOn={isScreenOn}
              onToggleScreen={toggleScreen}
              onTitleClick={() => selectChannel(currentVoiceChannel)}
            />
          )}
          
          <div className="flex items-center p-1.5">
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 hover:bg-[var(--bg-hover)] rounded-md px-2 py-1 transition w-full min-w-0 group">
              <div className="relative flex-shrink-0">
                <UserAvatar src={user?.avatar_url} name={user?.username} size="w-8 h-8" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--accent-primary)] border-2 border-[var(--bg-light)] rounded-full" />
              </div>
              <div className="min-w-0 text-left">
                <div className="text-[13px] font-bold text-[var(--text-primary)] truncate tracking-tight">{user?.display_name || user?.username}</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate opacity-70">Profil Ayarları</div>
              </div>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition text-[var(--text-muted)]">
                <Settings className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Chat Alanı ── */}
      <div className="flex-1 flex flex-col bg-[var(--bg-dark)] min-w-0">
        {activeChannel ? (
          <>
            {activeChannel.channel_type === 'voice' ? (
              <VoiceChannelView channel={activeChannel} user={user} />
            ) : (
              <>
                <div className="h-14 border-b border-[var(--border-pixel)] flex items-center px-4 font-semibold text-[var(--text-primary)] gap-2 flex-shrink-0">
                  <span className="text-[var(--text-muted)]"><Hash className="w-6 h-6" /></span>
                  <span>{activeChannel.name}</span>
                  <div className="ml-auto flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <span className="w-2 h-2 bg-[var(--accent-primary)] rounded-full" />
                    {onlineUsers.length} çevrimiçi
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-1">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] animate-fade-in">
                      <Hash className="w-16 h-16 opacity-20 mb-4" />
                      <p className="font-bold text-[var(--text-primary)] text-xl">{activeChannel.name} kanalına hoş geldin!</p>
                      <p className="text-sm">Burası {activeChannel.name} kanalının başlangıcı.</p>
                    </div>
                  )}
                  <div className="flex flex-col mt-auto">
                    {messages.map((msg, idx) => {
                      const prev = messages[idx - 1];
                      const sameAuthor = prev && (prev.author?.id || prev.author_id) === (msg.author?.id || msg.author_id);
                      return (
                        <MessageItem 
                          key={msg.id || idx} 
                          message={msg} 
                          user={user} 
                          isCompact={sameAuthor}
                          onUserClick={handleUserClick}
                        />
                      );
                    })}
                  </div>
                  <div ref={messagesEndRef} />
                </div>

                {typingUsers.length > 0 && (
                  <div className="px-6 py-1 text-xs text-[#949ba4] flex items-center gap-2 h-6">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 bg-[#949ba4] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                    <span><strong>{typingUsers.join(', ')}</strong> yazıyor...</span>
                  </div>
                )}

                <div className="p-4 pt-1 flex-shrink-0">
                  <div className="bg-[var(--bg-mid)] rounded-lg px-4 py-3 flex items-center gap-2 border border-[var(--border-pixel)]">
                    <button onClick={() => fileInputRef.current?.click()} className="text-[var(--text-muted)] hover:text-gray-200 transition" title="Dosya yükle">
                      <Paperclip className="w-6 h-6" />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <input 
                      type="text" 
                      placeholder={`#${activeChannel.name} kanalına mesaj gönder`}
                      className="bg-transparent border-none outline-none w-full text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm"
                      value={inputValue} 
                      onChange={handleInputChange} 
                      onKeyDown={handleSendMessage} 
                    />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <FriendsView />
        )}
      </div>

      {/* ── Sağ: Üye Paneli ── */}
      {activeGuild && (
        <MembersPanel 
          onlineUsers={onlineUsers} 
          currentUser={user} 
          onUserClick={handleUserClick}
          activeGuild={activeGuild}
        />
      )}

      {/* Profile Popout */}
      {popoutUser && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setPopoutUser(null)} />
          <div 
            className="fixed z-[110] w-80 bg-[var(--bg-dark)] rounded-lg shadow-2xl overflow-hidden border border-[var(--border-pixel)]"
            style={{
              top: Math.min(popoutUser.rect.top, window.innerHeight - 350),
              left: Math.min(popoutUser.rect.left + 20, window.innerWidth - 340)
            }}
          >
            <div className="h-16" style={{ backgroundColor: popoutUser.user.banner_color || '#5865f2' }} />
            <div className="px-4 pb-4 relative">
              <div className="w-20 h-20 rounded-full border-[6px] border-[var(--bg-dark)] absolute -top-10 left-4 bg-[var(--bg-light)]">
                <img src={resolveUrl(popoutUser.user.avatarUrl || popoutUser.user.avatar_url)} alt="" className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="pt-14">
                <p className="text-xl font-bold text-gray-200">{popoutUser.user.displayName || popoutUser.user.display_name || popoutUser.user.username}</p>
                <p className="text-sm text-gray-400 font-medium">@{popoutUser.user.username}</p>
              </div>
              <div className="my-3 h-[1px] bg-[var(--border-pixel)]" />
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-400 uppercase">Hakkında</p>
                <p className="text-sm text-gray-300 break-words">{popoutUser.user.aboutMe || popoutUser.user.about_me || 'Bu çok havalı bir FrogCord kullanıcısı!'}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Audio Manager */}
      {currentVoiceChannel && Object.entries(remoteStreams).map(([sid, stream]) => (
        <RemoteAudio key={sid} stream={stream} muted={isDeafened} />
      ))}
    </div>
  );
}
