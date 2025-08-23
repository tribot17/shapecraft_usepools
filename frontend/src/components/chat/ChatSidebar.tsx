"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/auth/AuthModal";
import ProfileModal from "@/components/auth/ProfileModal";
import { usePathname, useSearchParams } from "next/navigation";

interface Chat {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
}

export default function ChatSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentChatId = searchParams.get("id");
  const [searchQuery, setSearchQuery] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; user_id?: string; wallet_address?: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const [chats, setChats] = useState<Chat[]>([]);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  // Fetch conversation summaries
  useEffect(() => {
    async function load() {
      try {
        const uid = currentUser?.user_id;
        const url = uid ? `${API_BASE}/chat/conversations?user_id=${encodeURIComponent(uid)}` : `${API_BASE}/chat/conversations`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data: Array<{ conversation_id: string; last_message_at: string; preview: string }>= await res.json();
        const mapped: Chat[] = data.map((d) => ({
          id: d.conversation_id,
          title: d.preview?.trim() ? d.preview : `Chat ${d.conversation_id.slice(0, 4)}`,
          preview: d.preview || "",
          timestamp: d.last_message_at ? new Date(d.last_message_at).toLocaleString() : "",
        }));
        setChats(mapped);
      } catch {}
    }
    load();
  }, [currentUser?.user_id]);

  useEffect(() => {
    const s = localStorage.getItem("scoobyUser");
    if (s) setCurrentUser(JSON.parse(s));
  }, []);

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewChat = () => {
    const newId = Math.random().toString(36).slice(2, 8);
    router.push(`/chat?id=${newId}`);
  };

  return (
    <aside className="w-[280px] h-screen fixed left-[80px] top-0 bg-[#141414] border-r border-white/5 z-[10000]">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-white/5">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5">
                <Image
                  src="/icons/scooby.png"
                  alt="Scooby"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white/50">Alpha 0.1</span>
                <span className="text-xl font-semibold text-white">&Scooby</span>
              </div>
            </div>
            <Link 
              href="/"
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
              </svg>
              Home
            </Link>
            <div className="h-px bg-white/5" />
            <span className="text-sm font-medium text-white">All Chats</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full bg-white/5 text-sm rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
            <button
              onClick={handleNewChat}
              className="w-full bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Start New Chat
            </button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto">
          <div className="flex flex-col">
            {filteredChats.map((chat) => (
              <Link
                key={chat.id}
                href={`/chat?id=${chat.id}`}
                className={`block px-4 py-3 transition-colors ${
                  currentChatId === chat.id
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600">
                      <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 001.33 0l1.713-3.293a.783.783 0 01.642-.413 41.102 41.102 0 003.55-.414c1.437-.232 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate font-medium">{chat.title}</p>
                    <p className="text-xs text-white/50 mt-0.5">{chat.preview}</p>
                  </div>
                  <span className="text-[10px] text-white/50 shrink-0">{chat.timestamp}</span>
                </div>
              </Link>
            ))}
            {filteredChats.length === 0 && searchQuery && (
              <div className="px-4 py-3 text-sm text-white/50">
                No chats found
              </div>
            )}
          </div>
        </nav>
        <div className="p-4 border-t border-white/5">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2">
              <div className="text-white/80 text-sm truncate">
                Signed in as <span className="text-white">{currentUser.email}</span>
              </div>
              <button onClick={() => setProfileOpen(true)} className="text-blue-400 text-sm hover:underline">Profile</button>
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="w-full bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Sign up / Log in
            </button>
          )}
        </div>
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onLoggedIn={(u) => setCurrentUser(u)}
        />
        {currentUser && (
          <ProfileModal
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            email={currentUser.email}
            onSaved={(addr) => setCurrentUser((prev) => prev ? { ...prev, wallet_address: addr } : prev)}
          />
        )}
      </div>
    </aside>
  );
}