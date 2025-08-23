import { ethers } from "ethers";
import {
  getAllWalletBalances,
  getWalletBalance as getWalletBalanceFromDB,
  updateWalletBalance,
} from "models/WalletBalance";
import {
  createManagedWallet as createWalletInDB,
  deleteManagedWalletByWalletId,
  getManagedWalletByWalletId,
  getManagedWallets as getWalletsFromDB,
} from "models/Wallets";
import { decryptPrivateKey, encryptPrivateKey } from "../crypto/encryption";
import { getProvider } from "../web3/config";

export interface CreateWalletParams {
  userId: string;
  name?: string;
}

export interface WalletBalance {
  chainId: number;
  balance: string;
  balanceETH: string;
  lastSyncedAt: Date;
}

export interface WalletWithBalance {
  id: string;
  walletId: string;
  address: string;
  name?: string;
  balances: WalletBalance[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendTransactionParams {
  walletId: string;
  to: string;
  value: string;
  chainId?: number;
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

export async function createManagedWallet({
  userId,
  name,
}: CreateWalletParams) {
  try {
    const wallet = ethers.Wallet.createRandom();

    const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey);

    const managedWallet = await createWalletInDB({
      walletId: wallet.address,
      address: wallet.address,
      encryptedPrivateKey,
      name: name || `Wallet ${wallet.address.slice(0, 8)}...`,
      userId,
    });

    return {
      id: managedWallet.id,
      walletId: managedWallet.walletId,
      address: managedWallet.address,
      name: managedWallet.name,
    };
  } catch (error) {
    console.error("Error creating managed wallet:", error);
    throw new Error("Failed to create wallet");
  }
}

async function getWalletWithPrivateKey(
  walletId: string
): Promise<ethers.Wallet> {
  const managedWallet = await getManagedWalletByWalletId(walletId);

  if (!managedWallet) {
    throw new Error("Wallet not found");
  }

  const privateKey = decryptPrivateKey(managedWallet.encryptedPrivateKey);

  return new ethers.Wallet(privateKey);
}

export async function getWalletBalance(
  walletId: string,
  chainId: number = 360
): Promise<{ balance: string; balanceETH: string }> {
  try {
    // D'abord, chercher en base de données
    const cachedBalance = await getWalletBalanceFromDB(walletId, chainId);

    // Si la balance est en cache et récente (moins de 1 minute), l'utiliser
    const oneMinuteAgo = new Date(Date.now() - 60000);
    if (cachedBalance && cachedBalance.lastSyncedAt > oneMinuteAgo) {
      return {
        balance: cachedBalance.balance,
        balanceETH: cachedBalance.balanceETH,
      };
    }

    // Sinon, récupérer depuis la blockchain
    const provider = getProvider(chainId);
    const balance = await provider.getBalance(walletId);
    const balanceETH = ethers.formatEther(balance);

    // Mettre à jour en base
    await updateWalletBalance(walletId, chainId, {
      balance: balance.toString(),
      balanceETH,
      lastSyncedAt: new Date(),
    });

    return {
      balance: balance.toString(),
      balanceETH,
    };
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    throw new Error("Failed to get wallet balance");
  }
}

export async function getAllWalletBalancesForWallet(
  walletId: string
): Promise<WalletBalance[]> {
  try {
    const balances = await getAllWalletBalances(walletId);

    // Si pas de balances en cache, récupérer pour les chaînes principales
    if (balances.length === 0) {
      const mainChains = [360, 11011]; // Shape mainnet et testnet
      const newBalances = [];

      for (const chainId of mainChains) {
        try {
          const { balance, balanceETH } = await getWalletBalance(
            walletId,
            chainId
          );
          newBalances.push({
            chainId,
            balance,
            balanceETH,
            lastSyncedAt: new Date(),
          });
        } catch (error) {
          console.error(`Error getting balance for chain ${chainId}:`, error);
        }
      }

      return newBalances;
    }

    return balances.map((b) => ({
      chainId: b.chainId,
      balance: b.balance,
      balanceETH: b.balanceETH,
      lastSyncedAt: b.lastSyncedAt,
    }));
  } catch (error) {
    console.error("Error getting all wallet balances:", error);
    throw new Error("Failed to get wallet balances");
  }
}

export async function getUserWallets(
  userId: string
): Promise<WalletWithBalance[]> {
  try {
    const wallets = await getWalletsFromDB(userId);

    const walletsWithBalance = await Promise.all(
      wallets.map(async (wallet) => {
        try {
          const balances = await getAllWalletBalancesForWallet(wallet.walletId);

          return {
            id: wallet.id,
            walletId: wallet.walletId,
            address: wallet.address,
            name: wallet.name ?? undefined,
            balances,
            isActive: wallet.isActive,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
          };
        } catch (error) {
          console.error(
            `Error getting balances for wallet ${wallet.walletId}:`,
            error
          );
          return {
            id: wallet.id,
            walletId: wallet.walletId,
            address: wallet.address,
            name: wallet.name ?? undefined,
            balances: [],
            isActive: wallet.isActive,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
          };
        }
      })
    );

    return walletsWithBalance;
  } catch (error) {
    console.error("Error getting user wallets:", error);
    throw new Error("Failed to get user wallets");
  }
}

export async function sendTransaction({
  walletId,
  to,
  value,
  chainId = 360,
  gasLimit,
  gasPrice,
  data = "0x",
}: SendTransactionParams): Promise<TransactionResult> {
  try {
    const wallet = await getWalletWithPrivateKey(walletId);

    const provider = getProvider(chainId);
    const connectedWallet = wallet.connect(provider);

    const valueWei = ethers.parseEther(value);

    const txRequest: ethers.TransactionRequest = {
      to,
      value: valueWei,
      data,
    };

    if (gasLimit) {
      txRequest.gasLimit = gasLimit;
    }
    if (gasPrice) {
      txRequest.gasPrice = ethers.parseUnits(gasPrice, "gwei");
    }

    const tx = await connectedWallet.sendTransaction(txRequest);

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();

    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
      status: receipt?.status === 1 ? "confirmed" : "failed",
    };
  } catch (error) {
    console.error("Error sending transaction:", error);
    throw new Error("Failed to send transaction");
  }
}

/**
 * Signer un message avec un wallet géré
 */
export async function signMessage(
  walletId: string,
  message: string
): Promise<string> {
  try {
    const wallet = await getWalletWithPrivateKey(walletId);
    return await wallet.signMessage(message);
  } catch (error) {
    console.error("Error signing message:", error);
    throw new Error("Failed to sign message");
  }
}

/**
 * Estimer le gas pour une transaction
 */
export async function estimateGas({
  walletId,
  to,
  value,
  data = "0x",
}: Omit<SendTransactionParams, "gasLimit" | "gasPrice">): Promise<{
  gasEstimate: string;
  gasPrice: string;
}> {
  try {
    const provider = getProvider();
    const valueWei = ethers.parseEther(value);

    const gasEstimate = await provider.estimateGas({
      from: walletId,
      to,
      value: valueWei,
      data,
    });

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice?.toString() || "0";

    return {
      gasEstimate: gasEstimate.toString(),
      gasPrice: ethers.formatUnits(gasPrice, "gwei"),
    };
  } catch (error) {
    console.error("Error estimating gas:", error);
    throw new Error("Failed to estimate gas");
  }
}

/**
 * Supprimer un wallet (soft delete)
 */
export async function deleteManagedWallet(
  walletId: string,
  userId: string
): Promise<void> {
  try {
    await deleteManagedWalletByWalletId(walletId, userId);
  } catch (error) {
    console.error("Error deleting wallet:", error);
    throw new Error("Failed to delete wallet");
  }
}
