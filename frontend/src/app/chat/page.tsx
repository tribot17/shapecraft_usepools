"use client";

import ChatSidebar from "@/components/chat/ChatSidebar";
import { useConditionalWallet } from "@/hooks/useConditionalWallet";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get("id");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [userId, setUserId] = useState<string | null>(null);
  const { user } = useConditionalWallet();

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  const thinkingPhrases = [
    "Scooby is thinking...",
    "Scooby is looking for the bone...",
    "Thinking, wait a few seconds...",
    "Processing your request...",
    "Processing...",
    "Thinking...",
    "Scooby is on it...",
    "Give me ",
  ];

  function detectIntent(input: string): {
    intent: "small_talk" | "opensea_trending" | "opensea_volume";
    params?: Record<string, unknown>;
  } {
    const text = input.toLowerCase();
    if (
      text.includes("trending") ||
      text.includes("24h") ||
      text.includes("24 h") ||
      text.includes("last 24")
    ) {
      return { intent: "opensea_trending", params: { limit: 20 } };
    }
    if (
      text.includes("volume") ||
      text.includes("3m") ||
      text.includes("5 days") ||
      text.includes("five days")
    ) {
      const minVolumeEth = text.includes("3m") ? 3000000 : 1000000;
      const days = text.includes("5") ? 5 : 7;
      return {
        intent: "opensea_volume",
        params: { min_volume_eth: minVolumeEth, days },
      };
    }
    return { intent: "small_talk" };
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("scoobyUser");
      if (raw) {
        const u = JSON.parse(raw);
        if (u && typeof u.user_id === "string") setUserId(u.user_id);
      }
    } catch {}
  }, []);

  // When chatId changes, reset message list (start fresh conversation)
  useEffect(() => {
    setMessages([]);
    setMessage("");
  }, [chatId]);

  async function sendToBackend(userText: string) {
    return sendToBackendWithChatId(userText, chatId);
  }

  async function sendToBackendWithChatId(
    userText: string,
    conversationId: string | null
  ) {
    const { intent, params } = detectIntent(userText);
    // Fetch latest user_id at send-time to cover recent logins
    let uid = userId;
    const walletAddress = user?.walletAddress || null;
    try {
      if (!uid) {
        const raw = localStorage.getItem("scoobyUser");
        if (raw) {
          const u = JSON.parse(raw);
          if (u && typeof u.user_id === "string") uid = u.user_id;
        }
      }
    } catch {}
    // Ensure backend has a user for this wallet (idempotent)
    if (walletAddress) {
      try {
        await fetch(`${API_BASE}/auth/wallet-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: walletAddress }),
        });
      } catch {}
    }
    const body = {
      intent,
      message: userText,
      params,
      conversation_id: conversationId,
      user_id: uid,
      wallet_address: walletAddress || undefined,
    } as const;
    const res = await fetch(`${API_BASE}/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Backend error ${res.status}`);
    }
    return (await res.json()) as { reply: string; data?: unknown };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // If no chatId, create one and send the message immediately
    if (!chatId) {
      const newChatId = Math.random().toString(36).substring(7);
      const userText = message.trim();

      // Add user message immediately
      setMessages([{ role: "user", content: userText }]);
      setMessage("");

      // Add thinking message
      const placeholder =
        thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)];
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: placeholder },
      ]);

      // Navigate to new chat
      router.push(`/chat?id=${newChatId}`);

      // Send message to backend with new chat ID
      try {
        // Temporarily update the global chatId for the backend call
        const resp = await sendToBackendWithChatId(userText, newChatId);
        setMessages((prev) => {
          const copy = [...prev];
          for (let i = copy.length - 1; i >= 0; i--) {
            if (
              copy[i].role === "assistant" &&
              thinkingPhrases.includes(copy[i].content)
            ) {
              copy[i] = { role: "assistant", content: resp.reply };
              break;
            }
          }
          return copy;
        });
      } catch {
        setMessages((prev) => {
          const copy = [...prev];
          for (let i = copy.length - 1; i >= 0; i--) {
            if (
              copy[i].role === "assistant" &&
              thinkingPhrases.includes(copy[i].content)
            ) {
              copy[i] = {
                role: "assistant",
                content: "Sorry, I had trouble fetching that.",
              };
              return copy;
            }
          }
          return [
            ...prev,
            {
              role: "assistant",
              content: "Sorry, I had trouble fetching that.",
            },
          ];
        });
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-[#141414]">
      <ChatSidebar />
      <main className="flex-1 ml-[280px]">
        {!chatId ? (
          <div className="flex flex-col items-center justify-center h-screen max-w-3xl mx-auto px-4">
            <h1 className="text-2xl font-medium text-white mb-8">
              What are you interested in today?
            </h1>
            <form onSubmit={handleSubmit} className="w-full">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e as React.FormEvent);
                      }
                    }}
                    placeholder="Send a message..."
                    className="w-full bg-white/5 text-white rounded-lg pl-4 pr-12 py-4 focus:outline-none focus:ring-1 focus:ring-white/20"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-center text-white/40">
                  Scooby can make mistakes. Consider checking important
                  information.
                </p>
              </div>
            </form>
          </div>
        ) : (
          <div className="h-screen flex flex-col">
            <div className="border-b border-white/5 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center">
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
                <h2 className="text-sm font-medium text-white">New Chat</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`${
                        m.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-white/10 text-white"
                      } px-3 py-2 rounded-lg text-sm max-w-[80%]`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-white/5 p-6">
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-4">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const text = message.trim();
                      if (!text) return;
                      // Add user message
                      setMessages((prev) => [
                        ...prev,
                        { role: "user", content: text },
                      ]);
                      setMessage("");
                      // Add temporary thinking message
                      const placeholder =
                        thinkingPhrases[
                          Math.floor(Math.random() * thinkingPhrases.length)
                        ];
                      setMessages((prev) => [
                        ...prev,
                        { role: "assistant", content: placeholder },
                      ]);
                      try {
                        const resp = await sendToBackend(text);
                        // Replace last assistant placeholder with real reply
                        setMessages((prev) => {
                          const copy = [...prev];
                          for (let i = copy.length - 1; i >= 0; i--) {
                            if (
                              copy[i].role === "assistant" &&
                              thinkingPhrases.includes(copy[i].content)
                            ) {
                              copy[i] = {
                                role: "assistant",
                                content: resp.reply,
                              };
                              break;
                            }
                          }
                          return copy;
                        });
                      } catch {
                        setMessages((prev) => {
                          const copy = [...prev];
                          for (let i = copy.length - 1; i >= 0; i--) {
                            if (
                              copy[i].role === "assistant" &&
                              thinkingPhrases.includes(copy[i].content)
                            ) {
                              copy[i] = {
                                role: "assistant",
                                content: "Sorry, I had trouble fetching that.",
                              };
                              return copy;
                            }
                          }
                          return [
                            ...prev,
                            {
                              role: "assistant",
                              content: "Sorry, I had trouble fetching that.",
                            },
                          ];
                        });
                      }
                    }}
                    className="flex w-full gap-4"
                  >
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          const form = e.currentTarget.closest("form");
                          if (form) {
                            const submitEvent = new Event("submit", {
                              cancelable: true,
                              bubbles: true,
                            });
                            form.dispatchEvent(submitEvent);
                          }
                        }
                      }}
                      placeholder="Type your message..."
                      className="flex-1 bg-white/5 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition-colors"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
