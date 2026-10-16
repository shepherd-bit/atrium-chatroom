import React, { useRef, useEffect } from 'react';
import type { Message, Channel, User } from '../types';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';

interface ChatWindowProps {
  activeChannel?: Channel;
  activeDMUser?: User;
  messages: Message[];
  currentUserId: string;
  getUser: (userId: string) => User;
  onOpenThread: (message: Message) => void;
  onSelectUser: (user: User) => void;
  onToggleRightPanel: () => void;
  isRightPanelOpen: boolean;
  onOpenMobileSidebar: () => void;
  inputValue: string;
  onInputChange: (val: string) => void;
  onSendMessage: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  activeChannel,
  activeDMUser,
  messages,
  currentUserId,
  getUser,
  onOpenThread,
  onSelectUser,
  onToggleRightPanel,
  isRightPanelOpen,
  onOpenMobileSidebar,
  inputValue,
  onInputChange,
  onSendMessage,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChannel?.id]);

  // A DM is a channel like any other — `type` is the only difference, and the
  // label/avatar come from the other participant (`activeDMUser`).
  const isDM = activeChannel?.type === 'dm';
  const title = isDM ? (activeDMUser?.name ?? 'Direct message') : `#${activeChannel?.name}`;
  // Channels carry a description; the creator (from `expand=created_by`)
  // trails it so you know who opened the room.
  const creator = !isDM && activeChannel?.createdBy ? `Created by ${activeChannel.createdBy.name}` : null;
  const subtitle = isDM
    ? (activeDMUser?.statusText ?? 'No messages yet')
    : [activeChannel?.desc, creator].filter(Boolean).join(' • ');

  // No conversation selected (a brand-new account with no channels yet) —
  // say so instead of rendering a header for a channel that doesn't exist.
  if (!activeChannel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white min-w-0 gap-1.5 px-6 text-center">
        <span className="text-[14px] font-medium">No channels yet</span>
        <span className="text-[13px] text-[#71717A]">
          Channels you create or join will show up here.
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      {/* Header */}
      <div className="h-[64px] border-b border-[#EAEAEA] px-4 md:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="md:hidden w-8 h-8 rounded-full border border-[#EAEAEA] flex items-center justify-center"
            onClick={onOpenMobileSidebar}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight">{title}</span>
              {isDM ? (
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeDMUser?.status === 'online' ? 'bg-[#10B981]' : 'bg-[#EAEAEA]'
                  }`}
                />
              ) : (
                <span className="px-1.5 py-0.5 rounded-full bg-[#F6F6F7] border border-[#EAEAEA] text-[10px] font-medium">
                  PRIVATE
                </span>
              )}
            </div>
            <div className="text-[12px] text-[#71717A] truncate max-w-[280px] md:max-w-[420px]">{subtitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isDM && activeChannel && (
            <div className="hidden md:flex items-center -space-x-2">
              {activeChannel.members.slice(0, 4).map((userId) => {
                const member = getUser(userId);
                return (
                  <img key={userId} src={member.avatar_url} alt={member.name} className="w-7 h-7 rounded-full border-2 border-white object-cover" />
                );
              })}
              <div className="w-7 h-7 rounded-full bg-[#F6F6F7] border-2 border-white flex items-center justify-center text-[10px] font-medium">
                +{Math.max(0, activeChannel.members.length - 4)}
              </div>
            </div>
          )}
          <button className="h-8 px-3 rounded-full border border-[#EAEAEA] bg-white text-[13px] font-medium hover:border-[#0A0A0A] transition-colors hidden md:flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </button>
          <button
            onClick={onToggleRightPanel}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
              isRightPanelOpen ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'bg-white border-[#EAEAEA] hover:border-[#0A0A0A]'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-[760px] mx-auto w-full px-4 md:px-6 py-6">
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-[1px] bg-[#EAEAEA]" />
            <span className="px-2.5 py-1 rounded-full bg-[#F6F6F7] border border-[#EAEAEA] text-[11px] font-medium tracking-wide text-[#71717A]">
              TODAY • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <div className="flex-1 h-[1px] bg-[#EAEAEA]" />
          </div>

          <div className="space-y-1">
            {messages.map((m) => (
              <MessageItem
                key={m.id}
                message={m}
                getUser={getUser}
                currentUserId={currentUserId}
                onOpenThread={onOpenThread}
                onSelectUser={onSelectUser}
              />
            ))}
          </div>

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input Box */}
      <MessageInput
        value={inputValue}
        onChange={onInputChange}
        onSend={onSendMessage}
        placeholder={isDM ? (activeDMUser ? `Message ${activeDMUser.name}` : 'Message') : `Message #${activeChannel?.name}`}
      />
    </div>
  );
};