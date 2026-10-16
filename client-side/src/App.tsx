import { useEffect, useState } from 'react';
import { SidebarNav } from './components/SidebarNav';
import { ChannelList } from './components/ChannelList';
import { ChannelModal } from './components/ChannelModal';
import { ChatWindow } from './components/ChatWindow';
import { DetailsPanel } from './components/DetailsPanel';
import { AuthScreen } from './components/AuthScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { pb } from './lib/pocketbase';
import {
  createChannel,
  getAuthErrorMessage,
  getThread,
  getThreadCounts,
  joinChannel,
  listAllMessages,
  listChannelMembers,
  listChannels,
  listMembersByChannels,
  listMessages,
  listPresences,
  listUsers,
  openDM,
  sendMessage,
  toUiChannel,
  toUiMessage,
  toUiUser,
} from './api';
import type { CreateChannelInput } from './api';
import type {
  Channel,
  ChannelMemberRecord,
  ChannelRecordWithCreator,
  Message,
  MessageRecord,
  User,
} from './types';

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

  // The whole workspace — roster, channels, and message history — comes from
  // PocketBase, loaded in one pass per account below. Nothing is seeded from
  // mock data anymore, so these start empty and are filled (or left empty)
  // by that load.
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  /** Thread replies per parent message id, fetched the first time a thread is opened. */
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  /** Your `channels.type = 'dm'` records — one per conversation, two members each. */
  const [dmChannels, setDmChannels] = useState<Channel[]>([]);
  /** The other participant per DM channel id (the channel itself has no name). */
  const [dmPartners, setDmPartners] = useState<Record<string, User>>({});

  // Load lifecycle: `loadedFor` is the user id the state above belongs to,
  // so switching accounts immediately shows the splash again instead of the
  // previous user's channels while the new load runs.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // One id space: a DM is selected exactly like a channel — its channel id.
  // Seeded by the load below (the first channel we can see).
  const [activeChannelId, setActiveChannelId] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  /** The create/browse sheet behind the sidebar's `+` and compose pencil. */
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);

  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [inputValue, setInputValue] = useState('');

  // Load the roster, every channel we may see, and the whole message history
  // once we know who's signed in. Switching accounts — or retrying after a
  // failure — cancels the in-flight load via the cleanup, so an earlier
  // user's conversations can never land on the new user's screen.
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    (async () => {
      try {
        const [userRecords, presenceRecords, channelRecords, messageRecords, threadCounts] =
          await Promise.all([
            listUsers(),
            listPresences(),
            // `expand=created_by` inlines the creator record, so the channel
            // header can name them without a second lookup per channel.
            listChannels<ChannelRecordWithCreator>({ sort: 'name', expand: 'created_by' }),
            // Top-level messages, oldest first — the order the feed renders in.
            listAllMessages(),
            // Reply counts for the thread badges, across every channel at once.
            getThreadCounts(),
          ]);

        // The channel ids are known now, so every roster (member counts, the
        // two people behind each DM) comes from one membership query.
        const memberRows = await listMembersByChannels(channelRecords.map((c) => c.id));
        if (cancelled) return;

        const presenceByUser = new Map(presenceRecords.map((row) => [row.user, row]));
        const roster = userRecords.map((record) =>
          toUiUser(record, { presence: presenceByUser.get(record.id) ?? null })
        );

        const rowsByChannel = new Map<string, ChannelMemberRecord[]>();
        for (const row of memberRows) {
          const rows = rowsByChannel.get(row.channel);
          if (rows) rows.push(row);
          else rowsByChannel.set(row.channel, [row]);
        }

        const workspaceChannels: Channel[] = [];
        const dms: Channel[] = [];
        const partners: Record<string, User> = {};

        for (const record of channelRecords) {
          const members = (rowsByChannel.get(record.id) ?? []).map((row) => row.user);
          const creator = record.expand?.created_by;
          const channel = toUiChannel(record, {
            members,
            createdBy: creator
              ? toUiUser(creator, { presence: presenceByUser.get(creator.id) ?? null })
              : undefined,
          });

          if (channel.type !== 'dm') {
            workspaceChannels.push(channel);
            continue;
          }

          // A DM channel has no name — the sidebar labels it with the other
          // participant, which is whichever member isn't you.
          dms.push(channel);
          const partner = roster.find((u) => u.id === members.find((id) => id !== userId));
          if (partner) partners[channel.id] = partner;
        }

        setUsers(roster);
        setChannels(workspaceChannels);
        setDmChannels(dms);
        setDmPartners(partners);
        setMessages(
          messageRecords.map((record) =>
            toUiMessage(record, { threadCount: threadCounts[record.id] })
          )
        );
        setThreads({});
        // Keep the open conversation when it survived the reload; otherwise
        // land on the first channel we can see.
        setActiveChannelId((current) =>
          current &&
          (workspaceChannels.some((c) => c.id === current) || dms.some((c) => c.id === current))
            ? current
            : (workspaceChannels[0]?.id ?? dms[0]?.id ?? '')
        );
        setLoadError(null);
        setLoadedFor(userId);
      } catch (error) {
        if (cancelled) return;
        // Nothing loaded — don't leave an earlier account's conversations
        // sitting in the sidebar.
        setUsers([]);
        setChannels([]);
        setDmChannels([]);
        setDmPartners({});
        setMessages([]);
        setThreads({});
        setLoadedFor(null);
        setLoadError(getAuthErrorMessage(error));
        console.error('Could not load your workspace', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, reloadToken]);

  // Splash while the saved token is being restored/validated, and again for
  // each workspace load — otherwise we'd flash the login screen at returning
  // users, or an empty shell at signed-in ones.
  if (isRestoring || (user && loadedFor !== user.id && !loadError)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="w-8 h-8 rounded-[12px] bg-[#0A0A0A] flex items-center justify-center shadow-sm animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-white" />
        </div>
      </div>
    );
  }

  // The load failed (server down, token revoked mid-load, network gone) —
  // say so instead of rendering an empty workspace that looks like an
  // account with no history.
  if (loadError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white px-6">
        <div className="max-w-[400px] text-center">
          <div className="w-8 h-8 rounded-[12px] bg-[#0A0A0A] flex items-center justify-center shadow-sm mx-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
          <h1 className="mt-4 text-[15px] font-semibold">Couldn't load your workspace</h1>
          <p className="mt-1.5 text-[13px] leading-[18px] text-[#71717A]">{loadError}</p>
          <button
            onClick={() => {
              // Clearing the error first swaps this screen for the splash
              // while the retry runs, instead of showing a stale failure.
              setLoadError(null);
              setReloadToken((token) => token + 1);
            }}
            className="mt-5 h-9 px-4 rounded-full bg-[#0A0A0A] text-white text-[13px] font-medium hover:bg-black transition-colors"
          >
            Try again
          </button>
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
    // Anything the roster doesn't carry (a deleted account that still has
    // messages) renders as the signed-in user rather than crashing.
    return users.find((u) => u.id === userId) ?? currentUser;
  };

  const activeChannel = [...channels, ...dmChannels].find((c) => c.id === activeChannelId);
  const activeDMUser = dmPartners[activeChannelId];

  // One rule for channels *and* DMs: a conversation is a channel id. There is
  // no `isDM`/`dmWith` to reconcile — a DM is just a channel with type 'dm'.
  const currentMessages = messages.filter((m) => m.channelId === activeChannelId);

  // Sending is one path for channels and DMs alike: write the row straight
  // to `messages` with the signed-in account as author, then append the
  // record PocketBase hands back (it carries the server-set id/created).
  const handleSendMessage = async () => {
    const text = inputValue.trim();
    const author = pb.authStore.record?.id;
    if (!text || !activeChannelId || !author) return;

    try {
      const record = await pb.collection('messages').create<MessageRecord>({
        channel: activeChannelId,
        author,
        text,
      });
      setMessages((prev) => [...prev, toUiMessage(record)]);
      setInputValue('');
    } catch (error) {
      // Keep the draft so a failed send isn't lost.
      console.error('Message could not be sent', error);
    }
  };

  /**
   * Create a channel: the API seats you as owner (record + membership row
   * land together), so it goes straight into the sidebar and becomes the
   * open conversation. Throws on failure so the sheet can show the reason.
   */
  const handleCreateChannel = async (input: CreateChannelInput) => {
    const record = await createChannel(input);
    const channel = toUiChannel(record, {
      members: [currentUser.id],
      createdBy: currentUser,
    });

    setChannels((prev) => [...prev, channel].sort((a, b) => a.name.localeCompare(b.name)));
    setActiveChannelId(channel.id);
    setSelectedThread(null);
    setSelectedUser(null);
    setIsMobileSidebarOpen(false);
    setIsChannelModalOpen(false);
  };

  /**
   * Join a public channel, then pull its history — `messages` is readable
   * only by members, so nothing in it existed for you until this row did.
   */
  const handleJoinChannel = async (channelId: string) => {
    await joinChannel(channelId);

    const records = await listMessages(channelId);
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const additions = records.map((record) => toUiMessage(record)).filter((m) => !seen.has(m.id));
      return [...prev, ...additions];
    });
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, members: [...c.members, currentUser.id] } : c))
    );

    setActiveChannelId(channelId);
    setSelectedThread(null);
    setSelectedUser(null);
    setIsMobileSidebarOpen(false);
    setIsChannelModalOpen(false);
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

  /**
   * Open a message's thread: the panel shows the parent right away and the
   * replies are pulled from PocketBase the first time the thread is opened
   * (they're cached per thread id, so re-opening is instant).
   */
  const handleOpenThread = async (message: Message) => {
    setSelectedThread(message);
    setSelectedUser(null);
    setIsRightPanelOpen(true);

    if (threads[message.id]) return;
    try {
      const records = await getThread(message.id);
      setThreads((prev) => ({ ...prev, [message.id]: records.map((r) => toUiMessage(r)) }));
    } catch (error) {
      console.error('Could not load the thread replies', error);
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSelectedThread(null);
    setIsRightPanelOpen(true);
  };

  /** Post a reply: it becomes a `messages` row with `parent` set. */
  const handleSendReply = async (replyText: string) => {
    const text = replyText.trim();
    const parent = selectedThread;
    if (!parent || !text) return;

    try {
      const record = await sendMessage({ channel: parent.channelId, parent: parent.id, text });
      const reply = toUiMessage(record);

      setThreads((prev) => ({
        ...prev,
        [parent.id]: [...(prev[parent.id] ?? []), reply],
      }));

      // Update thread count on parent message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === parent.id
            ? {
                ...m,
                threadCount: (m.threadCount || 0) + 1,
                threadAvatars: Array.from(
                  new Set([currentUser.avatar_url, ...(m.threadAvatars || [])])
                ),
              }
            : m
        )
      );
    } catch (error) {
      // The panel keeps the typed reply in its own state, so nothing is lost.
      console.error('Reply could not be sent', error);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#0A0A0A] font-sans">
      {/* Leftmost Icon Navigation Bar */}
      <SidebarNav
        channels={channels}
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
        onOpenCreateChannel={() => setIsChannelModalOpen(true)}
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

      {/* Create / join sheet — the sidebar `+` and compose pencil open it */}
      <ChannelModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        channels={channels}
        currentUser={currentUser}
        onCreateChannel={handleCreateChannel}
        onJoinChannel={handleJoinChannel}
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
