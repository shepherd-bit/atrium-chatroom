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