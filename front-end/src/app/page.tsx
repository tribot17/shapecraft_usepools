"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Home() {
  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="border-t pt-6">
          <ConnectButton />
        </div>
      </div>
    </div>
  );
}
