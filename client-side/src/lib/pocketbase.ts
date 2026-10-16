import PocketBase, { ClientResponseError } from 'pocketbase';
import type { AuthRecord } from 'pocketbase';
import type { UserRecord } from '../types';

export const PB_URL = import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8090';

// Single shared client instance. LocalAuthStore (the default) persists the
// token + user record to localStorage and rehydrates them on construction,
// so a page refresh restores the session without any extra plumbing.
//
// Import boundary: only the modules in src/api may import this client.
// Components and contexts go through the API layer ('../api') instead.
export const pb = new PocketBase(PB_URL);

// The SDK types auth records loosely (RecordModel). The users collection is
// declared in server-side/pb_migrations, so we narrow it to our known shape
// in one place rather than casting at every call site.
export function asUserRecord(record: AuthRecord): UserRecord | null {
  return (record as unknown as UserRecord) ?? null;
}

// Turn PocketBase/network errors into something worth showing on a form.
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ClientResponseError) {
    // status 0 means no HTTP response ever arrived — the request died in
    // transport (server down, wrong URL, CORS). The SDK wraps the underlying
    // fetch TypeError in originalError, so surface that instead of the
    // useless "Request failed (0)" the generic branch would print.
    if (error.status === 0) {
      const cause = error.originalError as { message?: string } | undefined;
      if (cause?.message?.includes('ECONNREFUSED')) {
        return `Could not reach PocketBase at ${PB_URL} — connection refused. Is the server running?`;
      }
      return `Could not reach PocketBase at ${PB_URL}. Is the server running?`;
    }

    // Field-level errors (e.g. "email must be a valid email address") win
    // over the generic response message when present.
    const fieldErrors = error.data?.data;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const first = Object.values(fieldErrors)[0] as { message?: string } | undefined;
      if (first?.message) return first.message;
    }
    if (typeof error.data?.message === 'string' && error.data.message) {
      return error.data.message;
    }
    return `Request failed (${error.status}). Please try again.`;
  }
  if (error instanceof TypeError) {
    return `Could not reach PocketBase at ${PB_URL}. Is the server running?`;
  }
  return 'Something went wrong. Please try again.';
}
