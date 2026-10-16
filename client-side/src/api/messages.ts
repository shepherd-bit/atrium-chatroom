/**
 * Messages — channel history, threads, and realtime updates.
 *
 * This is the only module allowed to touch the `messages` collection.
 * Records come back unexpanded; resolve `author` against `listUsers()`.
 */
import type { UnsubscribeFunc } from 'pocketbase';
import { pb } from '../lib/pocketbase';
import { requireUserId } from './users';
import type { MessageRecord } from '../types';

export interface ListMessagesOptions {
  /** Newest N messages to load. Defaults to 50. */
  limit?: number;
  /** Only messages created before this ISO timestamp (the oldest message you've already loaded) to page backwards. */
  before?: string;
}

export interface MessageEvent {
  action: 'create' | 'update' | 'delete';
  record: MessageRecord;
}

/**
 * Latest messages of a channel in chronological order (oldest first — the
 * order a chat feed renders in). Top-level messages only; use
 * `getThread()` for replies.
 *
 * Pass the `created` of the oldest loaded message as `before` to load the
 * previous page.
 */
export async function listMessages(
  channelId: string,
  options: ListMessagesOptions = {}
): Promise<MessageRecord[]> {
  const { limit = 50, before } = options;
  const filter = [`channel = "${channelId}"`, 'parent = null'];
  if (before) filter.push(`created < "${before}"`);

  const { items } = await pb.collection('messages').getList<MessageRecord>(1, limit, {
    filter: filter.join(' && '),
    sort: '-created',
  });
  // The page is fetched newest-first; flip it for display order.
  return [...items].reverse();
}

/**
 * Every top-level message the signed-in user can read, in one page-free
 * `getFullList()` sorted oldest first — the whole feed for the initial load.
 *
 * The `messages` list rule already scopes the result to channels you're a
 * member of, so nothing leaks; use `listMessages(channelId)` to page further
 * back once this window is exhausted.
 */
export async function listAllMessages(): Promise<MessageRecord[]> {
  return pb.collection('messages').getFullList<MessageRecord>({
    filter: 'parent = null',
    sort: 'created',
  });
}

/** Post a message (or a thread reply when `parent` is set). */
export async function sendMessage(input: {
  channel: string;
  text: string;
  parent?: string | null;
}): Promise<MessageRecord> {
  const text = input.text.trim();
  if (!text) throw new Error('Message text cannot be empty.');

  return pb.collection('messages').create<MessageRecord>({
    channel: input.channel,
    author: requireUserId(),
    text,
    parent: input.parent ?? null,
  });
}

/** Edit your own message. The server only allows the author to update. */
export async function editMessage(id: string, text: string): Promise<MessageRecord> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Message text cannot be empty.');
  return pb.collection('messages').update<MessageRecord>(id, { text: trimmed });
}

/** Delete your own message (thread replies cascade with it). */
export async function deleteMessage(id: string): Promise<boolean> {
  return pb.collection('messages').delete(id);
}

/** Replies to a message, oldest first. */
export async function getThread(parentId: string): Promise<MessageRecord[]> {
  return pb.collection('messages').getFullList<MessageRecord>({
    filter: `parent = "${parentId}"`,
    sort: 'created',
  });
}

/**
 * Reply count per parent message — keyed by message id, so the feed can show
 * thread badges without N round trips. Pass `channelId` to count within one
 * channel, or omit it to count across every readable channel.
 */
export async function getThreadCounts(channelId?: string): Promise<Record<string, number>> {
  const filter = ['parent != null'];
  if (channelId) filter.unshift(`channel = "${channelId}"`);

  const replies = await pb.collection('messages').getFullList<Pick<MessageRecord, 'parent'>>({
    filter: filter.join(' && '),
    fields: 'parent',
  });

  const counts: Record<string, number> = {};
  for (const reply of replies) {
    if (!reply.parent) continue;
    counts[reply.parent] = (counts[reply.parent] ?? 0) + 1;
  }
  return counts;
}

/**
 * How many messages were posted after `since` (ISO timestamp, or null to
 * count everything). Used for unread badges.
 */
export async function countMessagesAfter(
  channelId: string,
  since: string | null,
  options: { excludeAuthor?: string } = {}
): Promise<number> {
  const filter = [`channel = "${channelId}"`];
  if (since) filter.push(`created > "${since}"`);
  if (options.excludeAuthor) filter.push(`author != "${options.excludeAuthor}"`);

  const { totalItems } = await pb.collection('messages').getList(1, 1, {
    filter: filter.join(' && '),
  });
  return totalItems;
}

/**
 * Watch a channel for new/edited/deleted messages. Resolves once the
 * subscription is live; call the returned function to unsubscribe.
 */
export async function subscribeToMessages(
  channelId: string,
  onEvent: (event: MessageEvent) => void
): Promise<UnsubscribeFunc> {
  return pb.collection('messages').subscribe<MessageRecord>(
    '*',
    (event) => {
      onEvent({ action: event.action as MessageEvent['action'], record: event.record });
    },
    { filter: `channel = "${channelId}"` }
  );
}
