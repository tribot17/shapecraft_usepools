import { handleApiError } from "@/lib/utils";

import {
  useGenerateWalletOwnershipProof,
  verifyWalletOwnershipProof,
  type WalletOwnershipProof,
} from "@/lib/web3/signature";
import {
  getEthBalance,
  getGasPrice,
  sendEthTransaction,
  type TransactionOptions,
  type TransactionResult,
} from "@/lib/web3/transactions";
import { useToast } from "@/providers/Toast";
import { useCallback, useState } from "react";
import { useAccount, useBalance, useChainId } from "wagmi";

export function useWeb3() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const { showToast } = useToast();
  const { generateProof } = useGenerateWalletOwnershipProof();
  const [isLoading, setIsLoading] = useState(false);
  const [lastTransaction, setLastTransaction] =
    useState<TransactionResult | null>(null);

  const getBalance = useCallback(
    async (walletAddress?: string) => {
      if (!walletAddress && !address) {
        throw new Error("No wallet address provided");
      }

      try {
        const targetAddress = walletAddress || address!;
        const targetChainId = chainId || 1;
        return await getEthBalance(
          targetAddress as `0x${string}`,
          targetChainId
        );
      } catch (error) {
        showToast(handleApiError(error), "error");
        throw error;
      }
    },
    [address, chainId, showToast]
  );

  const getCurrentGasPrice = useCallback(async () => {
    try {
      const targetChainId = chainId || 1;
      return await getGasPrice(targetChainId);
    } catch (error) {
      showToast(handleApiError(error), "error");
      throw error;
    }
  }, [chainId, showToast]);

  const sendTransaction = useCallback(
    async (to: string, amount: string, options: TransactionOptions = {}) => {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }

      setIsLoading(true);
      try {
        const targetChainId = options.chainId || chainId || 1;
        const result = await sendEthTransaction(to as `0x${string}`, amount, {
          ...options,
          chainId: targetChainId,
        });

        setLastTransaction(result);

        if (result.success) {
          showToast("Transaction envoyée avec succès !", "success");
        } else {
          showToast(result.error || "Transaction échouée", "error");
        }

        return result;
      } catch (error) {
        const errorMessage = handleApiError(error);
        showToast(errorMessage, "error");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, chainId, showToast]
  );

  const generateOwnershipProof = useCallback(
    async (walletAddress?: string) => {
      if (!isConnected) throw new Error("Wallet not connected");

      try {
        const targetAddress = walletAddress || address!;
        return await generateProof(targetAddress);
      } catch (error) {
        showToast(handleApiError(error), "error");
        throw error;
      }
    },
    [isConnected, address, generateProof, showToast]
  );

  const verifyOwnershipProof = useCallback((proof: WalletOwnershipProof) => {
    return verifyWalletOwnershipProof(proof);
  }, []);

  return {
    // État
    address,
    isConnected,
    chainId,
    balance,
    isLoading,
    lastTransaction,

    // Fonctions ETH
    getBalance,
    getCurrentGasPrice,
    sendTransaction,

    // Fonctions de signature
    generateOwnershipProof,
    verifyOwnershipProof,
  };
}
