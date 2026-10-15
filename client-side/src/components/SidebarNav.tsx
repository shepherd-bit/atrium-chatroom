import React from 'react';

interface SidebarNavProps {
  activeChannel: string;
  onSelectChannel: (id: string) => void;
  onOpenSettings: () => void;
  avatarUrl: string;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeChannel,
  onSelectChannel,
  onOpenSettings,
  avatarUrl,
}) => {
  return (
    <div className="hidden md:flex w-[64px] shrink-0 flex-col items-center py-5 border-r border-[#EAEAEA] bg-[#FFFFFF] justify-between">
      <div className="flex flex-col items-center gap-6">
        <div className="w-8 h-8 rounded-[12px] bg-[#0A0A0A] flex items-center justify-center shadow-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-white" />
        </div>
        <div className="w-8 h-[1px] bg-[#EAEAEA]" />
        <div className="flex flex-col gap-3">
          {['deep-work', 'product', 'design', 'engineering', 'watercooler'].map((id) => (
            <button
              key={id}
              onClick={() => onSelectChannel(id)}
              className={`w-9 h-9 rounded-[12px] flex items-center justify-center text-[13px] font-medium transition-all border ${
                activeChannel === id
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
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-full bg-[#F6F6F7] border border-[#EAEAEA] flex items-center justify-center hover:bg-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 009 15a1.65 1.65 0 00-1-1.51V13a2 2 0 012-2 2 2 0 012 2v.49c.26.15.5.34.71.55z" />
          </svg>
        </button>
        <img src={avatarUrl} className="w-8 h-8 rounded-full border border-[#EAEAEA] object-cover" alt="me" />
      </div>
    </div>
  );
};