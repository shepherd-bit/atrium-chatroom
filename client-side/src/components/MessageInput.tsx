import React, { useRef, useEffect } from 'react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  placeholder,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  return (
    <div className="shrink-0 p-3 md:p-4 bg-white border-t border-[#EAEAEA]">
      <div className="max-w-[760px] mx-auto">
        <div className="rounded-[16px] border border-[#EAEAEA] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-[#0A0A0A] focus-within:shadow-[0_0_0_1px_#0A0A0A] transition-all">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={placeholder}
            className="w-full min-h-[52px] max-h-[160px] p-3.5 pb-1 bg-transparent text-[14px] leading-[20px] placeholder:text-[#71717A] focus:outline-none resize-none"
            rows={1}
          />
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-2">
              <button className="w-7 h-7 rounded-full bg-[#F6F6F7] border border-[#EAEAEA] flex items-center justify-center hover:bg-white hover:border-[#0A0A0A] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.5">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <span className="hidden md:flex items-center gap-1.5 text-[11px] text-[#71717A]">
                <span className="px-1.5 py-0.5 rounded bg-[#F6F6F7] border border-[#EAEAEA] font-medium">/</span> commands
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#71717A] hidden md:block">
                {value.length > 0 ? `${value.length} chars` : 'Shift + Enter for new line'}
              </span>
              <button
                onClick={onSend}
                disabled={!value.trim()}
                className="w-8 h-8 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-[#71717A]">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span>Supabase Realtime • presence enabled • 7 online</span>
        </div>
      </div>
    </div>
  );
};