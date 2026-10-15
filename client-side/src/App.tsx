import { useState } from 'react';
import { SidebarNav } from './components/SidebarNav';
import { ChannelList } from './components/ChannelList';
import { ChatWindow } from './components/ChatWindow';
import { DetailsPanel } from './components/DetailsPanel';
import { SupabaseModal } from './components/SupabaseModal';
import { mockUsers, mockChannels, mockMessages, mockThreads } from './data/mockData';
import type { Message, User } from './types';

export function App() {
  const [users] = useState<User[]>(mockUsers);
  const [channels] = useState(mockChannels);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [threads, setThreads] = useState<Record<string, Message[]>>(mockThreads);

  const [activeChannelId, setActiveChannelId] = useState<string>('deep-work');
  const [activeDMId, setActiveDMId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const [inputValue, setInputValue] = useState('');

  const currentUser = users[0]; // Alex Rivera

  const getUser = (userId: string): User => {
    return users.find((u) => u.id === userId) || currentUser;
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeDMUser = activeDMId ? users.find((u) => u.id === activeDMId) : undefined;

  // Filter messages for active view
  const currentMessages = messages.filter((m) => {
    if (activeDMId) {
      return (m.isDM && m.dmWith === activeDMId) || (m.userId === activeDMId && m.isDM);
    }
    return m.channelId === activeChannelId && !m.isDM;
  });

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: `m-${Date.now()}`,
      channelId: activeDMId ? undefined : activeChannelId,
      userId: currentUser.id,
      text: inputValue.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      reactions: [],
      isDM: !!activeDMId,
      dmWith: activeDMId || undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const existingReactionIndex = msg.reactions.findIndex((r) => r.emoji === emoji);
        const updatedReactions = [...msg.reactions];

        if (existingReactionIndex > -1) {
          const r = updatedReactions[existingReactionIndex];
          if (r.me) {
            // Remove reaction
            if (r.count === 1) {
              updatedReactions.splice(existingReactionIndex, 1);
            } else {
              updatedReactions[existingReactionIndex] = {
                ...r,
                count: r.count - 1,
                me: false,
              };
            }
          } else {
            // Add reaction
            updatedReactions[existingReactionIndex] = {
              ...r,
              count: r.count + 1,
              me: true,
            };
          }
        } else {
          updatedReactions.push({
            emoji,
            count: 1,
            users: [currentUser.id],
            me: true,
          });
        }

        return { ...msg, reactions: updatedReactions };
      })
    );
  };

  const handleOpenThread = (message: Message) => {
    setSelectedThread(message);
    setSelectedUser(null);
    setIsRightPanelOpen(true);
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSelectedThread(null);
    setIsRightPanelOpen(true);
  };

  const handleSendReply = (replyText: string) => {
    if (!selectedThread) return;

    const newReply: Message = {
      id: `t-${Date.now()}`,
      userId: currentUser.id,
      text: replyText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      reactions: [],
    };

    setThreads((prev) => ({
      ...prev,
      [selectedThread.id]: [...(prev[selectedThread.id] || []), newReply],
    }));

    // Update thread count on parent message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === selectedThread.id
          ? {
              ...m,
              threadCount: (m.threadCount || 0) + 1,
              threadAvatars: Array.from(new Set([currentUser.avatar_url, ...(m.threadAvatars || [])])),
            }
          : m
      )
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#0A0A0A] font-sans">
      {/* Leftmost Icon Navigation Bar */}
      <SidebarNav
        activeChannel={activeChannelId}
        onSelectChannel={(id) => {
          setActiveChannelId(id);
          setActiveDMId(null);
          setSelectedThread(null);
        }}
        onOpenSettings={() => setIsSupabaseModalOpen(true)}
        avatarUrl={currentUser.avatar_url}
      />

      {/* Channels & DMs Sidebar */}
      <ChannelList
        users={users}
        channels={channels}
        activeChannel={activeChannelId}
        activeDM={activeDMId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectChannel={(id) => {
          setActiveChannelId(id);
          setActiveDMId(null);
        }}
        onSelectDM={(userId) => {
          setActiveDMId(userId);
        }}
        onOpenSettings={() => setIsSupabaseModalOpen(true)}
        onOpenModal={() => setIsSupabaseModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        currentUser={currentUser}
      />

      {/* Main Chat Feed & Header */}
      <ChatWindow
        activeChannel={activeChannel}
        activeDMUser={activeDMUser}
        messages={currentMessages}
        currentUserId={currentUser.id}
        getUser={getUser}
        onReaction={handleReaction}
        onOpenThread={handleOpenThread}
        onSelectUser={handleSelectUser}
        onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)}
        isRightPanelOpen={isRightPanelOpen}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={handleSendMessage}
      />

      {/* Right Details / Thread Panel */}
      <DetailsPanel
        isOpen={isRightPanelOpen}
        onClose={() => setIsRightPanelOpen(false)}
        selectedThread={selectedThread}
        selectedUser={selectedUser}
        activeChannel={activeChannel}
        getUser={getUser}
        threadReplies={selectedThread ? threads[selectedThread.id] || [] : []}
        onSendReply={handleSendReply}
        currentUserId={currentUser.id}
      />

      {/* Supabase Schema Modal */}
      <SupabaseModal isOpen={isSupabaseModalOpen} onClose={() => setIsSupabaseModalOpen(false)} />
    </div>
  );
}

export default App;