/**
 * Membership — the `channel_members` join table (per-user role + read state).
 *
 * This is the only module allowed to touch the `channel_members` collection.
 * It owns unread bookkeeping (`last_read` → counts) because that lives on
 * these rows, and leans on `messages.countMessagesAfter()` for the tally.
 */
import { ClientResponseError } from 'pocketbase';
import { pb } from '../lib/pocketbase';
import { countMessagesAfter } from './messages';
import { requireUserId } from './users';
import type { ChannelMemberRecord, MemberRole } from '../types';

/** Rows for one user's channel memberships (the signed-in user by default). */
export async function listMemberships(
  userId: string = requireUserId()
): Promise<ChannelMemberRecord[]> {
  return pb.collection('channel_members').getFullList<ChannelMemberRecord>({
    filter: `user = "${userId}"`,
    sort: 'created',
  });
}

/** Everyone in a channel (resolve `user` ids against `listUsers()`). */
export async function listChannelMembers(channelId: string): Promise<ChannelMemberRecord[]> {
  return pb.collection('channel_members').getFullList<ChannelMemberRecord>({
    filter: `channel = "${channelId}"`,
    sort: 'created',
  });
}

/**
 * Membership rows for a batch of channels in one query — what a sidebar
 * needs to fill in every channel's roster (and each DM's two members)
 * without an N+1 read per channel.
 */
export async function listMembersByChannels(
  channelIds: string[]
): Promise<ChannelMemberRecord[]> {
  if (channelIds.length === 0) return [];
  const channelFilter = channelIds.map((id) => `channel = "${id}"`).join(' || ');
  return pb.collection('channel_members').getFullList<ChannelMemberRecord>({
    filter: channelFilter,
    sort: 'created',
  });
}

/**
 * The membership row for one (channel, user) pair, or null when the user
 * isn't a member. Pass only `channelId` to check yourself.
 */
export async function findMembership(
  channelId: string,
  userId: string = requireUserId()
): Promise<ChannelMemberRecord | null> {
  const { items } = await pb.collection('channel_members').getList<ChannelMemberRecord>(1, 1, {
    filter: `channel = "${channelId}" && user = "${userId}"`,
    skipTotal: true,
  });
  return items[0] ?? null;
}

/**
 * Get or create a membership row. Idempotent — joining a channel you're
 * already in returns the existing row instead of tripping the
 * (channel, user) unique index.
 */
export async function ensureMembership(
  channelId: string,
  userId: string,
  role: MemberRole = 'member'
): Promise<ChannelMemberRecord> {
  const existing = await findMembership(channelId, userId);
  if (existing) return existing;

  try {
    return await pb.collection('channel_members').create<ChannelMemberRecord>({
      channel: channelId,
      user: userId,
      role,
      last_read: null,
    });
  } catch (error) {
    // A concurrent join (another tab, a double-click) can win the unique
    // index — the row we wanted now exists, so return it.
    if (error instanceof ClientResponseError && error.status === 400) {
      const raced = await findMembership(channelId, userId);
      if (raced) return raced;
    }
    throw error;
  }
}

/** Join a channel as a regular member. */
export async function joinChannel(channelId: string): Promise<ChannelMemberRecord> {
  return ensureMembership(channelId, requireUserId(), 'member');
}

/** Leave a channel (no-op if you're not a member). */
export async function leaveChannel(channelId: string): Promise<void> {
  const mine = await findMembership(channelId);
  if (!mine) return;
  await pb.collection('channel_members').delete(mine.id);
}

/**
 * Mark a channel read up to `at` (defaults to now). No-op when you're not a
 * member — there is no read state to advance.
 */
export async function markChannelRead(
  channelId: string,
  at: string = new Date().toISOString()
): Promise<void> {
  const mine = await findMembership(channelId);
  if (!mine) return;
  await pb.collection('channel_members').update(mine.id, { last_read: at });
}

/** Unread count for one channel (0 when you're not a member). Your own messages don't count. */
export async function getUnreadCount(channelId: string): Promise<number> {
  const userId = requireUserId();
  const mine = await findMembership(channelId, userId);
  if (!mine) return 0;
  return countMessagesAfter(channelId, mine.last_read, { excludeAuthor: userId });
}

/**
 * Unread counts for a batch of channels in one membership query — what a
 * sidebar needs to render every badge at once. Keys are channel ids.
 */
export async function getUnreadCounts(channelIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (channelIds.length === 0) return counts;

  const userId = requireUserId();
  const channelFilter = channelIds.map((id) => `channel = "${id}"`).join(' || ');
  const rows = await pb.collection('channel_members').getFullList<ChannelMemberRecord>({
    filter: `user = "${userId}" && (${channelFilter})`,
  });
  const lastReadByChannel = new Map(rows.map((row) => [row.channel, row.last_read]));

  await Promise.all(
    channelIds.map(async (channelId) => {
      const lastRead = lastReadByChannel.get(channelId);
      // Not a member → nothing can be unread.
      counts[channelId] =
        lastRead === undefined
          ? 0
          : await countMessagesAfter(channelId, lastRead, { excludeAuthor: userId });
    })
  );
  return counts;
}
