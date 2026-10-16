import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Channel, User } from '../types';
import type { CreateChannelInput } from '../api';
import { getAuthErrorMessage } from '../api';

/**
 * Create-or-join sheet behind the sidebar's `+` (and the compose pencil).
 *
 * Two tabs, one dialog:
 *   Create — `createChannel()` seats you as owner, so the channel lands in
 *            the sidebar and becomes the open conversation immediately.
 *   Browse — public channels you can see but aren't in yet; joining is one
 *            `channel_members` insert and pulls the channel's history in.
 *
 * Private channels never appear in Browse — `channels.listRule` hides them
 * from non-members entirely, which is the point of private.
 */

type Tab = 'create' | 'browse';
// `CreateChannelInput['type']` is optional, so it carries `undefined`.
type ChannelType = NonNullable<CreateChannelInput['type']>;

interface ChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Non-DM channels you can see; `members` says whether you're already in. */
  channels: Channel[];
  currentUser: User;
  onCreateChannel: (input: CreateChannelInput) => Promise<void>;
  onJoinChannel: (channelId: string) => Promise<void>;
}

const inputClasses =
  'w-full h-10 px-3.5 rounded-[12px] bg-white border border-[#EAEAEA] text-[13px] text-[#0A0A0A] placeholder:text-[#71717A] focus:outline-none focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] transition-all';

const labelClasses =
  'block text-[11px] font-semibold tracking-widest uppercase text-[#71717A] mb-1.5';

const TYPE_HINTS: Record<ChannelType, string> = {
  public: 'Anyone can find it and join',
  private: 'Only members can see it',
};

export const ChannelModal = ({
  isOpen,
  onClose,
  channels,
  currentUser,
  onCreateChannel,
  onJoinChannel,
}: ChannelModalProps) => {
  const [tab, setTab] = useState<Tab>('create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChannelType>('public');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Escape closes the sheet. setState lives in the listener (an event
  // callback), not the effect body — the effect only subscribes/unsubscribes.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTab('create');
        setError(null);
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /** Close and reset, so every reopen starts on a clean Create tab. */
  const requestClose = () => {
    setTab('create');
    setError(null);
    onClose();
  };

  const joinable = channels.filter(
    (channel) => channel.type === 'public' && !channel.members.includes(currentUser.id)
  );

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the channel a name.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onCreateChannel({ name: trimmed, description: description.trim(), type });
      // Success: App closes the dialog (and selects the new channel).
      setName('');
      setDescription('');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (channel: Channel) => {
    setError(null);
    setJoiningId(channel.id);
    try {
      await onJoinChannel(channel.id);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setJoiningId(null);
    }
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="channel-modal-title"
        className="w-full max-w-[440px] bg-white border border-[#EAEAEA] rounded-[16px] shadow-[0_16px_48px_rgba(0,0,0,0.12)] overflow-hidden"
      >
        {/* Header + tabs */}
        <div className="px-5 pt-5 pb-3 border-b border-[#EAEAEA]">
          <div className="flex items-center justify-between">
            <h2 id="channel-modal-title" className="text-[15px] font-semibold">
              Channels
            </h2>
            <button
              onClick={requestClose}
              aria-label="Close"
              className="w-7 h-7 rounded-full bg-[#F6F6F7] border border-[#EAEAEA] flex items-center justify-center hover:bg-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex gap-1.5 mt-3 p-1 bg-[#F6F6F7] rounded-full w-fit">
            {(['create', 'browse'] as const).map((value) => (
              <button
                key={value}
                onClick={() => switchTab(value)}
                className={`h-7 px-3.5 rounded-full text-[12px] font-medium capitalize transition-colors ${
                  tab === value ? 'bg-[#0A0A0A] text-white' : 'text-[#71717A] hover:text-black'
                }`}
              >
                {value}
                {value === 'browse' && joinable.length > 0 ? ` (${joinable.length})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {error && (
            <div className="mb-4 rounded-[12px] border border-[#EAEAEA] bg-[#F6F6F7] px-3 py-2 text-[13px] text-[#0A0A0A]">
              {error}
            </div>
          )}

          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4" noValidate>
              <div>
                <label htmlFor="channel-name" className={labelClasses}>
                  Name
                </label>
                <input
                  id="channel-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. product-launch"
                  maxLength={60}
                  autoFocus
                  className={inputClasses}
                />
              </div>

              <div>
                <label htmlFor="channel-description" className={labelClasses}>
                  Description <span className="normal-case font-normal">(optional)</span>
                </label>
                <input
                  id="channel-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What's this channel about?"
                  maxLength={255}
                  className={inputClasses}
                />
              </div>

              <div>
                <span className={labelClasses}>Visibility</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['public', 'private'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value)}
                      className={`text-left rounded-[12px] border px-3 py-2.5 transition-all ${
                        type === value
                          ? 'border-[#0A0A0A] ring-1 ring-[#0A0A0A]'
                          : 'border-[#EAEAEA] hover:border-[#71717A]'
                      }`}
                    >
                      <div className="text-[13px] font-medium capitalize">{value}</div>
                      <div className="text-[11px] leading-[15px] text-[#71717A] mt-0.5">
                        {TYPE_HINTS[value]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="h-9 px-4 rounded-full bg-[#0A0A0A] text-white text-[13px] font-medium hover:bg-black transition-colors disabled:opacity-30"
                >
                  {isSubmitting ? 'Creating…' : 'Create channel'}
                </button>
              </div>
            </form>
          ) : joinable.length === 0 ? (
            <p className="text-[13px] text-[#71717A] text-center py-6">
              You're in every public channel.
              <br />
              Private channels show up here once someone adds you.
            </p>
          ) : (
            <div className="space-y-1.5">
              {joinable.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center gap-3 rounded-[12px] border border-[#EAEAEA] px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[13px] text-[#71717A]">#</span>
                      <span className="text-[13px] font-medium truncate">{channel.name}</span>
                      <span className="text-[11px] text-[#71717A] shrink-0">
                        {channel.members.length}
                      </span>
                    </div>
                    {channel.desc && (
                      <div className="text-[12px] text-[#71717A] truncate mt-0.5">
                        {channel.desc}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleJoin(channel)}
                    disabled={joiningId !== null}
                    className="h-7 px-3 rounded-full bg-[#0A0A0A] text-white text-[12px] font-medium hover:bg-black transition-colors disabled:opacity-30 shrink-0"
                  >
                    {joiningId === channel.id ? 'Joining…' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
