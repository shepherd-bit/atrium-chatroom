import { useEffect, useState } from 'react';
import { SidebarNav } from './components/SidebarNav';
import { ChannelList } from './components/ChannelList';
import { ChatWindow } from './components/ChatWindow';
import { DetailsPanel } from './components/DetailsPanel';
import { AuthScreen } from './components/AuthScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  getThreadCounts,
  listChannelMembers,
  listChannels,
  listMessages,
  listPresences,
  listUsers,
  openDM,
  sendMessage,
  toUiChannel,
  toUiMessage,
  toUiUser,
} from './api';
import { mockUsers, mockChannels, mockMessages, mockThreads } from './data/mockData';
import type { Channel, Message, User } from './types';

/**
 * The two `channel_members` rows behind a DM channel → the member ids the
 * details panel lists, plus the *other* participant, which is what the
 * sidebar and the chat header label the conversation with (DM channels are
 * stored with no name).
 */
async function resolveDM(channelId: string, roster: User[], myId: string) {
  const rows = await listChannelMembers(channelId);
  const members = rows.map((row) => row.user);
  const partnerId = members.find((id) => id !== myId);
  return { members, partner: roster.find((u) => u.id === partnerId) };
}

function ChatApp() {
  const { user, isRestoring, logout } = useAuth();

  // The people roster and your DM channels come from PocketBase. The regular
  // channels, their messages, and threads are still seeded from mock data
  // until those slices get wired up — mock ids and real ids never collide, so
  // the two live side by side in `messages` without special-casing.
  const [users, setUsers] = useState<User[]>([]);
  const [channels] = useState(mockChannels);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [threads, setThreads] = useState<Record<string, Message[]>>(mockThreads);
  /** Your `channels.type = 'dm'` records — one per conversation, two members each. */
  const [dmChannels, setDmChannels] = useState<Channel[]>([]);
  /** The other participant per DM channel id (the channel itself has no name). */
  const [dmPartners, setDmPartners] = useState<Record<string, User>>({});

  // One id space: a DM is selected exactly like a channel — its channel id.
  const [activeChannelId, setActiveChannelId] = useState<string>('deep-work');

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [inputValue, setInputValue] = useState('');

  const activeIsDM = dmChannels.some((c) => c.id === activeChannelId);

  // Load the roster and the DM channels we're a member of once we know who's
  // signed in. Switching accounts cancels the in-flight load via the cleanup,
  // so the previous user's DMs can never land on the new user's screen.
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    (async () => {
      try {
        const [records, presences, dmRecords] = await Promise.all([
          listUsers(),
          listPresences(),
          listChannels({ type: 'dm' }),
        ]);

        const presenceByUser = new Map(presences.map((p) => [p.user, p]));
        const roster = records.map((record) =>
          toUiUser(record, { presence: presenceByUser.get(record.id) ?? null })
        );

        // Each DM needs its membership rows read to know who the other side is.
        const resolved = await Promise.all(
          dmRecords.map(async (record) => {
            const { members, partner } = await resolveDM(record.id, roster, userId);
            return { channel: toUiChannel(record, { members }), partner };
          })
        );

        if (cancelled) return;
        const partners: Record<string, User> = {};
        for (const entry of resolved) {
          if (entry.partner) partners[entry.channel.id] = entry.partner;
        }
        setUsers(roster);
        setDmChannels(resolved.map((entry) => entry.channel));
        setDmPartners(partners);
      } catch (error) {
        if (cancelled) return;
        // Nothing loaded — don't leave an earlier account's conversations
        // sitting in the sidebar.
        setUsers([]);
        setDmChannels([]);
        setDmPartners({});
        console.error('Could not load your conversations', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // DM history lives in PocketBase — load it whenever a DM conversation is
  // opened, replacing whatever page we had loaded for it before. Channel
  // messages are still the mock seed, so they're skipped here.
  useEffect(() => {
    if (!activeChannelId || !activeIsDM) return;
    const channelId = activeChannelId;
    let cancelled = false;

    (async () => {
      const [records, counts] = await Promise.all([
        listMessages(channelId),
        getThreadCounts(channelId),
      ]);
      if (cancelled) return;
      setMessages((prev) => [
        ...prev.filter((m) => m.channelId !== channelId),
        ...records.map((record) => toUiMessage(record, { threadCount: counts[record.id] })),
      ]);
    })().catch((error) => console.error('Could not load the conversation', error));

    return () => {
      cancelled = true;
    };
  }, [activeChannelId, activeIsDM]);

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

  // Signed in: the UI's current user — from the roster when it has loaded
  // (it carries their presence row), straight from the auth record before that.
  const currentUser = users.find((u) => u.id === user.id) ?? toUiUser(user);

  const getUser = (userId: string): User => {
    return (
      users.find((u) => u.id === userId) ??
      // Mock channels still reference the seed roster; drop this fallback
      // when channels/messages are migrated to real records.
      mockUsers.find((u) => u.id === userId) ??
      currentUser
    );
  };

  const activeChannel = [...channels, ...dmChannels].find((c) => c.id === activeChannelId);
  const activeDMUser = dmPartners[activeChannelId];

  // One rule for channels *and* DMs: a conversation is a channel id. There is
  // no `isDM`/`dmWith` to reconcile — a DM is just a channel with type 'dm'.
  const currentMessages = messages.filter((m) => m.channelId === activeChannelId);

  const handleSendMessage = async () => {
    const text = inputValue.trim();
    if (!text) return;

    if (activeIsDM) {
      // Real send: the message becomes a row in this DM channel, and the
      // record we get back is the message we render.
      try {
        const record = await sendMessage({ channel: activeChannelId, text });
        setMessages((prev) => [...prev, toUiMessage(record)]);
        setInputValue('');
      } catch (error) {
        // Keep the draft so a failed send isn't lost.
        console.error('Message could not be sent', error);
      }
      return;
    }

    const newMessage: Message = {
      id: `m-${Date.now()}`,
      channelId: activeChannelId,
      userId: currentUser.id,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
  };

  /**
   * Start (or resume) a DM: `openDM` hands back the shared `type = 'dm'`
   * channel, creating it plus both `channel_members` rows on first use. From
   * there it's selected like any other channel.
   */
  const handleStartDM = async (otherUserId: string) => {
    if (otherUserId === currentUser.id) return;

    try {
      const record = await openDM(otherUserId);
      const { members, partner } = await resolveDM(record.id, users, currentUser.id);
      const channel = toUiChannel(record, { members });

      setDmChannels((prev) =>
        prev.some((c) => c.id === channel.id)
          ? prev.map((c) => (c.id === channel.id ? channel : c))
          : [...prev, channel]
      );
      if (partner) setDmPartners((prev) => ({ ...prev, [record.id]: partner }));

      setSelectedThread(null);
      setSelectedUser(null);
      setActiveChannelId(record.id);
      setIsMobileSidebarOpen(false);
    } catch (error) {
      console.error('Could not open the conversation', error);
    }
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
      channelId: selectedThread.channelId,
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
          setSelectedThread(null);
        }}
        avatarUrl={currentUser.avatar_url}
        onLogout={logout}
      />

      {/* Channels & DMs Sidebar */}
      <ChannelList
        users={users}
        channels={channels}
        dmChannels={dmChannels}
        dmPartners={dmPartners}
        activeChannel={activeChannelId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectChannel={(id) => {
          setActiveChannelId(id);
          setSelectedThread(null);
          setSelectedUser(null);
        }}
        onStartDM={handleStartDM}
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
