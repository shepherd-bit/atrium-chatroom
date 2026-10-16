/**
 * Channels — conversation containers (public, private, DMs).
 *
 * This is the only module allowed to touch the `channels` collection.
 * Visibility is already scoped server-side: `listChannels()` returns public
 * channels plus the private/DM channels you're a member of.
 */
import { pb } from '../lib/pocketbase';
import type { ChannelMemberRecord, ChannelRecord, ChannelType } from '../types';
import { ensureMembership } from './membership';
import { requireUserId } from './users';

export interface ListChannelsOptions {
  /** Restrict to one type — pass `'dm'` to list direct messages. */
  type?: ChannelType;
  /** PocketBase sort expression. Defaults to alphabetical by name. */
  sort?: string;
}

export interface CreateChannelInput {
  name: string;
  description?: string;
  /** Defaults to `'public'`. DMs are created through `openDM()` instead. */
  type?: Exclude<ChannelType, 'dm'>;
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
  type?: ChannelType;
}

export async function listChannels(options: ListChannelsOptions = {}): Promise<ChannelRecord[]> {
  return pb.collection('channels').getFullList<ChannelRecord>({
    sort: options.sort ?? 'name',
    filter: options.type ? `type = "${options.type}"` : undefined,
  });
}

export async function getChannel(id: string): Promise<ChannelRecord> {
  return pb.collection('channels').getOne<ChannelRecord>(id);
}

/**
 * Create a channel and seat the creator as its owner (the server's update/
 * delete rules require an owner or admin role).
 */
export async function createChannel(input: CreateChannelInput): Promise<ChannelRecord> {
  const userId = requireUserId();
  const channel = await pb.collection('channels').create<ChannelRecord>({
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    type: input.type ?? 'public',
    created_by: userId,
  });
  await ensureMembership(channel.id, userId, 'owner');
  return channel;
}

/** Rename/retype a channel. The server only allows owners and admins. */
export async function updateChannel(id: string, patch: UpdateChannelInput): Promise<ChannelRecord> {
  return pb.collection('channels').update<ChannelRecord>(id, patch);
}

/** Delete a channel. Membership rows cascade away with it. */
export async function deleteChannel(id: string): Promise<boolean> {
  return pb.collection('channels').delete(id);
}

/**
 * Open (or find) the DM channel with another user.
 *
 * DM channels carry no display name — the UI labels them with the other
 * participant, which you get by running `listChannelMembers(channel.id)`
 * after this resolves.
 */
export async function openDM(otherUserId: string): Promise<ChannelRecord> {
  const me = requireUserId();
  if (otherUserId === me) throw new Error('You cannot start a direct message with yourself.');

  const existing = await findDMChannel(me, otherUserId);
  if (existing) return existing;

  const channel = await pb.collection('channels').create<ChannelRecord>({
    name: '',
    description: '',
    type: 'dm',
    created_by: me,
  });
  await Promise.all([
    ensureMembership(channel.id, me, 'member'),
    ensureMembership(channel.id, otherUserId, 'member'),
  ]);
  return channel;
}

/**
 * Find the existing DM channel two users share, if any.
 *
 * Both sides' membership rows are readable (the migration keeps that rule
 * relaxed on purpose), so we intersect the two channel-id sets and then keep
 * only the rows that are actually DMs. Plain id filters only — no relation
 * traversal needed.
 */
async function findDMChannel(userA: string, userB: string): Promise<ChannelRecord | null> {
  const [mine, theirs] = await Promise.all([
    pb.collection('channel_members').getFullList<Pick<ChannelMemberRecord, 'channel'>>({
      filter: `user = "${userA}"`,
    }),
    pb.collection('channel_members').getFullList<Pick<ChannelMemberRecord, 'channel'>>({
      filter: `user = "${userB}"`,
    }),
  ]);

  const theirChannelIds = new Set(theirs.map((row) => row.channel));
  const sharedIds = mine.map((row) => row.channel).filter((id) => theirChannelIds.has(id));
  if (sharedIds.length === 0) return null;

  const shared = await pb.collection('channels').getFullList<ChannelRecord>({
    filter: sharedIds.map((id) => `id = "${id}"`).join(' || '),
  });
  return shared.find((channel) => channel.type === 'dm') ?? null;
}
