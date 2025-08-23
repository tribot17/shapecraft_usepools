import { useToast } from "@/providers/Toast";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useWeb3 } from "./useWeb3";

export function useWalletAuth() {
  const { address, isConnected, generateOwnershipProof } = useWeb3();
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkWalletAuth = async () => {
      if (isConnected && address && status === "unauthenticated") {
      }
    };

    checkWalletAuth();
  }, [isConnected, address, status]);

  const authenticateWallet = useCallback(async () => {
    if (!isConnected || !address) {
      showToast("Please connect your wallet first", "error");
      return false;
    }

    setIsLoading(true);

    try {
      const proof = await generateOwnershipProof(address);

      const response = await signIn("wallet", {
        address: proof.walletAddress,
        signature: proof.signature,
        message: proof.message,
        nonce: proof.nonce,
        timestamp: proof.timestamp,
        redirect: false,
      });

      if (response?.ok) {
        showToast("Successfully authenticated!", "success");
        return true;
      } else {
        showToast("Authentication failed", "error");
        return false;
      }
    } catch (error) {
      console.error("Authentication error:", error);
      showToast("Authentication failed", "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, generateOwnershipProof, showToast]);

  const checkWalletAuth = useCallback(async () => {
    // Vérifier si l'utilisateur est déjà authentifié
    return status === "authenticated";
  }, [status]);

  return {
    isAuthenticated: status === "authenticated",
    isLoading,
    authenticateWallet,
    checkWalletAuth,
    session,
    isConnected,
    status,
  };
}
