import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { socket } from '../socket';
import useAuthStore from '../store/authStore';
import useGuildStore from '../store/guildStore';

const VoiceContext = createContext(null);

export const useVoice = () => useContext(VoiceContext);

let uiAudioCtx = null;

const playSynthNote = (type, volume = 1.0) => {
  try {
    if (!uiAudioCtx) uiAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = uiAudioCtx.createOscillator();
    const gain = uiAudioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(uiAudioCtx.destination);
    
    const now = uiAudioCtx.currentTime;
    osc.type = 'sine';
    
    const baseGain = 0.1 * volume;
    
    switch(type) {
      case 'join':
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(baseGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'leave':
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
        gain.gain.setValueAtTime(baseGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'mute':
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(baseGain * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'unmute':
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(baseGain * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      default:
        break;
    }
  } catch (e) { console.error('Audio synthesis failed', e); }
};

export const VoiceProvider = ({ children }) => {
  const { user } = useAuthStore();
  const { activeGuild } = useGuildStore();
  const [soundVolume, setSoundVolume] = useState(() => parseFloat(localStorage.getItem('soundVolume') || '1.0'));
  
  const [currentVoiceChannel, setCurrentVoiceChannel] = useState(null);
  const [voiceUsers, setVoiceUsers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenOn, setIsScreenOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  
  const [othersSpeak, setOthersSpeak] = useState({});
  const [othersVolume, setOthersVolume] = useState({});
  const [remoteStreams, setRemoteStreams] = useState({});
  
  // Local Streams state (for UI)
  const [localStream, setLocalStream] = useState(null);
  const [localVideoStream, setLocalVideoStream] = useState(null);
  const [localScreenStream, setLocalScreenStream] = useState(null);

  // Global Voice States for ChannelList UI tracking
  const [voiceUsersGlobal, setVoiceUsersGlobal] = useState([]);
  const [globalOthersSpeak, setGlobalOthersSpeak] = useState({});

  // Refs for callbacks & streams
  const isMutedRef = useRef(false);
  const isDeafenedRef = useRef(false);
  const streamRef = useRef(null);
  const videoStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnections = useRef({});
  const remoteStreamsRef = useRef({});
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const speakingRef = useRef(false);
  const speakingTimeoutRef = useRef(null);
  const channelRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // AFK Detection
  useEffect(() => { if (speaking) lastActivityRef.current = Date.now(); }, [speaking]);
  useEffect(() => { lastActivityRef.current = Date.now(); }, [isMuted, isDeafened, isVideoOn, isScreenOn]);

  const createPeerConnection = useCallback((remoteSocketId) => {
    if (peerConnections.current[remoteSocketId]) return peerConnections.current[remoteSocketId];
    
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('webrtc_ice_candidate', { to: remoteSocketId, candidate: e.candidate });
    };
    
    pc.ontrack = (e) => {
      setRemoteStreams((prev) => {
        const currentStream = prev[remoteSocketId] || new MediaStream();
        e.streams[0].getTracks().forEach(track => {
          if (!currentStream.getTracks().find(t => t.id === track.id)) currentStream.addTrack(track);
        });
        const newStream = new MediaStream(currentStream.getTracks());
        remoteStreamsRef.current[remoteSocketId] = newStream;
        return { ...prev, [remoteSocketId]: newStream };
      });
    };
    
    [streamRef.current, videoStreamRef.current, screenStreamRef.current].forEach(s => {
      if (s) s.getTracks().forEach(t => pc.addTrack(t, s));
    });
    
    peerConnections.current[remoteSocketId] = pc;
    return pc;
  }, []);

  const initiateCall = useCallback(async (rid) => {
    if (!channelRef.current || !user) return;
    const pc = createPeerConnection(rid);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc_offer', { to: rid, offer, from: user.id, channelId: channelRef.current.id });
  }, [createPeerConnection, user]);

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
    }
    
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach((t) => t.stop());
    if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach((t) => t.stop());
    
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    remoteStreamsRef.current = {};
    
    setLocalStream(null);
    setLocalVideoStream(null);
    setLocalScreenStream(null);
    setRemoteStreams({});
    setOthersSpeak({});
    setOthersVolume({});
    setVoiceUsers([]);
    setSpeaking(false);
    
    if (channelRef.current && user) {
      socket.emit('voice_leave', { channelId: channelRef.current.id, userId: user.id });
    }
  }, [user]);

  const leaveVoice = useCallback(() => {
    cleanup();
    setCurrentVoiceChannel(null);
    channelRef.current = null;
    playSynthNote('leave', soundVolume);
  }, [cleanup]);

  const toggleMute = useCallback((forceState) => {
    if (streamRef.current && channelRef.current && user) {
      const m = typeof forceState === 'boolean' ? forceState : !isMutedRef.current;
      streamRef.current.getAudioTracks().forEach(t => t.enabled = !m);
      setIsMuted(m);
      isMutedRef.current = m;
      socket.emit('voice_status', { channelId: channelRef.current.id, userId: user.id, muted: m });
      
      if (m) { 
        setSpeaking(false); 
        speakingRef.current = false;
        socket.emit('voice_speaking', { channelId: channelRef.current.id, userId: user.id, speaking: false }); 
        playSynthNote('mute', soundVolume);
      } else {
        playSynthNote('unmute', soundVolume);
      }
    }
  }, [user]);

  const toggleDeafen = useCallback(() => {
    if (channelRef.current && user) {
      const d = !isDeafenedRef.current;
      setIsDeafened(d);
      isDeafenedRef.current = d;
      
      // Mute remote audio streams locally
      Object.values(remoteStreamsRef.current).forEach(s => s.getAudioTracks().forEach(t => t.enabled = !d));
      
      if (d) {
        playSynthNote('deafen');
        toggleMute(true);
      } else {
        playSynthNote('undeafen');
        socket.emit('voice_status', { channelId: channelRef.current.id, userId: user.id, deafened: false });
      }
    }
  }, [toggleMute, user]);

  const toggleCamera = useCallback(async () => {
    if (!channelRef.current) return;
    try {
      if (isVideoOn) {
        if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(t => t.stop());
        videoStreamRef.current = null;
        setLocalVideoStream(null);
        setIsVideoOn(false);
      } else {
        const st = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStreamRef.current = st;
        setLocalVideoStream(st);
        setIsVideoOn(true);
      }
      
      Object.values(peerConnections.current).forEach(pc => {
        pc.getSenders().forEach(s => { 
          if (s.track?.kind === 'video' && s.track !== screenStreamRef.current?.getVideoTracks()[0]) pc.removeTrack(s); 
        });
        if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(t => pc.addTrack(t, videoStreamRef.current));
      });
      Object.keys(peerConnections.current).forEach(id => initiateCall(id));
      playSynthNote(isVideoOn ? 'off' : 'on');
    } catch (e) {
      alert("Kamera açılamadı!");
    }
  }, [isVideoOn, initiateCall]);

  const toggleScreenShare = useCallback(async () => {
    if (!channelRef.current) return;
    try {
      if (isScreenOn) {
        if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
        setLocalScreenStream(null);
        setIsScreenOn(false);
      } else {
        const st = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = st;
        setLocalScreenStream(st);
        setIsScreenOn(true);
        
        st.getTracks()[0].onended = () => { 
          setIsScreenOn(false); 
          setLocalScreenStream(null);
          screenStreamRef.current = null; 
          
          Object.values(peerConnections.current).forEach(pc => {
            pc.getSenders().forEach(s => { 
              if (s.track?.kind === 'video' && s.track?.label?.toLowerCase().includes('screen')) pc.removeTrack(s); 
            });
          });
          Object.keys(peerConnections.current).forEach(id => initiateCall(id));
        };
      }
      
      Object.values(peerConnections.current).forEach(pc => {
        pc.getSenders().forEach(s => { 
          if (s.track?.kind === 'video' && s.track !== videoStreamRef.current?.getVideoTracks()[0]) pc.removeTrack(s); 
        });
        if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => pc.addTrack(t, screenStreamRef.current));
      });
      Object.keys(peerConnections.current).forEach(id => initiateCall(id));
      playSynthNote(isScreenOn ? 'off' : 'on');
    } catch (e) {
      if (e.name !== 'NotAllowedError') alert("Ekran paylaşımı hatası");
      setIsScreenOn(false);
    }
  }, [isScreenOn, initiateCall]);

  const joinVoice = useCallback(async (channel) => {
    if (!user) return;
    if (channelRef.current?.id === channel.id) return; // Zaten buradayız
    
    // Eski kanaldan çık
    if (channelRef.current) leaveVoice();
    
    setCurrentVoiceChannel(channel);
    channelRef.current = channel;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,
          googEchoCancellation: true,
          googAutoGainControl: true,
          googAudioMirroring: false,
          googNoiseReduction: true
        } 
      });
      streamRef.current = stream;
      setLocalStream(stream);
      
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      
      intervalRef.current = setInterval(() => {
        if (!channelRef.current) return;
        if (isMutedRef.current || isDeafenedRef.current) {
          if (speakingRef.current) { 
            speakingRef.current = false; 
            setSpeaking(false); 
            socket.emit('voice_speaking', { channelId: channelRef.current.id, userId: user.id, speaking: false }); 
          }
          return;
        }
        
        analyser.getByteFrequencyData(data);
        
        // Voice-focused Noise Gate (The Lakeside Gate 🐸)
        // Only look at human-vocal range bins (roughly 300Hz to 3.5kHz)
        // Bin size is sampleRate / fftSize (e.g. 48000 / 256 = 187Hz)
        let vocalSum = 0;
        let totalSum = 0;
        const startBin = 2; // ~375Hz
        const endBin = 20;  // ~3.5kHz
        
        for (let i = 0; i < data.length; i++) {
          const val = data[i] * data[i];
          totalSum += val;
          if (i >= startBin && i <= endBin) vocalSum += val;
        }

        const vocalRms = Math.sqrt(vocalSum / (endBin - startBin + 1));
        const totalRms = Math.sqrt(totalSum / data.length);
        
        // Vocal focus ratio: If sound is too broadband (like white noise), ignore it
        const vocalRatio = totalRms > 0 ? vocalRms / totalRms : 0;
        
        const dB = vocalRms ? 20 * Math.log10(vocalRms / 255) : -100;
        
        // Final logic: Must be loud enough AND have energy concentrated in vocal frequencies
        const isLoud = dB > -18 && vocalRatio > 0.6;

        if (isLoud) {
          if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
          speakingTimeoutRef.current = null;
          
          if (!speakingRef.current) {
            speakingRef.current = true;
            setSpeaking(true);
            socket.emit('voice_speaking', { channelId: channelRef.current.id, userId: user.id, speaking: true });
          }
        } else {
          if (speakingRef.current && !speakingTimeoutRef.current) {
            // Re-adding a small delay to prevent flickering
            speakingTimeoutRef.current = setTimeout(() => {
              speakingRef.current = false;
              setSpeaking(false);
              socket.emit('voice_speaking', { channelId: channelRef.current.id, userId: user.id, speaking: false });
              speakingTimeoutRef.current = null;
            }, 300);
          }
        }
      }, 20);
      
      socket.emit('voice_join', { 
        channelId: channel.id, 
        userId: user.id, 
        username: user.display_name || user.username, 
        avatar_url: user.avatar_url 
      });
      
      playSynthNote('join', soundVolume);
    } catch (err) {
      alert('Mikrofon izni gerekli!');
      leaveVoice();
    }
  }, [user, leaveVoice]);

  useEffect(() => {
    if (!currentVoiceChannel || !activeGuild || !activeGuild.afk_channel_id || activeGuild.afk_timeout <= 0) return;
    if (Number(currentVoiceChannel.id) === Number(activeGuild.afk_channel_id)) return;

    const timer = setInterval(() => {
      const idleTime = (Date.now() - lastActivityRef.current) / 1000;
      if (idleTime >= activeGuild.afk_timeout) {
        const afkChannel = activeGuild.channels?.find(c => Number(c.id) === Number(activeGuild.afk_channel_id));
        if (afkChannel) {
          console.log(`[AFK] User moved due to ${idleTime}s inactivity.`);
          joinVoice(afkChannel);
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [currentVoiceChannel, activeGuild, joinVoice]);

  // Global Socket Listeners for UI
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

  // WebRTC Socket Listeners

  useEffect(() => {
    if (!currentVoiceChannel) return;

    const onVoiceUsers = (users) => {
      const channelMembers = users.filter((u) => Number(u.channelId) === Number(currentVoiceChannel.id));
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

    const onUserSpeak = ({ userId, speaking: s, volume: v }) => {
       setOthersSpeak((p) => ({ ...p, [userId]: s }));
       if (v !== undefined) {
         setOthersVolume((p) => ({ ...p, [userId]: v }));
       }
    };

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

    const onServerAction = (data) => {
      if (data.action === 'mute') if (data.muted) toggleMute(true);
      if (data.action === 'deafen') if (data.deafened) { setIsDeafened(true); isDeafenedRef.current = true; toggleMute(true); }
      if (data.action === 'disconnect') leaveVoice();
    };

    socket.on('voice_users', onVoiceUsers);
    socket.on('user_speaking', onUserSpeak);
    socket.on('webrtc_offer', onOffer);
    socket.on('webrtc_answer', onAnswer);
    socket.on('webrtc_ice_candidate', onIceCandidate);
    socket.on('voice_server_action', onServerAction);

    return () => {
      socket.off('voice_users', onVoiceUsers);
      socket.off('user_speaking', onUserSpeak);
      socket.off('webrtc_offer', onOffer);
      socket.off('webrtc_answer', onAnswer);
      socket.off('webrtc_ice_candidate', onIceCandidate);
      socket.off('voice_server_action', onServerAction);
    };
  }, [currentVoiceChannel, createPeerConnection, initiateCall, leaveVoice, toggleMute]);

  return (
    <VoiceContext.Provider value={{
      currentVoiceChannel,
      voiceUsers,
      isMuted,
      isDeafened,
      isVideoOn,
      isScreenOn,
      speaking,
      othersSpeak,
      othersVolume,
      remoteStreams,
      localStream,
      localVideoStream,
      localScreenStream,
      joinVoice,
      leaveVoice,
      toggleMute,
      toggleDeafen,
      toggleCamera,
      toggleScreen: toggleScreenShare,
      voiceUsersGlobal,
      globalOthersSpeak,
      soundVolume,
      setSoundVolume
    }}>
      {children}
    </VoiceContext.Provider>
  );
};
