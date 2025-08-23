"use client";

import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { useWeb3 } from "@/lib/hooks/useWeb3";
import { formatAddress } from "@/lib/utils";
import { signOut } from "next-auth/react";

export function WalletAuth() {
  const { isAuthenticated, isLoading, authenticateWallet, session } =
    useWalletAuth();
  const { address, isConnected } = useWeb3();

  const handleSignOut = () => {
    signOut();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Authenticating...</span>
      </div>
    );
  }

  if (isAuthenticated && session?.user) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Authenticated User</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Wallet Address:</p>
            <p className="font-mono text-sm">
              {formatAddress(session.user.walletAddress)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">User ID:</p>
            <p className="font-mono text-sm">{session.user.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Name:</p>
            <p className="text-sm">{session.user.name}</p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Wallet Authentication</h3>
      <div className="space-y-4">
        {!isConnected ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Please connect your wallet first to authenticate.
            </p>
            <div className="text-sm text-gray-500">
              Current status:{" "}
              <span className="text-red-500">Not Connected</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Connected Wallet:</p>
              <p className="font-mono text-sm">{formatAddress(address!)}</p>
            </div>
            <p className="text-gray-600">
              Sign a message to authenticate your wallet.
            </p>
            <button
              onClick={authenticateWallet}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Authenticating..." : "Sign Message to Authenticate"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
