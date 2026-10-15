import React, { useState } from 'react';
import type { Message, User, Channel } from '../types';

interface DetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedThread: Message | null;
  selectedUser: User | null;
  activeChannel?: Channel;
  getUser: (userId: string) => User;
  threadReplies: Message[];
  onSendReply: (replyText: string) => void;
  currentUserId: string;
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({
  isOpen,
  onClose,
  selectedThread,
  selectedUser,
  activeChannel,
  getUser,
  threadReplies,
  onSendReply,
  currentUserId,
}) => {
  const [replyText, setReplyText] = useState('');
  const profile = selectedUser || getUser(currentUserId);

  const handleSend = () => {
    if (!replyText.trim()) return;
    onSendReply(replyText);
    setReplyText('');
  };

  return (
    <div
      className={`shrink-0 border-l border-[#EAEAEA] bg-[#FCFCFD] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] fixed md:static inset-y-0 right-0 z-50 md:z-auto w-[360px] ${
        isOpen ? 'flex' : 'hidden md:flex md:w-0 overflow-hidden'
      }`}
    >
      <div className="w-[360px] h-full flex flex-col">
        {/* Header */}
        <div className="h-[64px] px-4 flex items-center justify-between border-b border-[#EAEAEA] bg-white shrink-0">
          <span className="text-[13px] font-semibold">{selectedThread ? 'Thread' : 'Details'}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#F6F6F7] border border-[#EAEAEA] flex items-center justify-center hover:bg-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* User Profile Card */}
          <div className="p-6 border-b border-[#EAEAEA] bg-white">
            <div className="flex gap-4">
              <div className="relative">
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-[80px] h-[80px] rounded-[16px] object-cover border border-[#EAEAEA]"
                />
                <span
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    profile.status === 'online' ? 'bg-[#10B981]' : 'bg-[#EAEAEA]'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-semibold leading-5">{profile.full_name}</div>
                <div className="text-[13px] text-[#71717A] mt-1">{profile.role}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#F6F6F7] border border-[#EAEAEA] text-[11px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      profile.status === 'online' ? 'bg-[#10B981]' : 'bg-[#71717A]'
                    }`}
                  />
                  {profile.statusText}
                </div>
                <div className="text-[11px] text-[#71717A] mt-2">{profile.localTime} • San Francisco</div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 h-9 rounded-full bg-[#0A0A0A] text-white text-[13px] font-medium hover:bg-black transition-colors">
                Message
              </button>
              <button className="flex-1 h-9 rounded-full bg-white border border-[#EAEAEA] text-[13px] font-medium hover:border-[#0A0A0A] transition-colors">
                Call
              </button>
            </div>
          </div>

          {/* Thread View */}
          {selectedThread && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold tracking-widest uppercase text-[#71717A]">
                  Thread • {threadReplies.length} replies
                </span>
                <button className="text-[11px] text-[#71717A] hover:text-black">Copy link</button>
              </div>

              {/* Parent Message */}
              <div className="p-3 rounded-[12px] bg-[#F6F6F7] border border-[#EAEAEA] mb-3">
                <div className="flex gap-2">
                  <img src={getUser(selectedThread.userId).avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                  <div>
                    <div className="text-[12px] font-medium">
                      {getUser(selectedThread.userId).name}{' '}
                      <span className="font-normal text-[#71717A] ml-1">{selectedThread.time}</span>
                    </div>
                    <div className="text-[13px] leading-[18px] mt-1">{selectedThread.text}</div>
                  </div>
                </div>
              </div>

              {/* Replies List */}
              <div className="space-y-3">
                {threadReplies.map((reply) => {
                  const replyAuthor = getUser(reply.userId);
                  return (
                    <div key={reply.id} className="flex gap-2.5">
                      <img src={replyAuthor.avatar_url} className="w-7 h-7 rounded-full object-cover mt-0.5" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium">{replyAuthor.name}</span>
                          <span className="text-[11px] text-[#71717A]">{reply.time}</span>
                        </div>
                        <div className="text-[13px] leading-[18px] mt-0.5 text-[#0A0A0A]">{reply.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input Box */}
              <div className="mt-4 rounded-[12px] border border-[#EAEAEA] bg-white p-2 focus-within:border-[#0A0A0A] transition-colors">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Reply..."
                  className="w-full min-h-[36px] bg-transparent text-[13px] placeholder:text-[#71717A] focus:outline-none resize-none"
                  rows={1}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSend}
                    disabled={!replyText.trim()}
                    className="h-7 px-3 rounded-full bg-[#0A0A0A] text-white text-[12px] font-medium disabled:opacity-30"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Shared Files Section */}
          <div className="p-4">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[#71717A]">Shared</span>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { name: 'atrium-v2.fig', type: 'FIGMA', img: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200&fit=crop' },
                { name: 'tokens.json', type: 'JSON', img: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200&h=200&fit=crop' },
                { name: 'spec.pdf', type: 'PDF', img: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=200&h=200&fit=crop' },
              ].map((file) => (
                <div
                  key={file.name}
                  className="rounded-[12px] border border-[#EAEAEA] overflow-hidden bg-white group cursor-pointer hover:border-[#0A0A0A] transition-colors"
                >
                  <img src={file.img} alt="" className="w-full h-[64px] object-cover" />
                  <div className="p-2">
                    <div className="text-[11px] font-medium truncate">{file.name}</div>
                    <div className="text-[10px] text-[#71717A]">{file.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Members List (if viewing channel) */}
          {!selectedThread && activeChannel && (
            <div className="p-4">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-[#71717A]">
                Members — {activeChannel.members.length}
              </span>
              <div className="mt-3 space-y-1">
                {activeChannel.members.map((memberId) => {
                  const m = getUser(memberId);
                  return (
                    <div
                      key={memberId}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-[12px] hover:bg-white border border-transparent hover:border-[#EAEAEA] transition-all cursor-pointer"
                    >
                      <img src={m.avatar_url} alt={m.name} className="w-8 h-8 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{m.name}</div>
                        <div className="text-[11px] text-[#71717A] truncate">{m.role}</div>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${m.status === 'online' ? 'bg-[#10B981]' : 'bg-[#EAEAEA]'}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};