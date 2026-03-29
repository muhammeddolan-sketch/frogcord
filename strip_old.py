import os

with open('frontend/src/pages/MainApp.jsx', 'r') as f:
    lines = f.readlines()

new_main = []
new_main.append("import CodeSnippetModal from '../components/modals/CodeSnippetModal';\n")
new_main.append("import UserSettingsModal from '../components/modals/UserSettingsModal';\n")
new_main.append("import GuildSettingsModal from '../components/modals/GuildSettingsModal';\n")
new_main.append("import GuildModal from '../components/modals/GuildModal';\n")
new_main.append("import FrogcordUltraModal from '../components/modals/FrogcordUltraModal';\n")
new_main.append("import QuickAddChannel from '../components/layout/QuickAddChannel';\n")
new_main.append("import VoiceSidebarItem from '../components/layout/VoiceSidebarItem';\n")
new_main.append("import MembersPanel from '../components/layout/MembersPanel';\n")
new_main.append("import ServerSidebar from '../components/layout/ServerSidebar';\n")
new_main.append("import ChannelList from '../components/layout/ChannelList';\n")
new_main.append("import DMList from '../components/layout/DMList';\n")
new_main.append("import MessageItem from '../components/chat/MessageItem';\n\n")

# Keep imports and early variables (lines 0 to 54)
for i in range(54):
    new_main.append(lines[i])

# Keep the MainApp function (lines 819 to end)
for i in range(819, len(lines)):
    new_main.append(lines[i])

with open('frontend/src/pages/MainApp.jsx', 'w') as f:
    f.writelines(new_main)
