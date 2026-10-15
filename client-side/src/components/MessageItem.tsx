import React, { useState } from 'react';
import type { Message, User } from '../types';

interface MessageItemProps {
  message: Message;
  getUser: (userId: string) => User;
  currentUserId: string;
  onReaction: (messageId: string, emoji: string) => void;
  onOpenThread: (message: Message) => void;
  onSelectUser: (user: User) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  getUser,
  currentUserId,
  onReaction,
  onOpenThread,
  onSelectUser,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const author = getUser(message.userId);
  const isHovered = hoveredId === message.id;

  return (
    <div
      onMouseEnter={() => setHoveredId(message.id)}
      onMouseLeave={() => setHoveredId(null)}
      className="group relative flex gap-3 py-2.5 px-2 -mx-2 rounded-[12px] hover:bg-[#F9F9FB] transition-colors"
    >
      {/* Avatar */}
      <button onClick={() => onSelectUser(author)} className="shrink-0">
        <img src={author.avatar_url} alt={author.name} className="w-8 h-8 rounded-full object-cover mt-0.5" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[14px] font-medium leading-5 text-[#0A0A0A]">{author.name}</span>
          <span className="text-[12px] text-[#71717A]">{message.time}</span>
          {author.id === currentUserId && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#0A0A0A] text-white text-[10px] font-medium leading-none">
              YOU
            </span>
          )}
        </div>

        <div className="mt-1 text-[14px] leading-[20px] text-[#0A0A0A] whitespace-pre-wrap break-words max-w-[600px]">
          {message.text}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReaction(message.id, r.emoji)}
                className={`h-6 px-2 rounded-full border text-[12px] flex items-center gap-1 transition-all ${
                  r.me ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'bg-white border-[#EAEAEA] hover:border-[#0A0A0A]'
                }`}
              >
                <span>{r.emoji}</span>
                <span className="font-medium">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread Trigger */}
        {message.threadCount ? (
          <button onClick={() => onOpenThread(message)} className="mt-2.5 flex items-center gap-2 group/thread">
            <div className="flex -space-x-1.5">
              {message.threadAvatars?.map((avatar, idx) => (
                <img key={idx} src={avatar} alt="" className="w-5 h-5 rounded-full border-2 border-white object-cover" />
              ))}
            </div>
            <span className="text-[12px] font-medium text-[#0A84FF] group-hover/thread:underline">
              {message.threadCount} replies →
            </span>
          </button>
        ) : null}
      </div>

      {/* Floating Reaction & Action Bar */}
      <div
        className={`absolute right-2 -top-3 flex items-center gap-0.5 p-1 rounded-full bg-white border border-[#EAEAEA] shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all ${
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
        }`}
      >
        {['😍', '🔥', '🙏', '✨'].map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReaction(message.id, emoji)}
            className="w-7 h-7 rounded-full hover:bg-[#F6F6F7] flex items-center justify-center text-[14px]"
          >
            {emoji}
          </button>
        ))}
        <div className="w-[1px] h-4 bg-[#EAEAEA] mx-1" />
        <button
          onClick={() => onOpenThread(message)}
          className="w-7 h-7 rounded-full hover:bg-[#F6F6F7] flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.5">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
};