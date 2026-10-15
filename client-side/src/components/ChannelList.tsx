import React from 'react';
import type { User, Channel } from '../types';

interface ChannelListProps {
  users: User[];
  channels: Channel[];
  activeChannel: string;
  activeDM: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectChannel: (id: string) => void;
  onSelectDM: (userId: string) => void;
  onOpenSettings: () => void;
  onOpenModal: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  currentUser: User;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  users,
  channels,
  activeChannel,
  activeDM,
  searchQuery,
  onSearchChange,
  onSelectChannel,
  onSelectDM,
  onOpenSettings,
  onOpenModal,
  isMobileOpen,
  onCloseMobile,
  currentUser,
}) => {
  const onlineUsers = users.filter((u) => u.status === 'online');
  const filteredChannels = channels.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers = users.filter(
    (u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`fixed inset-0 z-40 md:static md:z-auto ${
        isMobileOpen ? 'flex' : 'hidden md:flex'
      } w-full md:w-[320px] shrink-0 bg-white md:bg-[#FCFCFD] border-r border-[#EAEAEA] flex-col`}
    >
      {/* Search Header */}
      <div className="h-[64px] px-4 flex items-center gap-2 border-b border-[#EAEAEA] bg-white md:bg-[#FCFCFD]">
        <button
          className="md:hidden w-8 h-8 rounded-full border border-[#EAEAEA] flex items-center justify-center"
          onClick={onCloseMobile}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="6" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search people, channels..."
            className="w-full h-9 pl-9 pr-3 rounded-full bg-white border border-[#EAEAEA] text-[13px] placeholder:text-[#71717A] focus:outline-none focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] transition-all"
          />
        </div>
        <button
          onClick={onOpenModal}
          className="w-9 h-9 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center hover:border-[#0A0A0A] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.5">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      </div>

      {/* Sidebar Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Online Status Header */}
        <div className="px-4 py-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[#71717A]">
              Online — {onlineUsers.length}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {onlineUsers.map((u) => (
              <button key={u.id} onClick={() => onSelectDM(u.id)} className="relative shrink-0 group">
                <img
                  src={u.avatar_url}
                  alt={u.name}
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-[#EAEAEA] group-hover:ring-[#0A0A0A] transition-all"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white" />
              </button>
            ))}
          </div>
        </div>

        <div className="h-[1px] bg-[#EAEAEA] mx-4" />

        {/* Channels Section */}
        <div className="px-3 py-4">
          <div className="px-2 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[#71717A]">Channels</span>
            <button className="text-[#71717A] hover:text-black">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          <div className="space-y-0.5">
            {filteredChannels.map((c) => {
              const isSelected = activeChannel === c.id && !activeDM;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectChannel(c.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-[12px] transition-all ${
                    isSelected ? 'bg-[#0A0A0A] text-white' : 'hover:bg-[#F6F6F7] text-[#0A0A0A]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[13px] ${isSelected ? 'text-white/70' : 'text-[#71717A]'}`}>#</span>
                    <span className="text-[13px] font-medium">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] ${isSelected ? 'text-white/60' : 'text-[#71717A]'}`}>{c.members.length}</span>
                    {c.unread && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#0A0A0A]'}`} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-[1px] bg-[#EAEAEA] mx-4" />

        {/* Direct Messages Section */}
        <div className="px-3 py-4">
          <div className="px-2 mb-2">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[#71717A]">Direct messages</span>
          </div>
          <div className="space-y-0.5">
            {filteredUsers.map((u) => {
              const isSelected = activeDM === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    onSelectDM(u.id);
                    onCloseMobile();
                  }}
                  className={`w-full text-left px-2.5 py-2.5 rounded-[12px] flex gap-2.5 transition-all ${
                    isSelected ? 'bg-[#0A0A0A] text-white' : 'hover:bg-[#F6F6F7]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img src={u.avatar_url} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                        isSelected ? 'border-[#0A0A0A]' : 'border-white'
                      } ${u.status === 'online' ? 'bg-[#10B981]' : 'bg-[#EAEAEA]'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[13px] font-medium truncate ${isSelected ? 'text-white' : 'text-[#0A0A0A]'}`}>
                        {u.name}
                      </span>
                      <span className={`text-[11px] shrink-0 ${isSelected ? 'text-white/60' : 'text-[#71717A]'}`}>{u.time}</span>
                    </div>
                    <div className={`text-[12px] leading-[16px] truncate mt-0.5 ${isSelected ? 'text-white/70' : 'text-[#71717A]'}`}>
                      {u.statusText}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Footer Bar */}
      <div className="h-[64px] border-t border-[#EAEAEA] px-3 flex items-center gap-2.5 bg-white">
        <img src={currentUser.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="me" />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium leading-4">{currentUser.full_name}</div>
          <div className="text-[11px] text-[#71717A] leading-3 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Active now
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="w-7 h-7 rounded-full bg-[#F6F6F7] border border-[#EAEAEA] flex items-center justify-center hover:bg-white"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>
    </div>
  );
};