// Shape of the PocketBase `users` auth record (see the migration in
// server-side/pb_migrations). This is the raw DB record; the UI-facing
// `User` below is a mock-data shape the components were built against.
export interface UserRecord {
  id: string;
  email: string;
  name: string;
  avatar?: string; // filename; resolve with pb.files.getURL(record, avatar)
  title?: string;
  timezone?: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

export interface User {
  id: string;
  name: string;
  full_name: string;
  avatar_url: string;
  role: string;
  status: 'online' | 'away';
  statusText: string;
  time: string;
  localTime: string;
}

export interface Message {
  id: string;
  channelId?: string;
  userId: string;
  text: string;
  time: string;
  timestamp: number;
  threadCount?: number;
  threadAvatars?: string[];
  isDM?: boolean;
  dmWith?: string;
}

export interface Channel {
  id: string;
  name: string;
  desc: string;
  members: string[];
  unread?: number;
}

// ---------------------------------------------------------------------------
// PocketBase record shapes.
//
// These mirror the collections created in
// server-side/pb_migrations/1760000000_create_atrium_collections.js.
// Relation fields are typed as the related record's id — the API layer
// (src/api) returns records unexpanded, so callers join them against
// `listUsers()` themselves.
// ---------------------------------------------------------------------------

/** `channels.type` */
export type ChannelType = 'public' | 'private' | 'dm';

/** `channel_members.role` */
export type MemberRole = 'owner' | 'admin' | 'member';

/** `presences.state` */
export type PresenceState = 'online' | 'away' | 'dnd' | 'invisible';

export interface ChannelRecord {
  id: string;
  name: string;
  description: string;
  type: ChannelType;
  /** ISO timestamp of the newest message; null while the channel is empty. */
  last_message_at: string | null;
  /** users.id of whoever created the channel. */
  created_by: string | null;
  created: string;
  updated: string;
  [key: string]: unknown;
}

export interface ChannelMemberRecord {
  id: string;
  /** channels.id */
  channel: string;
  /** users.id */
  user: string;
  role: MemberRole;
  /** ISO timestamp of the last message this user read; null until first opened. */
  last_read: string | null;
  created: string;
  updated: string;
  [key: string]: unknown;
}

export interface MessageRecord {
  id: string;
  /** channels.id */
  channel: string;
  /** users.id */
  author: string;
  text: string;
  /** Uploaded attachment filenames; resolve URLs with pb.files.getURL(). */
  attachments: string[];
  /** messages.id of the thread parent; null for top-level messages. */
  parent: string | null;
  created: string;
  updated: string;
  [key: string]: unknown;
}

export interface PresenceRecord {
  id: string;
  /** users.id — unique, one presence row per user. */
  user: string;
  state: PresenceState;
  status_text: string;
  /** ISO timestamp of the last heartbeat. */
  last_seen: string | null;
  created: string;
  updated: string;
  [key: string]: unknown;
}