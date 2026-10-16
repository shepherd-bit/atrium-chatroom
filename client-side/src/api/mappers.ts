/**
 * Mappers — PocketBase records → the UI-facing shapes in `src/types`.
 *
 * The components were built against mock-data shapes (`Message`, `Channel`,
 * `User`) while the API layer returns raw records (`MessageRecord`,
 * `ChannelRecord`, `UserRecord`, `PresenceRecord`). This module is the single
 * translation point between the two, so no component ever has to learn
 * PocketBase field names (`channel`/`author`/`created`/`description`…).
 *
 *   MessageRecord  channel   → channelId
 *                  author    → userId
 *                  text      → text
 *                  created   → time ("9:12 AM") + timestamp (ms epoch)
 *
 *   ChannelRecord  name      → name
 *                  description → desc
 *                  type      → type (DMs are channels with type 'dm')
 *                  (members/unread come from the membership API, see below)
 *
 *   UserRecord     name      → name + full_name (falls back to email)
 *                  avatar    → avatar_url (resolved via pb.files)
 *                  title     → role
 *                  presences → status + statusText + time (pass in extras)
 *                  timezone  → localTime
 *
 * Lives in src/api (not src/lib) because `avatarURL()` touches the shared
 * PocketBase client, and only src/api is allowed to import that.
 */
import { avatarURL } from './users';
import type {
  Channel,
  ChannelRecord,
  Message,
  MessageRecord,
  PresenceRecord,
  PresenceState,
  User,
  UserRecord,
} from '../types';

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Data that lives outside the `messages` record itself — thread badges come
 * from `getThreadCounts()`/`getThread()`.
 *
 * There is deliberately no DM flag here: a DM message is just a message in a
 * channel whose `type` is `'dm'`, so `channelId` already says everything.
 */
export interface UiMessageExtras {
  /** From `getThreadCounts(channelId)` — replies per parent message. */
  threadCount?: number;
  /** Avatar URLs of thread repliers, e.g. from `getThread(message.id)`. */
  threadAvatars?: string[];
}

/**
 * Map a `messages` record to the `Message` the chat feed renders.
 *
 * `expand` is unused on purpose: the UI resolves authors through
 * `getUser(message.userId)` and conversations through `Channel.type`.
 *
 * Note: because of the `extras` argument, wrap this in an arrow when using
 * it with `.map()` — `list.map(toUiMessage)` would pass the array index as
 * `extras`.
 */
export function toUiMessage(record: MessageRecord, extras: UiMessageExtras = {}): Message {
  const created = parseISO(record.created);

  return {
    id: record.id,
    channelId: record.channel,
    userId: record.author,
    text: record.text,
    time: formatClock(created),
    timestamp: created.getTime(),
    threadCount: extras.threadCount,
    threadAvatars: extras.threadAvatars,
  };
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export interface UiChannelExtras {
  /** Member user ids from `listChannelMembers(channel.id)` — the `channels` record has no member list. */
  members?: string[];
  /** Unread badge from `getUnreadCounts(...)` / `getUnreadCount(...)`. */
  unread?: number;
}

/** Map a `channels` record to the `Channel` the sidebar renders. */
export function toUiChannel(record: ChannelRecord, extras: UiChannelExtras = {}): Channel {
  return {
    id: record.id,
    type: record.type,
    name: record.name,
    desc: record.description,
    members: extras.members ?? [],
    unread: extras.unread,
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface UiUserExtras {
  /** The user's row from `presences` (`getPresence`/`listPresencesFor`). */
  presence?: PresenceRecord | null;
}

/**
 * Map a `users` record (plus optional presence) to the `User` the DM list
 * and details panel render.
 *
 * Users without a presence row are treated as offline — they've never
 * heartbeat since the `presences` collection was introduced.
 */
export function toUiUser(record: UserRecord, extras: UiUserExtras = {}): User {
  const presence = extras.presence ?? undefined;
  const displayName = record.name || record.email;

  return {
    id: record.id,
    name: displayName,
    full_name: displayName,
    avatar_url: avatarURL(record, { thumb: '100x100' }),
    role: record.title || 'Member',
    status: toUiStatus(presence?.state),
    statusText: presence?.status_text || 'Offline',
    // "Last seen at" — the heartbeat time, falling back to profile updates.
    time: formatClock(parseISO(presence?.last_seen ?? record.updated)),
    localTime: formatLocalTime(record.timezone),
  };
}

/** The `User` type only has online/away, so dnd/invisible collapse into away. */
function toUiStatus(state?: PresenceState): User['status'] {
  return state === 'online' ? 'online' : 'away';
}

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

// Same shape the mock data and App.tsx use ("9:12 AM"), so mapped and
// locally-built messages render identically.
const CLOCK_FORMAT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], CLOCK_FORMAT);
}

/**
 * "9:42 AM local" — the user's own wall clock when their `timezone` (IANA
 * name) is set, otherwise the viewer's. Invalid zones fall back silently.
 */
function formatLocalTime(timezone?: string): string {
  if (timezone) {
    try {
      const now = new Date().toLocaleTimeString([], { ...CLOCK_FORMAT, timeZone: timezone });
      return `${now} local`;
    } catch {
      // Unknown IANA zone — fall through to the viewer's clock.
    }
  }
  return `${formatClock(new Date())} local`;
}

/** Parse an ISO timestamp, falling back to "now" so "Invalid Date" never renders. */
function parseISO(iso: string | null | undefined): Date {
  const ms = iso ? Date.parse(iso) : NaN;
  return new Date(Number.isNaN(ms) ? Date.now() : ms);
}
