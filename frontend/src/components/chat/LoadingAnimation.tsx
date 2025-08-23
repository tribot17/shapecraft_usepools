"use client";

export default function LoadingAnimation() {
  return (
    <div className="flex items-center gap-1.5 p-1">
      <div className="w-4 h-4 rounded-[4px] bg-blue-700 flex items-center justify-center overflow-hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-2.5 h-2.5 animate-pulse"
        >
          <path d="M10.5 18.75a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" />
          <path fillRule="evenodd" d="M8.625.75A3.375 3.375 0 005.25 4.125v15.75a3.375 3.375 0 003.375 3.375h6.75a3.375 3.375 0 003.375-3.375V4.125A3.375 3.375 0 0015.375.75h-6.75zM7.5 4.125C7.5 3.504 8.004 3 8.625 3H9.75v.375c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125V3h1.125c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-6.75A1.125 1.125 0 017.5 19.875V4.125z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="flex gap-0.5">
        <div className="w-0.5 h-0.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-0.5 h-0.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-0.5 h-0.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
} 