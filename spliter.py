import os

with open('frontend/src/pages/MainApp.jsx') as f:
    lines = f.readlines()

comps = {
    'UserSettingsModal': (212, 489, 'modals'),
    'GuildSettingsModal': (489, 817, 'modals'),
    'QuickAddChannel': (817, 863, 'layout'),
    'GuildModal': (863, 938, 'modals'),
    'VoiceSidebarItem': (938, 1069, 'layout'),
    'MembersPanel': (1069, 1145, 'layout'),
    'FrogcordUltraModal': (1145, 1201, 'modals'),
    'ServerSidebar': (1204, 1248, 'layout'),
    'ChannelList': (1248, 1305, 'layout'),
    'DMList': (1305, 1343, 'layout'),
    'MessageItem': (1343, 1441, 'chat')
}

imp = "import React, { useState, useEffect, useRef } from 'react';\nimport { Signal, Mic, MicOff, Headphones, Phone, Settings, MessageSquare, Hash, Plus, Users, Paperclip, Gamepad, Home, User, Volume1, Volume2, X, Trash2, LogOut, Link, Frown, Check, CheckSquare, Clipboard, Zap, ArrowLeft, Video, Monitor, ChevronDown, Search, MessageCircle, Code } from 'lucide-react';\nimport useAuthStore from '../../store/authStore';\nimport useGuildStore from '../../store/guildStore';\nimport { useFriendStore } from '../../store/friendStore';\nimport useTaskStore from '../../store/taskStore';\nimport apiClient from '../../api/axiosClient';\nimport { socket } from '../../socket';\nimport UserAvatar from '../UserAvatar';\nimport { resolveUrl, formatTimeStr, renderInlineMarkdown } from '../../utils';\nimport { VoiceUserCard, VoiceStatusBar, LocalVideoView, RemoteVideoView } from '../VoiceController';\nimport { useVoice } from '../../context/VoiceContext';\n\n"

for d in ['modals', 'layout', 'chat']: os.makedirs(f'frontend/src/components/{d}', exist_ok=True)

ext_lines = set()
for name, (s, e, folder) in comps.items():
    code = lines[s-1:e]
    with open(f"frontend/src/components/{folder}/{name}.jsx", "w") as f:
        f.write(imp)
        f.write(f"export default ")
        f.writelines(code)
    for i in range(s-1, e): ext_lines.add(i)

new_main = []
new_main.append("import CodeSnippetModal from '../components/modals/CodeSnippetModal';\n")
for name, (_, _, f) in comps.items(): new_main.append(f"import {name} from '../components/{f}/{name}';\n")
new_main.append("\n")

for i, L in enumerate(lines):
    if i not in ext_lines and "CodeSnippetModal" not in L: new_main.append(L)

with open('frontend/src/pages/MainApp.jsx', 'w') as f:
    f.writelines(new_main)
