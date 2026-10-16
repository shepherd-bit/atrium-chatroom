/**
 * Atrium API layer.
 *
 * Every PocketBase call in the app goes through these modules — components
 * and contexts import from `'../api'`, never from `'../lib/pocketbase'`.
 *
 *   channels   — conversation containers (public, private, DMs)
 *   messages   — history, threads, realtime updates
 *   users      — auth, profiles, avatar URLs
 *   membership — channel_members rows + unread counts
 *   presence   — online/away status rows
 */
export * from './channels';
export * from './messages';
export * from './users';
export * from './membership';
export * from './presence';
