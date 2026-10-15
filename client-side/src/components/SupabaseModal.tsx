import React, { useState } from 'react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlSchema = `
-- Create Profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  full_name text not null,
  avatar_url text not null,
  role text not null,
  status text not null,
  status_text text not null
);

-- Enable Row Level Security
alter table profiles enable row level security;
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[600px] rounded-[24px] bg-white border border-[#EAEAEA] shadow-[0_24px_48px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-[#10B981]/10 text-[#10B981] flex items-center justify-center font-bold">
              S
            </div>
            <div>
              <div className="text-[15px] font-semibold">Supabase Backend Schema</div>
              <div className="text-[12px] text-[#71717A]">Setup tables for Atrium V2 realtime messaging</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F6F6F7] border border-[#EAEAEA] flex items-center justify-center hover:bg-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-[13px] text-[#71717A] leading-relaxed">
            Run this SQL snippet in your Supabase SQL Editor to provision your database schema with Row Level Security (RLS) enabled.
          </p>
          <div className="relative rounded-[16px] bg-[#0A0A0A] text-white p-4 font-mono text-[12px] overflow-x-auto">
            <button
              onClick={handleCopy}
              className="absolute right-3 top-3 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-sans transition-colors"
            >
              {copied ? 'Copied!' : 'Copy SQL'}
            </button>
            <pre>{sqlSchema}</pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#EAEAEA] bg-[#FCFCFD] flex justify-end">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-full bg-[#0A0A0A] text-white text-[13px] font-medium hover:bg-black transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};