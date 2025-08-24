"use client";

import { useUserContext } from "@/context/userContext";
import { useWeb3 } from "@/hooks/useWeb3";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onLoggedIn: (user: {
    email?: string;
    user_id?: string;
    walletAddress?: string;
  }) => void;
};

export default function AuthModal({ open, onClose, onLoggedIn }: Props) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const [mode, setMode] = useState<"wallet" | "legacy" | "signup" | "verify">(
    "wallet"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Wallet authentication hooks
  const { address, isConnected } = useWeb3();
  const { signIn, isLoading, user } = useUserContext();

  useEffect(() => {
    if (!open) {
      setMode("wallet");
      setEmail("");
      setPassword("");
      setCode("");
      setError(null);
      setInfo(null);
    }
  }, [open]);

  // Handle wallet authentication success
  useEffect(() => {
    if (user && open) {
      onLoggedIn({
        walletAddress: user.walletAddress,
        user_id: user.id,
      });
      onClose();
    }
  }, [user, open, onLoggedIn, onClose]);

  if (!open) return null;

  async function handleWalletSignIn() {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await signIn();
      if (!success) {
        setError("Failed to authenticate with wallet");
      }
    } catch {
      setError("Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      await res.json();
      setInfo("Verification code sent to your email.");
      setMode("verify");
    } catch {
      setError("Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) throw new Error(await res.text());
      setInfo("Email verified. You can log in now.");
      setMode("legacy");
    } catch {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
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
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  const getTitle = () => {
    switch (mode) {
      case "wallet":
        return "Connect Wallet";
      case "legacy":
        return "Log in";
      case "signup":
        return "Sign up";
      case "verify":
        return "Verify email";
      default:
        return "Connect Wallet";
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl relative z-[10000]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-semibold">{getTitle()}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            ✕
          </button>
        </div>

        {mode === "wallet" && (
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <p className="text-white/60 text-sm">
                Connect your wallet to access your account
              </p>

              <div className="flex justify-center">
                <ConnectButton />
              </div>

              {isConnected && (
                <div className="space-y-3">
                  <p className="text-white/80 text-sm">
                    Wallet connected: {address?.slice(0, 6)}...
                    {address?.slice(-4)}
                  </p>
                  <button
                    onClick={handleWalletSignIn}
                    disabled={loading || isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
                  >
                    {loading || isLoading
                      ? "Authenticating..."
                      : "Sign In with Wallet"}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
            {info && (
              <p className="text-white/60 text-sm text-center">{info}</p>
            )}
          </div>
        )}

        {mode === "legacy" && (
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
            <button
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium"
            >
              {loading ? "Loading..." : "Log in"}
            </button>
            <div className="text-center space-y-2">
              <p className="text-white/50 text-sm">
                No account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-blue-400 hover:underline"
                >
                  Sign up
                </button>
              </p>
              <p className="text-white/50 text-sm">
                <button
                  type="button"
                  onClick={() => setMode("wallet")}
                  className="text-blue-400 hover:underline"
                >
                  Back to wallet login
                </button>
              </p>
            </div>
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
            <button
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium"
            >
              {loading ? "Loading..." : "Send code"}
            </button>
            <div className="text-center space-y-2">
              <p className="text-white/50 text-sm">
                Have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("legacy")}
                  className="text-blue-400 hover:underline"
                >
                  Log in
                </button>
              </p>
              <p className="text-white/50 text-sm">
                <button
                  type="button"
                  onClick={() => setMode("wallet")}
                  className="text-blue-400 hover:underline"
                >
                  Back to wallet login
                </button>
              </p>
            </div>
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
            <button
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium"
            >
              {loading ? "Loading..." : "Verify"}
            </button>
            <div className="text-center">
              <p className="text-white/50 text-sm">
                <button
                  type="button"
                  onClick={() => setMode("wallet")}
                  className="text-blue-400 hover:underline"
                >
                  Back to wallet login
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
