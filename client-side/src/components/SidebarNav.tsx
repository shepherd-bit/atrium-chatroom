import React from 'react';
import type { Channel } from '../types';

interface SidebarNavProps {
  /** The channels the signed-in user can see — the nav jumps between them. */
  channels: Channel[];
  activeChannel: string;
  onSelectChannel: (id: string) => void;
  avatarUrl: string;
  onLogout: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  channels,
  activeChannel,
  onSelectChannel,
  avatarUrl,
  onLogout,
}) => {
  return (
    <div className="hidden md:flex w-[64px] shrink-0 flex-col items-center py-5 border-r border-[#EAEAEA] bg-[#FFFFFF] justify-between">
      <div className="flex flex-col items-center gap-6">
        <div className="w-8 h-8 rounded-[12px] bg-[#0A0A0A] flex items-center justify-center shadow-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-white" />
        </div>
        <div className="w-8 h-[1px] bg-[#EAEAEA]" />
        <div className="flex flex-col gap-3">
          {channels.slice(0, 5).map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              title={`#${channel.name}`}
              className={`w-9 h-9 rounded-[12px] flex items-center justify-center text-[13px] font-medium transition-all border ${
                activeChannel === channel.id
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] shadow-sm'
                  : 'bg-[#F6F6F7] text-[#71717A] border-[#EAEAEA] hover:bg-white hover:text-[#0A0A0A] hover:border-[#0A0A0A]'
              }`}
            >
              #
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-5">
        <button
          onClick={onLogout}
          title="Sign out"
          className="w-8 h-8 rounded-full bg-[#F6F6F7] border border-[#EAEAEA] flex items-center justify-center hover:bg-white hover:border-[#0A0A0A] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
        <img src={avatarUrl} className="w-8 h-8 rounded-full border border-[#EAEAEA] object-cover" alt="me" />
      </div>
    </div>
  );
};