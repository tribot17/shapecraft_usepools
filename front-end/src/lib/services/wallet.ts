import { ethers } from "ethers";
import {
  createManagedWallet as createWalletInDB,
  deleteManagedWalletByWalletId,
  getManagedWalletByWalletId,
  getManagedWallets as getWalletsFromDB,
} from "../../../models/Wallets";
import { decryptPrivateKey, encryptPrivateKey } from "../crypto/encryption";

export interface CreateWalletParams {
  userId: string;
  name?: string;
}

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

export interface SendTransactionParams {
  walletId: string;
  to: string;
  value: string; // en ETH
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

const RPC_URL_CONFIG = {
  360: "https://shape-mainnet.g.alchemy.com/v2",
  11011: "https://shape-sepolia.g.alchemy.com/v2",
};

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

function getProvider(
  chainId: keyof typeof RPC_URL_CONFIG = 11011
): ethers.JsonRpcProvider {
  const rpcUrl = `${RPC_URL_CONFIG[chainId]}/${process.env.ALCHEMY_API_KEY}`;
  return new ethers.JsonRpcProvider(rpcUrl);
}

export async function getWalletBalance(
  walletId: string
): Promise<{ balance: string; balanceETH: string }> {
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(walletId);
    const balanceETH = ethers.formatEther(balance);

    return {
      balance: balance.toString(),
      balanceETH,
    };
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    throw new Error("Failed to get wallet balance");
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
          const { balance, balanceETH } = await getWalletBalance(
            wallet.walletId
          );
          return {
            id: wallet.id,
            walletId: wallet.walletId,
            address: wallet.address,
            name: wallet.name ?? undefined,
            balance,
            balanceETH,
            isActive: wallet.isActive,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
          };
        } catch (error) {
          console.error(
            `Error getting balance for wallet ${wallet.walletId}:`,
            error
          );
          return {
            id: wallet.id,
            walletId: wallet.walletId,
            address: wallet.address,
            name: wallet.name ?? undefined,
            balance: "0",
            balanceETH: "0",
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
  gasLimit,
  gasPrice,
  data = "0x",
}: SendTransactionParams): Promise<TransactionResult> {
  try {
    const wallet = await getWalletWithPrivateKey(walletId);

    const provider = getProvider();
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
