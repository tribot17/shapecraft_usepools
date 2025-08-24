import { config } from "@/lib/wagmi";
import { getPublicClientForChain } from "@/lib/web3/config";
import { useGenerateWalletOwnershipProof } from "@/lib/web3/signature";
import { getEthBalance } from "@/lib/web3/transaction";
import { useCallback } from "react";
import {
  parseEther,
  TransactionReceipt,
  type Address,
  type TransactionRequest,
} from "viem";
import { useAccount, useChainId } from "wagmi";
import { getAccount, getWalletClient } from "wagmi/actions";

export interface TransactionOptions {
  chainId?: string;
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

export interface TransactionResult {
  hash: string;
  receipt?: TransactionReceipt;
  success: boolean;
  error?: string;
}

export function useWeb3() {
  const { address, isConnected } = useAccount();
  const { generateProof } = useGenerateWalletOwnershipProof();
  const chainId = useChainId();

  const getBalance = useCallback(
    async (walletAddress?: string, chainId?: number) => {
      if (!walletAddress && !address) {
        throw new Error("No wallet address provided");
      }

      try {
        const targetAddress = walletAddress || address!;
        const targetChainId = chainId || 11011;
        return await getEthBalance(
          targetAddress as `0x${string}`,
          targetChainId
        );
      } catch (error) {
        throw error;
      }
    },
    [address]
  );

  const generateOwnershipProof = useCallback(
    async (walletAddress?: string) => {
      if (!isConnected) throw new Error("Wallet not connected");

      try {
        const targetAddress = walletAddress || address!;
        return await generateProof(targetAddress);
      } catch (error) {
        throw error;
      }
    },
    [isConnected, address, generateProof]
  );

  async function sendEthTransaction(
    to: Address,
    amount: string,
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    try {
      const account = getAccount(config);
      const walletClient = await getWalletClient(config);

      const publicClient = getPublicClientForChain(
        Number(options.chainId) || 11011
      );

      if (!account) {
        throw new Error("No account available");
      }

      const transactionRequest: TransactionRequest = {
        to,
        value: parseEther(amount),
      };

      if (options.gasLimit) {
        transactionRequest.gas = options.gasLimit;
      }
      if (options.maxFeePerGas) {
        transactionRequest.maxFeePerGas = options.maxFeePerGas;
      }
      if (options.maxPriorityFeePerGas) {
        transactionRequest.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
      }

      const hash = await walletClient.sendTransaction(transactionRequest);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      return {
        hash,
        receipt,
        success: receipt.status === "success",
      };
    } catch (error) {
      return {
        hash: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  return {
    address,
    chainId,
    isConnected,
    generateOwnershipProof,
    getBalance,
    sendEthTransaction,
  };
}
