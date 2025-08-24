"use client";

import AuthModal from "@/components/auth/AuthModal";
import ProfileModal from "@/components/auth/ProfileModal";
import { useConditionalWallet } from "@/hooks/useConditionalWallet";
import { useMyPools } from "@/hooks/useMyPools";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Chat {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
}

export default function ChatSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentChatId = searchParams.get("id");
  const [searchQuery, setSearchQuery] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, requiresWallet } = useConditionalWallet();
  const { hasPools, poolCount } = useMyPools();

  const [chats, setChats] = useState<Chat[]>([]);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  // Fetch conversation summaries
  useEffect(() => {
    async function load() {
      try {
        const uid = user?.id;
        const wallet = user?.walletAddress;

        // Ensure backend user exists for this wallet (idempotent)
        if (wallet) {
          try {
            await fetch(`${API_BASE}/auth/wallet-login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ address: wallet }),
            });
          } catch {}
        }

        // Prefer wallet-based conversations so backend can resolve/create user
        let url = `${API_BASE}/chat/conversations`;
        if (wallet) {
          url = `${API_BASE}/chat/conversations?wallet_address=${encodeURIComponent(
            wallet
          )}`;
        } else if (uid) {
          url = `${API_BASE}/chat/conversations?user_id=${encodeURIComponent(
            uid
          )}`;
        }
        const res = await fetch(url);
        if (!res.ok) return;
        const data: Array<{
          conversation_id: string;
          last_message_at: string;
          preview: string;
        }> = await res.json();
        const mapped: Chat[] = data.map((d) => ({
          id: d.conversation_id,
          title: d.preview?.trim()
            ? d.preview
            : `Chat ${d.conversation_id.slice(0, 4)}`,
          preview: d.preview || "",
          timestamp: d.last_message_at
            ? new Date(d.last_message_at).toLocaleString()
            : "",
        }));
        setChats(mapped);
      } catch {}
    }
    load();

    // Listen for refresh events from the chat page
    const listener = () => load();
    window.addEventListener("chat:refresh-conversations", listener);
    return () => window.removeEventListener("chat:refresh-conversations", listener);
  }, [user?.id, user?.walletAddress, API_BASE]);

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewChat = () => {
    const newId = Math.random().toString(36).slice(2, 8);
    router.push(`/chat?id=${newId}`);
  };

  return (
    <aside className="w-[280px] h-screen fixed top-0 bg-[#141414] border-r border-white/5 z-[10000]">
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
                <span className="text-xs font-medium text-white/50">
                  Alpha 0.1
                </span>
                <span className="text-xl font-semibold text-white">
                  &Scooby
                </span>
              </div>
            </div>
            <Link
              href="/chat"
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
              </svg>
              Home
            </Link>
            <Link
              href="/wallet"
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm0 1.5A8.25 8.25 0 1 0 20.25 12 8.258 8.258 0 0 0 12 3.75Z" />
              </svg>
              Wallets
            </Link>
            {hasPools && (
              <Link
                href="/my-pools"
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M8.25 10.875a2.625 2.625 0 1 1 5.25 0 2.625 2.625 0 0 1-5.25 0Z" />
                  <path
                    fillRule="evenodd"
                    d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.125 4.5a4.125 4.125 0 1 0 2.338 7.524l2.007 2.006a.75.75 0 1 0 1.06-1.06L14.274 13.214a4.125 4.125 0 0 0-3.399-6.464Z"
                    clipRule="evenodd"
                  />
                </svg>
                My Pools
                {poolCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {poolCount}
                  </span>
                )}
              </Link>
            )}
            <Link
              href="/auto-invest"
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M17.004 10.407c.138.435-.216.842-.672.842h-3.465a.75.75 0 0 1-.65-.375l-1.732-3c-.229-.396-.053-.907.393-1.004a5.252 5.252 0 0 1 6.126 3.537ZM8.12 8.464c.307-.338.838-.235 1.066.16l1.732 3a.75.75 0 0 1 0 .75l-1.732 3c-.229.397-.76.5-1.067.161A5.23 5.23 0 0 1 6.75 12a5.23 5.23 0 0 1 1.37-3.536ZM10.878 17.13c-.447-.098-.623-.608-.394-1.004l1.733-3.002a.75.75 0 0 1 .65-.375h3.465c.457 0 .81.407.672.842a5.252 5.252 0 0 1-6.126 3.539Z" />
                <path
                  fillRule="evenodd"
                  d="M21 12.75a.75.75 0 1 0 0-1.5h-.783a8.22 8.22 0 0 0-.237-1.357l.734-.267a.75.75 0 1 0-.513-1.41l-.735.268a8.24 8.24 0 0 0-.689-1.192l.6-.503a.75.75 0 1 0-.964-1.149l-.6.504a8.3 8.3 0 0 0-1.054-.885l.391-.678a.75.75 0 1 0-1.299-.75l-.39.676a8.188 8.188 0 0 0-1.295-.47l.136-.77a.75.75 0 0 0-1.477-.26l-.136.77a8.36 8.36 0 0 0-1.377 0l-.136-.77a.75.75 0 1 0-1.477.26l.136.77c-.448.121-.88.28-1.294.47l-.39-.676a.75.75 0 0 0-1.3.75l.392.678a8.29 8.29 0 0 0-1.054.885l-.6-.504a.75.75 0 1 0-.965 1.149l.6.503a8.243 8.243 0 0 0-.689 1.192L3.8 8.216a.75.75 0 1 0-.513 1.41l.735.267a8.222 8.222 0 0 0-.238 1.356H3a.75.75 0 0 0 0 1.5h.783c.042.464.122.917.238 1.356l-.735.268a.75.75 0 0 0 .513 1.41l.735-.268c.197.417.428.816.69 1.191l-.6.504a.75.75 0 0 0 .963 1.149l.601-.505c.326.323.679.62 1.054.885l-.392.68a.75.75 0 0 0 1.3.75l.39-.679c.414.192.847.35 1.294.471l-.136.77a.75.75 0 0 0 1.477.261l.137-.772a8.332 8.332 0 0 0 1.376 0l.136.772a.75.75 0 1 0 1.477-.26l-.136-.771a8.19 8.19 0 0 0 1.294-.47l.391.677a.75.75 0 0 0 1.3-.75l-.393-.679a8.29 8.29 0 0 0 1.054-.885l.601.504a.75.75 0 0 0 .964-1.15l-.6-.503a8.243 8.243 0 0 0 .69-1.191l.735.267a.75.75 0 1 0 .512-1.41l-.734-.267c.115-.439.195-.892.237-1.356h.784Zm-2.657-3.06a6.744 6.744 0 0 0-1.19-2.053 6.784 6.784 0 0 0-2.053-1.19A6.704 6.704 0 0 0 12 5.25a6.704 6.704 0 0 0-3.1.447 6.784 6.784 0 0 0-2.053 1.19A6.75 6.75 0 0 0 5.25 12v.001c0 1.089.259 2.119.447 3.1a6.785 6.785 0 0 0 1.19 2.053 6.784 6.784 0 0 0 2.053 1.19A6.704 6.704 0 0 0 12 18.75a6.704 6.704 0 0 0 3.1-.447 6.785 6.785 0 0 0 2.053-1.19A6.744 6.744 0 0 0 18.343 15.1c.188-.981.447-2.011.447-3.1s-.259-2.119-.447-3.06Z"
                  clipRule="evenodd"
                />
              </svg>
              🤖 Auto-Invest
            </Link>
            <Link
              href="/test-pool"
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M12 2.25c5.385 0 9.75 4.365 9.75 9.75s4.365 9.75 9.75 9.75-9.75-4.365-9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" />
              </svg>
              🧪 Test Pool
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
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
                  currentChatId === chat.id ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4 text-blue-600"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 001.33 0l1.713-3.293a.783.783 0 01.642-.413 41.102 41.102 0 003.55-.414c1.437-.232 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate font-medium">
                      {chat.title}
                    </p>
                    <p className="text-xs text-white/50 mt-0.5">
                      {chat.preview}
                    </p>
                  </div>
                  <span className="text-[10px] text-white/50 shrink-0">
                    {chat.timestamp}
                  </span>
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
          {user ? (
            <div className="flex items-center justify-between gap-2">
              <div className="text-white/80 text-sm truncate">
                Connected as{" "}
                <span className="text-white">
                  {user.walletAddress.slice(0, 6)}...
                  {user.walletAddress.slice(-4)}
                </span>
              </div>
              <button
                onClick={() => setProfileOpen(true)}
                className="text-blue-400 text-sm hover:underline"
              >
                Profile
              </button>
            </div>
          ) : requiresWallet ? (
            <div className="text-center">
              <p className="text-white/60 text-sm mb-2">
                Wallet is required to use this page
              </p>
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="w-full bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Connect
            </button>
          )}
        </div>
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onLoggedIn={() => {}}
        />
        {user && (
          <ProfileModal
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
          />
        )}
      </div>
    </aside>
  );
}
