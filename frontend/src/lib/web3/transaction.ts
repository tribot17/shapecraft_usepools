import { ethers, formatEther } from "ethers";
import { type Address } from "viem";
import { getProvider, getPublicClientForChain } from "./config";
import { getWalletWithPrivateKey } from "./wallet";

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

export async function getEthBalance(
  address: Address,
  chainId: number = 1
): Promise<string> {
  const publicClient = getPublicClientForChain(chainId);
  const balance = await publicClient.getBalance({ address });
  return formatEther(balance);
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
    console.log("🚀 ~ sendTransaction ~ valueWei:", valueWei);

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
