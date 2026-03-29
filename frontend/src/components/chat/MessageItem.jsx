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

export default // ─── Mesaj Öğesi (Chat Area) ──────────────────────────────────
function MessageItem({ message, user, isCompact, onUserClick }) {
  const authorName = message.author?.display_name || message.author?.username || 'Göl Sakini';
  const [showFullImage, setShowFullImage] = useState(false);

  const formatTimeStr = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (content) => {
    if (!content) return null;
    
    // Image Support
    if (content.startsWith('[image:')) {
      const url = content.slice(7, -1);
      return (
        <div className="relative mt-2">
           <img 
            src={resolveUrl(url)} 
            alt="resim" 
            className="max-w-[400px] max-h-[300px] rounded-lg border border-white/5 shadow-2xl hover:brightness-110 transition cursor-zoom-in" 
            onClick={() => setShowFullImage(true)} 
          />
          {showFullImage && (
            <div className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-10" onClick={() => setShowFullImage(false)}>
              <img src={resolveUrl(url)} className="max-w-full max-h-full object-contain shadow-2xl animate-scale-in" alt="full" />
              <button className="absolute top-10 right-10 text-white hover:scale-110 transition"><X className="w-8 h-8" /></button>
            </div>
          )}
        </div>
      );
    }
    
    // Video Support
    if (content.startsWith('[video:')) {
      const url = content.slice(7, -1);
      return (
        <div className="max-w-[400px] mt-2 rounded-lg overflow-hidden border border-white/5 shadow-2xl">
          <video controls className="w-full h-auto max-h-[300px] bg-black">
            <source src={resolveUrl(url)} />
          </video>
        </div>
      );
    }
    
    // File Support [file:isim:url]
    if (content.startsWith('[file:')) {
      const parts = content.slice(6, -1).split(':');
      if (parts.length >= 2) {
        const fileName = parts[0];
        const fileUrl = parts.slice(1).join(':');
        return (
          <div className="flex items-center gap-4 bg-[#2e3035] border border-white/5 p-3 mt-2 rounded-lg max-w-[400px] group hover:border-[#5865f2] transition-all">
            <div className="w-10 h-10 bg-[#1e1f22] flex items-center justify-center rounded border border-white/5 text-[#5865f2] group-hover:scale-110 transition-transform">
              <Paperclip className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-[13px] font-bold text-white truncate">{fileName}</p>
               <p className="text-[10px] text-[#949ba4] font-bold uppercase tracking-widest mt-0.5">DOSYA</p>
            </div>
            <a href={resolveUrl(fileUrl)} download={fileName} target="_blank" rel="noreferrer" 
               className="bg-[#23a559] hover:bg-[#1a7a41] text-white text-[11px] px-3 py-1.5 rounded font-bold transition">İndir</a>
          </div>
        );
      }
    }
    
    return <div className="text-[#dbdee1] text-[15px] leading-relaxed break-words whitespace-pre-wrap">{content}</div>;
  };

  if (isCompact) {
    return (
      <div className="flex px-4 py-0.5 hover:bg-[#2e3035]/30 transition-colors group relative message-item">
        <div className="w-10 text-[10px] text-[#949ba4] opacity-0 group-hover:opacity-100 flex items-center justify-center font-medium absolute left-4 h-full select-none">
            {formatTimeStr(message.created_at)}
        </div>
        <div className="flex-1 min-w-0 ml-14">
           {renderMessageContent(message.content)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 px-4 py-1.5 mt-4 hover:bg-[#2e3035]/30 transition-colors group message-item">
      <div className="flex-shrink-0 mt-1 cursor-pointer hover:brightness-110 active:scale-95 transition" onClick={(e) => onUserClick?.(e, message.author)}>
        <UserAvatar src={message.author?.avatar_url} name={authorName} size="w-10 h-10" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span 
            className="text-[15px] font-medium text-white hover:underline cursor-pointer"
            onClick={(e) => onUserClick?.(e, message.author)}>
            {authorName}
          </span>
          <span className="text-[11px] text-[#949ba4] font-medium">
            {formatTimeStr(message.created_at)}
          </span>
        </div>
        {renderMessageContent(message.content)}
      </div>
    </div>
  );
}



