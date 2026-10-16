#!/usr/bin/env node
/**
 * Atrium — seed the PocketBase database with a demo workspace.
 *
 * Creates, in this order:
 *   1. Four demo users (one password, printed at the end),
 *   2. Five channels — four public, one private — owned by the first demo user,
 *   3. `channel_members` rows for every account (see the join-demo note below),
 *   4. `presences` rows, so the People dots are real data,
 *   5. ~55 messages plus a threaded reply, created in order so `created`
 *      comes back chronological — which is the order the feed renders.
 *
 * Join-demo note: accounts the script didn't create (your own signup) are
 * added to every seeded channel EXCEPT `#design-crit`. That channel stays
 * public-but-unjoined, so the app's Browse tab has something to Join — and
 * its messages only become readable after you do (`messages.listRule` is
 * scoped to members).
 *
 * Prerequisite:  cd server-side && ./pocketbase serve
 * Run:           cd client-side && npm run seed
 * Env:           PB_URL         default http://127.0.0.1:8090
 *                SEED_PASSWORD  default atriumdemo123
 *
 * Re-running is safe: users/channels/memberships are looked up first, and a
 * channel that already has messages is left untouched.
 */
import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL ?? 'http://127.0.0.1:8090';
const PASSWORD = process.env.SEED_PASSWORD ?? 'atriumdemo123';

const pb = new PocketBase(PB_URL);
// Same reason as src/lib/pocketbase.ts: sequential auth/create calls must not
// cancel each other.
pb.autoCancellation(false);

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SEED_USERS = [
  {
    key: 'maya',
    name: 'Maya Okonjo',
    email: 'maya@atrium.dev',
    title: 'Product Designer',
    timezone: 'Africa/Nairobi',
    presence: { state: 'online', status_text: 'Designing in Figma' },
  },
  {
    key: 'daniel',
    name: 'Daniel Reyes',
    email: 'daniel@atrium.dev',
    title: 'Staff Engineer',
    timezone: 'America/New_York',
    presence: { state: 'online', status_text: 'Heads-down until 3' },
  },
  {
    key: 'priya',
    name: 'Priya Nair',
    email: 'priya@atrium.dev',
    title: 'Product Manager',
    timezone: 'Asia/Kolkata',
    presence: { state: 'away', status_text: 'In a roadmap review' },
  },
  {
    key: 'jonas',
    name: 'Jonas Weber',
    email: 'jonas@atrium.dev',
    title: 'Frontend Engineer',
    timezone: 'Europe/Berlin',
    presence: { state: 'online', status_text: 'Reviewing PRs' },
  },
];

const SEED_CHANNELS = [
  {
    name: 'general',
    type: 'public',
    description: 'Company-wide announcements and chatter',
  },
  {
    name: 'engineering',
    type: 'public',
    description: 'Ship it — deploys, reviews, incidents',
  },
  {
    name: 'design-crit',
    type: 'public',
    description: 'Weekly critique — work in progress, not finished work',
    // Accounts outside SEED_USERS are NOT seated here, so they can try Join.
    joinDemo: true,
  },
  {
    name: 'random',
    type: 'public',
    description: 'Memes, pets, and weekend plans',
  },
  {
    name: 'leadership',
    type: 'private',
    description: 'Planning, budgets, and hiring — members only',
  },
];

/** `replyTo` is an index into the same channel's list — replies come after parents. */
const SEED_MESSAGES = {
  general: [
    { from: 'maya', text: 'Morning all — sprint 12 board is up. Please move your tickets before standup.' },
    { from: 'daniel', text: 'On it. The search fix shipped last night, no errors in the logs.' },
    { from: 'priya', text: 'Nice — customers were definitely feeling that one. Three tickets about it this week.' },
    { from: 'jonas', text: 'Is the all hands still Thursday at 4?' },
    { from: 'priya', text: 'Yes, same link. Should be short — we\'re only covering the Q4 roadmap.' },
    { from: 'maya', text: 'I\'ll share the brand slides beforehand so we don\'t burn meeting time on them.' },
    { from: 'daniel', text: 'Heads up: staging goes down ~20 min around noon for a DB upgrade.' },
    { from: 'priya', text: 'Noted. Nobody demo during that window, please 😅' },
    { from: 'jonas', text: 'Can we get the design tokens into the repo this sprint? Hand-copying colors is how mistakes happen.' },
    { from: 'maya', text: 'Already PR\'d it — waiting on whoever owns the build tooling.' },
    { from: 'daniel', text: 'That\'s me. I\'ll take it after lunch.' },
    { from: 'priya', text: 'Reminder: the office is closed next Monday. Plan accordingly.' },
  ],
  engineering: [
    { from: 'daniel', text: 'The flaky test in checkout_spec fails about 1 in 5 runs. Taking it today.' },
    { from: 'jonas', text: 'Websocket reconnect still drops the first message after a laptop wakes up.' },
    { from: 'daniel', text: 'Yeah, I saw that — we ack after subscribe instead of before. Fix is small.' },
    { from: 'maya', text: 'Designer question: when a message fails to send, do we keep it in the box? (please say yes)' },
    { from: 'jonas', text: 'We do — the draft survives a failed send.' },
    { from: 'maya', text: 'Perfect, that matches the prototype.' },
    { from: 'daniel', text: 'v2.3 shipped: faster channel loads. Unread badges come next.' },
    { from: 'priya', text: 'What\'s the blast radius if we turn realtime on for everyone at once?' },
    { from: 'daniel', text: 'Socket budget, mostly. I\'d roll it to 10% first and watch open connections.' },
    { from: 'jonas', text: 'Agreed. I\'ll add the counter to the dashboard this afternoon.' },
    { from: 'daniel', text: 'PR #412 needs one more review — it\'s the unread bookkeeping, small diff.' },
    { from: 'jonas', text: 'Reviewing now.' },
    { from: 'maya', text: 'Can we call out the new thread UI in the release notes too?', replyTo: 6 },
    // Replies always point at a *feed* message (parent = a reply would render
    // nowhere: the feed hides replies, and only root threads get opened).
    { from: 'daniel', text: 'Good idea — adding it.', replyTo: 6 },
  ],
  'design-crit': [
    { from: 'maya', text: 'New thread panel comp is in Figma — tapping a badge should feel instant.' },
    { from: 'priya', text: 'Love it. Does the reply count update when someone else posts?' },
    { from: 'maya', text: 'Not yet — counts come from the initial load. Realtime is on the list.' },
    { from: 'jonas', text: 'I can wire that up the moment the subscription lands.' },
    { from: 'maya', text: 'Empty states are done for channels, threads, and DMs — no more blank rectangles.' },
    { from: 'priya', text: 'The no-channels screen still reads a little cold. Maybe suggest creating one?' },
    { from: 'maya', text: 'Agreed — I\'ll rewrite it with a button.' },
    { from: 'jonas', text: 'Sidebar density feels good now. 320px was the right call.' },
    { from: 'maya', text: 'Crit Thursday as usual — bring work in progress, not finished work.' },
  ],
  random: [
    { from: 'jonas', text: 'Coffee run in 10 — shout if you want anything.' },
    { from: 'priya', text: 'Flat white please 🙏' },
    { from: 'daniel', text: 'Same.' },
    { from: 'maya', text: 'Pet tax: my cat has claimed the office chair.' },
    { from: 'jonas', text: 'That chair is hers now. We accept this.' },
    { from: 'daniel', text: 'Weekend plans? I\'m finally fixing the garden fence.' },
    { from: 'priya', text: 'Roadmap review on Saturday... I have made poor choices.' },
    { from: 'maya', text: 'Sending you strength. And snacks.' },
    { from: 'jonas', text: 'Reminder that the vending machine on floor 2 is still broken. Tragic.' },
    { from: 'daniel', text: 'Filed a ticket. Priority: critical.' },
  ],
  leadership: [
    { from: 'priya', text: 'Q4 planning doc is open for comments — please leave them by Friday.' },
    { from: 'maya', text: 'Design hiring is my bottleneck; two roles still unfilled.' },
    { from: 'daniel', text: 'Infrastructure budget looks fine through next quarter.' },
    { from: 'priya', text: 'Let\'s finalize the launch date Thursday so marketing can lock the campaign.' },
    { from: 'maya', text: 'Works for me.' },
    { from: 'daniel', text: 'Same.' },
  ],
};

// ---------------------------------------------------------------------------
// Helpers — small mirrors of src/api so the script never imports TypeScript.
// ---------------------------------------------------------------------------

function log(...args) {
  console.log(...args);
}

async function ensureUser(user) {
  try {
    const { record } = await pb.collection('users').authWithPassword(user.email, PASSWORD);
    return { record, created: false };
  } catch {
    // Not (yet) signed in with SEED_PASSWORD — try to create the account.
  }

  try {
    await pb.collection('users').create({
      name: user.name,
      email: user.email,
      password: PASSWORD,
      passwordConfirm: PASSWORD,
      title: user.title,
      timezone: user.timezone,
    });
  } catch {
    // Exists but the password didn't match above → say so instead of 400ing.
    try {
      const { record } = await pb.collection('users').authWithPassword(user.email, PASSWORD);
      return { record, created: false };
    } catch {
      throw new Error(
        `${user.email} exists but SEED_PASSWORD doesn't match it. ` +
          `Rerun with SEED_PASSWORD=<the password that account uses>.`
      );
    }
  }

  const { record } = await pb.collection('users').authWithPassword(user.email, PASSWORD);
  return { record, created: true };
}

/** The SDK keeps one token — flip it only when the actor actually changes. */
let actingAs = null;
async function authAs(user) {
  if (actingAs === user.id) return;
  await pb.collection('users').authWithPassword(user.email, PASSWORD);
  actingAs = user.id;
}

async function ensureChannel(spec, owner) {
  // getFullList resolves to a plain array (unlike getList's { items } page).
  const existing = await pb.collection('channels').getFullList({
    filter: `name = "${spec.name}" && type = "${spec.type}"`,
  });
  if (existing[0]) return existing[0];
  return pb.collection('channels').create({
    name: spec.name,
    description: spec.description,
    type: spec.type,
    created_by: owner.id,
  });
}

/** Mirrors `ensureMembership()` in src/api/membership.ts (unique per pair). */
async function ensureMembership(channelId, userId, role, lastRead) {
  const { items } = await pb.collection('channel_members').getList(1, 1, {
    filter: `channel = "${channelId}" && user = "${userId}"`,
    skipTotal: true,
  });
  if (items[0]) return { created: false };
  await pb.collection('channel_members').create({
    channel: channelId,
    user: userId,
    role,
    last_read: lastRead,
  });
  return { created: true };
}

async function ensurePresence(user) {
  await authAs(user);
  const { items } = await pb.collection('presences').getList(1, 1, {
    filter: `user = "${user.id}"`,
    skipTotal: true,
  });
  const body = { ...user.presence, last_seen: new Date().toISOString() };
  if (items[0]) {
    await pb.collection('presences').update(items[0].id, body);
    return { created: false };
  }
  await pb.collection('presences').create({ user: user.id, ...body });
  return { created: true };
}

async function messageCount(channelId) {
  const { totalItems } = await pb.collection('messages').getList(1, 1, {
    filter: `channel = "${channelId}"`,
  });
  return totalItems;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  try {
    await pb.health.check();
  } catch {
    console.error(`✖ Can't reach PocketBase at ${PB_URL}.`);
    console.error('  Start it first:  cd server-side && ./pocketbase serve');
    process.exit(1);
  }

  // 1. Users ---------------------------------------------------------------
  log('\nUsers');
  const users = [];
  let createdUsers = 0;
  for (const spec of SEED_USERS) {
    const { record, created } = await ensureUser(spec);
    users.push({ ...spec, id: record.id });
    if (created) createdUsers++;
    log(`  ${created ? '+' : '·'} ${spec.name.padEnd(14)} ${spec.email}`);
  }
  const userByKey = Object.fromEntries(users.map((u) => [u.key, u]));

  // Anyone already in the database (e.g. your own signup) rides along —
  // authed as a demo user, `users.listRule` lets us read the whole roster.
  // Classified by id: `email` is hidden on other people's records
  // (`emailVisibility`), so emails can't be used to tell accounts apart.
  const everyone = await pb.collection('users').getFullList();
  const seededIds = new Set(users.map((u) => u.id));
  const others = everyone.filter((u) => !seededIds.has(u.id));
  const owner = users[0];
  await authAs(owner);
  if (others.length > 0) {
    log(`  · pre-existing accounts: ${others.map((u) => `${u.name} <${u.email ?? 'email hidden'}>`).join(', ')}`);
  }

  // 2. Channels ------------------------------------------------------------
  log('\nChannels');
  const channels = [];
  for (const spec of SEED_CHANNELS) {
    const record = await ensureChannel(spec, owner);
    channels.push({ ...spec, id: record.id });
    log(`  ${spec.type === 'private' ? '🔒' : '#'} ${spec.name}`);
  }
  const channelByName = Object.fromEntries(channels.map((c) => [c.name, c]));

  // 3. Membership ----------------------------------------------------------
  // `channel_members.createRule` only requires auth, so one session can seat
  // everyone — owner first, then members.
  const now = new Date().toISOString();
  let membershipRows = 0;
  for (const channel of channels) {
    for (const user of users) {
      const role = user.id === owner.id ? 'owner' : 'member';
      // Seeded accounts look "caught up"; everyone else starts with history
      // to read (which is what unread badges will count once they're wired).
      const { created } = await ensureMembership(channel.id, user.id, role, now);
      if (created) membershipRows++;
    }
    if (!channel.joinDemo) {
      for (const other of others) {
        const { created } = await ensureMembership(channel.id, other.id, 'member', null);
        if (created) membershipRows++;
      }
    }
  }
  log(`\nMembership\n  ${membershipRows} new rows across ${channels.length} channels`);

  // 4. Presence ------------------------------------------------------------
  let presenceRows = 0;
  for (const user of users) {
    const { created } = await ensurePresence(user);
    if (created) presenceRows++;
  }
  log(`\nPresence\n  ${presenceRows} new rows (${users.filter((u) => u.presence.state === 'online').length} online)`);

  // 5. Messages ------------------------------------------------------------
  // One auth flip per author change; creation order = `created` order.
  log('\nMessages');
  let messageRows = 0;
  for (const channel of channels) {
    const existing = await messageCount(channel.id);
    if (existing > 0) {
      log(`  · #${channel.name} already has ${existing} messages — left alone`);
      continue;
    }

    const ids = [];
    for (const entry of SEED_MESSAGES[channel.name] ?? []) {
      const author = userByKey[entry.from];
      await authAs(author);
      const record = await pb.collection('messages').create({
        channel: channel.id,
        author: author.id,
        text: entry.text,
        parent: entry.replyTo === undefined ? null : ids[entry.replyTo],
      });
      ids.push(record.id);
      messageRows++;
    }
    log(`  + #${channel.name} — ${ids.length} messages`);
  }

  // Summary ---------------------------------------------------------------
  const joinedNames = channels.filter((c) => !c.joinDemo).map((c) => '#' + c.name);
  log('\n──────────────────────────────────────────────');
  log(`Seed complete: ${createdUsers} new users · ${channels.length} channels · ${membershipRows} new memberships · ${messageRows} new messages`);
  log('\nSign in as any of:');
  for (const user of users) {
    log(`  ${user.email.padEnd(20)} ${PASSWORD.padEnd(16)} ${user.title}`);
  }
  if (others.length > 0) {
    log(`\nPre-existing accounts (${others.map((u) => u.name).join(', ')})`);
    log(`  are members of: ${joinedNames.join(', ')}`);
    log('  #design-crit is public but unjoined — open it via the sidebar +');
    log('  button → Browse tab → Join to see its messages appear.');
  }
  log('');
}

main().catch((error) => {
  console.error('\n✖ Seed failed:', error?.response?.message ?? error.message ?? error);
  process.exit(1);
});
