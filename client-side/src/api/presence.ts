/**
 * Presence — the volatile `presences` collection (one row per user, kept off
 * `users` on purpose).
 *
 * This is the only module allowed to touch the `presences` collection.
 * Presence is best-effort: heartbeat/subscription helpers swallow transport
 * errors rather than breaking the UI over a status dot.
 */
import { ClientResponseError } from 'pocketbase';
import type { UnsubscribeFunc } from 'pocketbase';
import { pb } from '../lib/pocketbase';
import { currentUserId, requireUserId } from './users';
import type { PresenceRecord, PresenceState } from '../types';

export interface SetPresenceInput {
  state: PresenceState;
  /** Free-form status line ("In a meeting • 12m"). Omit to leave it untouched. */
  statusText?: string;
}

export interface PresenceEvent {
  action: 'create' | 'update' | 'delete';
  record: PresenceRecord;
}

/**
 * Set (or refresh) the signed-in user's presence. Upserts: the unique index
 * on `user` means there is never a second row.
 */
export async function setPresence({
  state,
  statusText,
}: SetPresenceInput): Promise<PresenceRecord> {
  const userId = requireUserId();
  const now = new Date().toISOString();
  const body = {
    state,
    ...(statusText !== undefined ? { status_text: statusText } : {}),
    last_seen: now,
  };

  const existing = await getPresence(userId);
  if (existing) {
    return pb.collection('presences').update<PresenceRecord>(existing.id, body);
  }

  try {
    return await pb.collection('presences').create<PresenceRecord>({ user: userId, ...body });
  } catch (error) {
    // A concurrent write (another tab coming online first) won the unique
    // index — the row now exists, so update it instead.
    if (error instanceof ClientResponseError && error.status === 400) {
      const raced = await getPresence(userId);
      if (raced) return pb.collection('presences').update<PresenceRecord>(raced.id, body);
    }
    throw error;
  }
}

export function goOnline(statusText?: string): Promise<PresenceRecord> {
  return setPresence({ state: 'online', statusText });
}

export function goAway(statusText?: string): Promise<PresenceRecord> {
  return setPresence({ state: 'away', statusText });
}

/** Refresh `last_seen` on your presence row. No-op when signed out or never set. */
export async function touchPresence(): Promise<void> {
  const userId = currentUserId();
  if (!userId) return;
  const existing = await getPresence(userId);
  if (!existing) return;
  await pb.collection('presences').update(existing.id, { last_seen: new Date().toISOString() });
}

/**
 * Delete your presence row (call before `logout()` so you don't linger as
 * online). No-op when signed out or already gone.
 */
export async function clearPresence(): Promise<void> {
  const userId = currentUserId();
  if (!userId) return;
  const existing = await getPresence(userId);
  if (!existing) return;
  await pb.collection('presences').delete(existing.id);
}

/** One user's presence row, or null if they never checked in. */
export async function getPresence(userId: string): Promise<PresenceRecord | null> {
  const { items } = await pb.collection('presences').getList<PresenceRecord>(1, 1, {
    filter: `user = "${userId}"`,
    skipTotal: true,
  });
  return items[0] ?? null;
}

/** Every presence row — join against `listUsers()` by `record.user`. */
export async function listPresences(): Promise<PresenceRecord[]> {
  return pb.collection('presences').getFullList<PresenceRecord>({ sort: 'user' });
}

/** Presence for a specific set of users (empty in → empty out, no request). */
export async function listPresencesFor(userIds: string[]): Promise<PresenceRecord[]> {
  if (userIds.length === 0) return [];
  const filter = userIds.map((id) => `user = "${id}"`).join(' || ');
  return pb.collection('presences').getFullList<PresenceRecord>({ filter, sort: 'user' });
}

/**
 * Watch everyone's presence. Resolves once the subscription is live; call
 * the returned function to unsubscribe.
 */
export async function subscribeToPresences(
  onEvent: (event: PresenceEvent) => void
): Promise<UnsubscribeFunc> {
  return pb.collection('presences').subscribe<PresenceRecord>('*', (event) => {
    onEvent({ action: event.action as PresenceEvent['action'], record: event.record });
  });
}

/**
 * Mark yourself online and keep `last_seen` fresh every `intervalMs` until
 * the returned function is called. Call it on mount and `clearPresence()`
 * after `logout()`.
 */
export function startHeartbeat(intervalMs = 30_000): () => void {
  void setPresence({ state: 'online' }).catch(() => {});
  const timer = setInterval(() => {
    void touchPresence().catch(() => {});
  }, intervalMs);
  return () => clearInterval(timer);
}
