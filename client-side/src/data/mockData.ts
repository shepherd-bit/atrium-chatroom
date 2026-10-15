import type { User, Channel, Message } from '../types';

export const mockUsers: User[] = [
  { id: '1', name: 'Alex Rivera', full_name: 'Alex Rivera', avatar_url: 'https://i.pravatar.cc/150?img=11', role: 'Product Lead', status: 'online', statusText: 'In a meeting • 12m', time: '2:42 PM', localTime: '9:42 AM local' },
  { id: '2', name: 'Sage Chen', full_name: 'Sage Chen', avatar_url: 'https://i.pravatar.cc/150?img=5', role: 'Design Director', status: 'online', statusText: 'Designing • Figma', time: '2:40 PM', localTime: '11:40 AM local' },
  { id: '3', name: 'Milo Hart', full_name: 'Milo Hart', avatar_url: 'https://i.pravatar.cc/150?img=12', role: 'Senior Engineer', status: 'online', statusText: 'Coding • deep-work', time: '2:38 PM', localTime: '2:38 PM local' },
  { id: '4', name: 'June Park', full_name: 'June Park', avatar_url: 'https://i.pravatar.cc/150?img=32', role: 'Product Designer', status: 'online', statusText: 'Reviewing • 5m', time: '2:35 PM', localTime: '5:35 PM local' },
  { id: '5', name: 'Theo Kim', full_name: 'Theo Kim', avatar_url: 'https://i.pravatar.cc/150?img=15', role: 'Engineering', status: 'away', statusText: 'Away • 24m', time: '2:30 PM', localTime: '2:30 PM local' },
  { id: '6', name: 'Lena Ortiz', full_name: 'Lena Ortiz', avatar_url: 'https://i.pravatar.cc/150?img=23', role: 'Operations', status: 'online', statusText: 'Available', time: '2:28 PM', localTime: '8:28 AM local' },
  { id: '7', name: 'Kai Nakamura', full_name: 'Kai Nakamura', avatar_url: 'https://i.pravatar.cc/150?img=8', role: 'Design Systems', status: 'online', statusText: 'In Figma • now', time: '2:25 PM', localTime: '11:25 PM local' },
  { id: '8', name: 'Zara Mills', full_name: 'Zara Mills', avatar_url: 'https://i.pravatar.cc/150?img=9', role: 'Product Marketing', status: 'online', statusText: 'Writing • 8m', time: '2:22 PM', localTime: '10:22 AM local' }
];

export const mockChannels: Channel[] = [
  { id: 'deep-work', name: 'deep-work', desc: 'Focused work, no distractions. Async by default.', members: ['1','2','3','4','5','6'], unread: 3 },
  { id: 'product', name: 'product', desc: 'Roadmap, specs, and launches', members: ['1','2','4','8'], unread: 1 },
  { id: 'design', name: 'design', desc: 'Design reviews and system updates', members: ['2','4','7'] },
  { id: 'engineering', name: 'engineering', desc: 'Deploys, incidents, and architecture', members: ['3','5','1'], unread: 2 },
  { id: 'watercooler', name: 'watercooler', desc: 'Random, memes, off-topic', members: ['1','2','3','4','5','6','7','8'] }
];

export const mockMessages: Message[] = [
  {
    id: 'm1',
    channelId: 'deep-work',
    userId: '2',
    text: 'Shipped the new Atrium layout explorations — took the feedback from yesterday and stripped everything down to pure type and space. No shadows, no color. Thoughts?',
    time: '9:12 AM',
    timestamp: Date.now() - 18000000,
    threadCount: 3,
    threadAvatars: ['https://i.pravatar.cc/150?img=11', 'https://i.pravatar.cc/150?img=12', 'https://i.pravatar.cc/150?img=32']
  },
  {
    id: 'm2',
    channelId: 'deep-work',
    userId: '4',
    text: 'This feels right. The 8px grid is finally consistent. Love how the message rows breathe — Linear-level density but with our own voice.',
    time: '9:14 AM',
    timestamp: Date.now() - 18000000 + 120000
  },
  {
    id: 'm3',
    channelId: 'deep-work',
    userId: '3',
    text: 'Pushed the realtime presence layer. Green dot is now via Supabase presence. Check profiles.avatar_url field — we’re loading real images everywhere, no more initials fallback.',
    time: '9:18 AM',
    timestamp: Date.now() - 18000000 + 300000
  },
  {
    id: 'm4',
    channelId: 'deep-work',
    userId: '1',
    text: 'Quick decision needed: should we keep the right detail panel collapsible or docked? I’m leaning collapsed by default — focus on the thread, reveal context only on demand. Minimal > maximal.',
    time: '10:02 AM',
    timestamp: Date.now() - 14400000,
    threadCount: 5,
    threadAvatars: ['https://i.pravatar.cc/150?img=5', 'https://i.pravatar.cc/150?img=32', 'https://i.pravatar.cc/150?img=23']
  },
  {
    id: 'm5',
    channelId: 'deep-work',
    userId: '7',
    text: 'Collapsed. The Atrium concept is about air. Three thin columns, nothing airtight feels heavy. The detail panel should slide, not push.',
    time: '10:04 AM',
    timestamp: Date.now() - 14400000 + 120000
  },
  {
    id: 'm6',
    channelId: 'deep-work',
    userId: '6',
    text: 'Ops update: All-hands moved to 3pm. Will share doc link in #product. No blockers on my side.',
    time: '11:30 AM',
    timestamp: Date.now() - 7200000
  },
  {
    id: 'm7',
    channelId: 'deep-work',
    userId: '2',
    text: 'Noted. I’ll prep the prototype link. We’re so close to something that feels inevitable — like it always existed.',
    time: '11:32 AM',
    timestamp: Date.now() - 7200000 + 60000
  },
  {
    id: 'm8',
    channelId: 'product',
    userId: '8',
    text: 'Drafted Q1 narrative — link in canvas. Would love eyes from design before EOD.',
    time: '9:00 AM',
    timestamp: Date.now() - 21600000
  },
  {
    id: 'm9',
    channelId: 'design',
    userId: '4',
    text: 'Tokens PR is up. 12px, 16px, 9999px only. Killed all 8px radius outliers.',
    time: '8:45 AM',
    timestamp: Date.now() - 25200000
  },
  {
    id: 'm10',
    channelId: 'engineering',
    userId: '5',
    text: 'DB migration complete. avatar_url is now non-nullable on profiles. Added index.',
    time: '7:30 AM',
    timestamp: Date.now() - 28800000
  }
];

export const mockThreads: Record<string, Message[]> = {
  m1: [
    { id: 't1', channelId: 'deep-work', userId: '1', text: 'The spacing on hover actions — 1px border, 12px radius, so clean.', time: '9:13 AM', timestamp: Date.now() },
    { id: 't2', channelId: 'deep-work', userId: '4', text: 'Inter everywhere really ties it. No serif sneaking in.', time: '9:13 AM', timestamp: Date.now() },
    { id: 't3', channelId: 'deep-work', userId: '3', text: 'Agreed. Shipping this as V2.', time: '9:15 AM', timestamp: Date.now() }
  ],
  m4: [
    { id: 't4', channelId: 'deep-work', userId: '2', text: 'Collapsed default yes. Maybe remember last state locally?', time: '10:03 AM', timestamp: Date.now() },
    { id: 't5', channelId: 'deep-work', userId: '5', text: 'I like collapsed. Feels more focused.', time: '10:03 AM', timestamp: Date.now() },
    { id: 't6', channelId: 'deep-work', userId: '1', text: 'Done. Implementing slide with transform.', time: '10:05 AM', timestamp: Date.now() },
    { id: 't7', channelId: 'deep-work', userId: '6', text: 'Plus works better on mobile.', time: '10:06 AM', timestamp: Date.now() },
    { id: 't8', channelId: 'deep-work', userId: '7', text: 'Exactly.', time: '10:07 AM', timestamp: Date.now() }
  ]
};
