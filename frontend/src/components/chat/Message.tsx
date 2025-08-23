"use client";

import { ReactNode } from "react";

interface MessageProps {
  isUser?: boolean;
  children: ReactNode;
}

export default function Message({ isUser = false, children }: MessageProps) {
  return (
    <div className={`flex items-start gap-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-4 h-4 rounded-[4px] ${isUser ? 'bg-blue-600' : 'bg-blue-700'} flex items-center justify-center overflow-hidden shrink-0`}>
        {isUser ? (
          <span className="text-[8px] font-medium">You</span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-2.5 h-2.5"
          >
            <path d="M10.5 18.75a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" />
            <path fillRule="evenodd" d="M8.625.75A3.375 3.375 0 005.25 4.125v15.75a3.375 3.375 0 003.375 3.375h6.75a3.375 3.375 0 003.375-3.375V4.125A3.375 3.375 0 0015.375.75h-6.75zM7.5 4.125C7.5 3.504 8.004 3 8.625 3H9.75v.375c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125V3h1.125c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-6.75A1.125 1.125 0 017.5 19.875V4.125z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <div 
        className={`flex-1 ${
          isUser ? 'bg-blue-600/10' : 'bg-white/5'
        } rounded-[4px] py-1.5 px-2 max-w-[80%] backdrop-blur-sm shadow-sm`}
      >
        <div className="prose prose-invert max-w-none text-[11px] leading-[16px] [&>p]:my-0 [&>ul]:my-1 [&>ul]:pl-3">
          {children}
        </div>
      </div>
    </div>
  );
} 