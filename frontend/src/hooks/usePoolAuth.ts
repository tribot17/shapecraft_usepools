"use client";

import { useWeb3 } from "@/hooks/useWeb3";
import { useState } from "react";

interface PoolUser {
  id: string;
  address: string;
  username: string;
  signature: string;
}

interface PoolAuthResponse {
  success: boolean;
  user?: PoolUser;
  token?: string;
  error?: string;
}

export function usePoolAuth() {
  const { address, isConnected } = useWeb3();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const connectToPool = async (): Promise<PoolAuthResponse> => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const nonceResponse = await fetch("/api/auth/connect_to_pool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_nonce",
        }),
      });

      if (!nonceResponse.ok) {
        throw new Error("Failed to get nonce");
      }

      const authResponse = await fetch("/api/auth/connect_to_pool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "authenticate",
          address,
          signature,
          nonce,
        }),
      });

      const authData = await authResponse.json();

      if (!authResponse.ok) {
        throw new Error(authData.error || "Authentication failed");
      }

      return authData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setAuthError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Fonction helper pour signer un message
  // Vous devrez l'adapter selon votre setup Web3
  const signMessage = async (message: string): Promise<string> => {
    // Si vous utilisez wagmi/viem, vous pouvez utiliser useSignMessage
    // Si vous utilisez ethers directement, voici un exemple :

    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = window.ethereum as EthereumProvider;
        const signature = await provider.request({
          method: "personal_sign",
          params: [message, address!],
        });
        return signature;
      } catch {
        throw new Error("User rejected signature");
      }
    }

    throw new Error("No wallet provider found");
  };

  return {
    connectToPool,
    isAuthenticating,
    authError,
    isConnected,
    address,
  };
}

// Types pour TypeScript - interface étendue pour ethereum
interface EthereumProvider {
  request: (args: { method: string; params: string[] }) => Promise<string>;
}
