import { useState } from 'react';
import { SidebarNav } from './components/SidebarNav';
import { ChannelList } from './components/ChannelList';
import { ChatWindow } from './components/ChatWindow';
import { DetailsPanel } from './components/DetailsPanel';
import { AuthScreen } from './components/AuthScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { pb } from './lib/pocketbase';
import { mockUsers, mockChannels, mockMessages, mockThreads } from './data/mockData';
import type { Message, User, UserRecord } from './types';

// Bridge the PocketBase auth record into the User shape the UI components
// were built against. Swap this (and the mock data below) as the rest of
// the app gets wired to real collections.
function toUiUser(record: UserRecord): User {
  const now = new Date();
  return {
    id: record.id,
    name: record.name || record.email,
    full_name: record.name || record.email,
    avatar_url: record.avatar
      ? pb.files.getURL(record, record.avatar, { thumb: '100x100' })
      : `https://i.pravatar.cc/150?u=${record.id}`,
    role: record.title || 'Member',
    status: 'online',
    statusText: 'Available',
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    localTime: `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} local`,
  };
}

function ChatApp() {
  const { user, isRestoring, logout } = useAuth();

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

  const [inputValue, setInputValue] = useState('');

  // Splash while the saved token is being restored/validated — otherwise
  // we'd flash the login screen at returning users.
  if (isRestoring) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="w-8 h-8 rounded-[12px] bg-[#0A0A0A] flex items-center justify-center shadow-sm animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-white" />
        </div>
      </div>
    );
  }

  // Every collection rule requires @request.auth.id != '', so nothing can
  // be read until the user is signed in.
  if (!user) {
    return <AuthScreen />;
  }

  // Signed in: build the UI's current user from the real auth record.
  const currentUser = toUiUser(user);

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
      isDM: !!activeDMId,
      dmWith: activeDMId || undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
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
        avatarUrl={currentUser.avatar_url}
        onLogout={logout}
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
    </div>
  );
}

// AuthProvider lives at the root so the auth state survives navigation and
// ChatApp (plus AuthScreen) can both consume it via useAuth().
export function App() {
  return (
    <AuthProvider>
      <ChatApp />
    </AuthProvider>
  );
}

export default App;