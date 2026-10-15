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