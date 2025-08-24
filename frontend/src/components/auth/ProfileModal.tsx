"use client";

import { useUserContext } from "@/context/userContext";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ProfileModal({ open, onClose }: Props) {
  // const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  // const [address, setAddress] = useState("");
  // const [loading, setLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);
  // const [info, setInfo] = useState<string | null>(null);
  const { signOut } = useUserContext();
  const { address: connectedAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (!open) return null;

  function handleDisconnect() {
    disconnect();
    signOut();
    onClose();
    window.location.href = "/";
  }

  // async function handleSave(e: React.FormEvent) {
  //   e.preventDefault();
  //   setLoading(true);
  //   setError(null);
  //   setInfo(null);
  //   try {
  //     const res = await fetch(`${API_BASE}/auth/wallet`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ email, address }),
  //     });
  //     if (!res.ok) throw new Error(await res.text());
  //     setInfo("Wallet saved");
  //     if (onSaved) onSaved(address);
  //     const existing = localStorage.getItem("scoobyUser");
  //     if (existing) {
  //       const obj = JSON.parse(existing);
  //       obj.wallet_address = address;
  //       localStorage.setItem("scoobyUser", JSON.stringify(obj));
  //     }
  //   } catch (err: any) {
  //     setError("Failed to save wallet");
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-semibold">Profile</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            ✕
          </button>
        </div>
        {/* <form onSubmit={handleSave} className="space-y-4"> */}
        <div className="space-y-2">
          <label className="block text-white/60 text-xs">Wallet</label>
          <ConnectButton chainStatus="icon" showBalance={false} />
          {isConnected && (
            <p className="text-white/60 text-xs break-all">
              Connected: {connectedAddress}
            </p>
          )}
        </div>

        {/* {error && <p className="text-red-400 text-sm">{error}</p>}
        {info && <p className="text-white/60 text-sm">{info}</p>} */}

        <button
          type="button"
          onClick={() => handleDisconnect()}
          className="w-full bg-white/5 hover:bg-white/10 text-white rounded-lg py-2.5 text-sm"
        >
          Sign Out
        </button>
        {/* </form> */}
      </div>
    </div>
  );
}
