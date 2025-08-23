import {
  formatEther,
  parseEther,
  type Address,
  type TransactionReceipt,
  type TransactionRequest,
} from "viem";
import { getPublicClientForChain, getWalletClientForUser } from "./client";

export interface TransactionOptions {
  chainId?: number;
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

export interface TokenTransferOptions extends TransactionOptions {
  tokenAddress: Address;
  recipient: Address;
  amount: string; // Amount in wei or token units
  decimals?: number;
}

/**
 * Envoie une transaction ETH
 */
export async function sendEthTransaction(
  to: Address,
  amount: string,
  options: TransactionOptions = {}
): Promise<TransactionResult> {
  try {
    const walletClient = await getWalletClientForUser();
    console.log("🚀 ~ sendEthTransaction ~ walletClient:", walletClient);
    const publicClient = getPublicClientForChain(options.chainId || 1);
    console.log("🚀 ~ sendEthTransaction ~ publicClient:", publicClient);

    const account = walletClient.account;
    console.log("🚀 ~ sendEthTransaction ~ account:", account);
    if (!account) {
      throw new Error("No account available");
    }

    const transactionRequest: TransactionRequest = {
      to,
      value: parseEther(amount),
    };

    // Ajouter les options de gas si spécifiées
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

    // Attendre la confirmation
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

/**
 * Estime le gas pour une transaction
 */
export async function estimateGas(
  transactionRequest: TransactionRequest,
  chainId: number = 1
): Promise<bigint> {
  const publicClient = getPublicClientForChain(chainId);
  return await publicClient.estimateGas(transactionRequest);
}

export async function getEthBalance(
  address: Address,
  chainId: number = 1
): Promise<string> {
  const publicClient = getPublicClientForChain(chainId);
  const balance = await publicClient.getBalance({ address });
  return formatEther(balance);
}

/**
 * Obtient le prix du gas actuel
 */
export async function getGasPrice(chainId: number = 1): Promise<bigint> {
  const publicClient = getPublicClientForChain(chainId);
  return await publicClient.getGasPrice();
}

/**
 * Obtient les informations de base d'une transaction
 */
export async function getTransactionInfo(
  hash: `0x${string}`,
  chainId: number = 1
): Promise<TransactionReceipt | null> {
  try {
    const publicClient = getPublicClientForChain(chainId);
    return await publicClient.getTransactionReceipt({ hash });
  } catch (error) {
    console.error("Failed to get transaction info:", error);
    return null;
  }
}

/**
 * Vérifie si une transaction est confirmée
 */
export async function isTransactionConfirmed(
  hash: `0x${string}`,
  chainId: number = 1
): Promise<boolean> {
  const receipt = await getTransactionInfo(hash, chainId);
  return receipt?.status === "success";
}

/**
 * Obtient le nombre de confirmations d'une transaction
 */
export async function getTransactionConfirmations(
  hash: `0x${string}`,
  chainId: number = 1
): Promise<number> {
  try {
    const publicClient = getPublicClientForChain(chainId);
    const receipt = await publicClient.getTransactionReceipt({ hash });
    const currentBlock = await publicClient.getBlockNumber();

    if (receipt && receipt.blockNumber) {
      return Number(currentBlock - receipt.blockNumber);
    }

    return 0;
  } catch (error) {
    console.error("Failed to get transaction confirmations:", error);
    return 0;
  }
}
