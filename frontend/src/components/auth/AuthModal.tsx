"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onLoggedIn: (user: { email: string; user_id?: string }) => void;
};

export default function AuthModal({ open, onClose, onLoggedIn }: Props) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const [mode, setMode] = useState<"login" | "signup" | "verify">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMode("login");
      setEmail("");
      setPassword("");
      setCode("");
      setError(null);
      setInfo(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setInfo("Verification code sent to your email.");
      setMode("verify");
    } catch (err: any) {
      setError("Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) throw new Error(await res.text());
      setInfo("Email verified. You can log in now.");
      setMode("login");
    } catch (err: any) {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const user = { email, user_id: data.user_id };
      localStorage.setItem("scoobyUser", JSON.stringify(user));
      onLoggedIn(user);
      onClose();
    } catch (err: any) {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl relative z-[10000]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-semibold">
            {mode === "login" ? "Log in" : mode === "signup" ? "Sign up" : "Verify email"}
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
        </div>

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-[#1d1d1d] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/10"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-[#1d1d1d] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/10"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {info && <p className="text-white/60 text-sm">{info}</p>}
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium">
              {loading ? "Loading..." : "Log in"}
            </button>
            <p className="text-white/50 text-sm text-center">No account? <button type="button" onClick={() => setMode("signup")} className="text-blue-400 hover:underline">Sign up</button></p>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSignup} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-[#1d1d1d] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/10"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-[#1d1d1d] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/10"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {info && <p className="text-white/60 text-sm">{info}</p>}
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium">
              {loading ? "Loading..." : "Send code"}
            </button>
            <p className="text-white/50 text-sm text-center">Have an account? <button type="button" onClick={() => setMode("login")} className="text-blue-400 hover:underline">Log in</button></p>
          </form>
        )}

        {mode === "verify" && (
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Verification code"
              className="w-full bg-[#1d1d1d] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/10"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {info && <p className="text-white/60 text-sm">{info}</p>}
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium">
              {loading ? "Loading..." : "Verify"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


