import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export interface WalletWithBalance {
  id: string;
  walletId: string;
  address: string;
  name?: string;
  balance: string;
  balanceETH: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWalletData {
  userId: string;
  name?: string;
}

export interface SendTransactionData {
  walletId: string;
  to: string;
  value: string;
  gasLimit?: string;
  gasPrice?: string;
  data?: string;
}

export interface TransactionResult {
  hash: string;
  blockNumber?: number;
  gasUsed?: string;
  status: "pending" | "confirmed" | "failed";
}

/**
 * Hook pour gérer les wallets utilisateur
 */
export function useWallets(userId?: string) {
  const queryClient = useQueryClient();

  // Récupérer les wallets de l'utilisateur
  const {
    data: wallets,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["wallets", userId],
    queryFn: async (): Promise<WalletWithBalance[]> => {
      if (!userId) return [];
      
      const response = await fetch(`/api/wallets?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch wallets");
      }
      const data = await response.json();
      return data.wallets;
    },
    enabled: !!userId,
  });

  // Créer un nouveau wallet
  const createWalletMutation = useMutation({
    mutationFn: async (data: CreateWalletData) => {
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create wallet");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalider la cache pour refetch les wallets
      queryClient.invalidateQueries({ queryKey: ["wallets", userId] });
    },
  });

  // Envoyer une transaction
  const sendTransactionMutation = useMutation({
    mutationFn: async (data: SendTransactionData): Promise<TransactionResult> => {
      const response = await fetch(`/api/wallets/${data.walletId}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: data.to,
          value: data.value,
          gasLimit: data.gasLimit,
          gasPrice: data.gasPrice,
          data: data.data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send transaction");
      }

      const result = await response.json();
      return result.transaction;
    },
    onSuccess: () => {
      // Refetch les wallets pour mettre à jour les balances
      queryClient.invalidateQueries({ queryKey: ["wallets", userId] });
    },
  });

  // Estimer le gas
  const estimateGas = async (data: Omit<SendTransactionData, "gasLimit" | "gasPrice">) => {
    const params = new URLSearchParams({
      to: data.to,
      value: data.value,
      ...(data.data && { data: data.data }),
    });

    const response = await fetch(
      `/api/wallets/${data.walletId}/transactions/estimate?${params}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to estimate gas");
    }

    const result = await response.json();
    return result.estimate;
  };

  // Signer un message
  const signMessage = async (walletId: string, message: string) => {
    const response = await fetch(`/api/wallets/${walletId}/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to sign message");
    }

    const result = await response.json();
    return result.signature;
  };

  return {
    // Data
    wallets: wallets || [],
    
    // Loading states
    isLoading,
    isCreatingWallet: createWalletMutation.isPending,
    isSendingTransaction: sendTransactionMutation.isPending,
    
    // Errors
    error,
    createWalletError: createWalletMutation.error,
    sendTransactionError: sendTransactionMutation.error,
    
    // Actions
    createWallet: createWalletMutation.mutate,
    sendTransaction: sendTransactionMutation.mutate,
    estimateGas,
    signMessage,
    refetchWallets: refetch,
    
    // Success states
    createWalletSuccess: createWalletMutation.isSuccess,
    sendTransactionSuccess: sendTransactionMutation.isSuccess,
  };
}

/**
 * Hook pour un wallet spécifique
 */
export function useWallet(walletId?: string, userId?: string) {
  const { wallets, ...rest } = useWallets(userId);
  
  const wallet = wallets.find(w => w.walletId === walletId);
  
  return {
    wallet,
    ...rest,
  };
}
