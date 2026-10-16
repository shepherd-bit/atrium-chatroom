/**
 * Users, auth, and profile files — the only module allowed to talk to the
 * `users` collection or to the PocketBase authStore.
 *
 * Everything else in src/api (and every component/context) goes through the
 * functions below, so no UI code ever imports `../lib/pocketbase`.
 */
import { pb, asUserRecord } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import type { UserRecord } from '../types';

// Auth forms need to turn SDK/network failures into copy worth showing a
// user — re-exported so callers only ever import from the API layer.
export { getAuthErrorMessage } from '../lib/pocketbase';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** The signed-in user's record, or null when signed out. */
export function currentUser(): UserRecord | null {
  return asUserRecord(pb.authStore.record);
}

/** The signed-in user's id, or null when signed out. */
export function currentUserId(): string | null {
  return pb.authStore.record?.id ?? null;
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid && !!pb.authStore.record;
}

/**
 * Same as `currentUserId()` but throws instead of returning null — use it in
 * API functions that cannot work without an author (send message, join
 * channel, set presence).
 */
export function requireUserId(): string {
  const id = currentUserId();
  if (!id) throw new Error('You need to be signed in to do that.');
  return id;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Validate the saved session (if any) and return the refreshed record.
 * A revoked/invalid token is cleared, so this is safe to call on boot and
 * treat `null` as "signed out".
 */
export async function restoreSession(): Promise<UserRecord | null> {
  if (!pb.authStore.isValid || !pb.authStore.record) return null;
  try {
    // authRefresh verifies the stored token and writes the fresh record
    // back to the authStore.
    const { record } = await pb.collection('users').authRefresh();
    return asUserRecord(record);
  } catch {
    pb.authStore.clear();
    return null;
  }
}

export async function login(email: string, password: string): Promise<UserRecord> {
  const { record } = await pb
    .collection('users')
    .authWithPassword<UserRecord>(email, password);
  return record;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

/** Register a new account and sign in with it. */
export async function register({ name, email, password }: RegisterInput): Promise<UserRecord> {
  // users.createRule is "" in the migration, so registration is open.
  await pb.collection('users').create({
    name,
    email,
    password,
    passwordConfirm: password,
  });
  // Creating a record doesn't sign you in — do it right after so the new
  // account lands in the app with a valid token.
  return login(email, password);
}

/** Clear the stored token/record. Fires `onAuthChange` listeners. */
export function logout(): void {
  pb.authStore.clear();
}

/**
 * Subscribe to auth changes (login, logout, or another tab signing out —
 * LocalAuthStore listens to cross-tab storage events). Returns the
 * unsubscribe function.
 */
export function onAuthChange(listener: (user: UserRecord | null) => void): () => void {
  return pb.authStore.onChange((_token, record) => listener(asUserRecord(record)));
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

/** Every user profile the signed-in account is allowed to read. */
export async function listUsers(): Promise<UserRecord[]> {
  return pb.collection('users').getFullList<UserRecord>({ sort: 'name' });
}

export async function getUser(id: string): Promise<UserRecord> {
  return pb.collection('users').getOne<UserRecord>(id);
}

// A `type` (not an interface) so it carries an implicit index signature and
// can be handed straight to the SDK's untyped update body.
export type UpdateProfileInput = {
  name?: string;
  title?: string;
  timezone?: string;
};

/**
 * Edit the signed-in user's profile. The authStore is rewritten with the
 * updated record so `currentUser()` (and anything rendered from it) picks up
 * the change without a reload.
 */
export async function updateProfile(patch: UpdateProfileInput): Promise<UserRecord> {
  return updateMe(patch);
}

/** Replace the signed-in user's avatar. Pass a `File` from an `<input type=file>`. */
export async function updateAvatar(file: File): Promise<UserRecord> {
  const body = new FormData();
  body.append('avatar', file);
  return updateMe(body);
}

async function updateMe(body: UpdateProfileInput | FormData): Promise<UserRecord> {
  // Read back as UserRecord & RecordModel so the fresh record can also be
  // written to the authStore, which types its records as RecordModel.
  const record = await pb
    .collection('users')
    .update<UserRecord & RecordModel>(requireUserId(), body);
  if (pb.authStore.token) {
    pb.authStore.save(pb.authStore.token, record);
  }
  return record;
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

/**
 * Absolute URL for a user's avatar, with a stable placeholder for accounts
 * that never uploaded one (so re-renders don't jitter between images).
 */
export function avatarURL(
  user: Pick<UserRecord, 'id' | 'avatar'>,
  options: { thumb?: string } = {}
): string {
  if (!user.avatar) return `https://i.pravatar.cc/150?u=${user.id}`;
  return pb.files.getURL(
    user as UserRecord,
    user.avatar,
    options.thumb ? { thumb: options.thumb } : undefined
  );
}
