import React from 'react';

import { resolveUrl } from '../utils';

const UserAvatar = ({ src, name, size = "w-8 h-8", className = "", isSpeaking = false }) => (
  <div className={`relative flex-shrink-0 ${size} ${className} border border-[var(--border-pixel)] bg-[var(--bg-mid)] overflow-hidden shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer ${isSpeaking ? 'animate-speak' : ''}`}>
    <img src={resolveUrl(src)} alt="" className="w-full h-full object-cover logo-img transition-opacity duration-300" />
    <div className="avatar-fallback hidden absolute inset-0 items-center justify-center font-black text-[var(--accent-primary)] bg-[var(--bg-light)]">
      {(name || "?")[0]}
    </div>
    <div className="absolute inset-0 border border-white/5 pointer-events-none"></div>
  </div>
);

export default UserAvatar;
