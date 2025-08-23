import { handleApiError } from "@/lib/utils";
import {
  getWalletClientForChain,
  getWalletClientForUser,
} from "@/lib/web3/client";
import { useToast } from "@/providers/Toast";
import { useCallback } from "react";
import { useWalletClient } from "wagmi";

export function useSigner() {
  const { data: walletClient, isLoading } = useWalletClient();
  const { showToast } = useToast();

  // Récupérer le signer actuel (wallet client)
  const getSigner = useCallback(() => {
    if (!walletClient) {
      throw new Error("Wallet not connected");
    }
    return walletClient;
  }, [walletClient]);

  // Récupérer le signer pour l'utilisateur connecté
  const getSignerForUser = useCallback(async () => {
    try {
      return await getWalletClientForUser();
    } catch (error) {
      showToast(handleApiError(error), "error");
      throw error;
    }
  }, [showToast]);

  // Récupérer le signer pour une chaîne spécifique
  const getSignerForChain = useCallback(
    async (chainId: number) => {
      try {
        return await getWalletClientForChain(chainId);
      } catch (error) {
        showToast(handleApiError(error), "error");
        throw error;
      }
    },
    [showToast]
  );

  // Signer un message
  const signMessage = useCallback(
    async (message: string) => {
      if (!walletClient) {
        throw new Error("Wallet not connected");
      }

      try {
        const signature = await walletClient.signMessage({
          message,
        });
        return signature;
      } catch (error) {
        showToast(handleApiError(error), "error");
        throw error;
      }
    },
    [walletClient, showToast]
  );

  // Signer des données typées (EIP-712)
  const signTypedData = useCallback(
    async (domain: any, types: any, value: any) => {
      if (!walletClient) {
        throw new Error("Wallet not connected");
      }

      try {
        const signature = await walletClient.signTypedData({
          domain,
          types,
          primaryType: Object.keys(types)[0],
          message: value,
        });
        return signature;
      } catch (error) {
        showToast(handleApiError(error), "error");
        throw error;
      }
    },
    [walletClient, showToast]
  );

  return {
    // État
    walletClient,
    isLoading,
    isConnected: !!walletClient,

    // Fonctions pour récupérer le signer
    getSigner,
    getSignerForUser,
    getSignerForChain,

    // Fonctions de signature
    signMessage,
    signTypedData,
  };
}
