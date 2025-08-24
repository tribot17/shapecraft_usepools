import { ethers } from "ethers";
import { getManagedWalletByWalletId } from "models/Wallets";
import { decryptPrivateKey } from "../crypto/encryption";

export async function getWalletWithPrivateKey(
  walletId: string
): Promise<ethers.Wallet> {
  const managedWallet = await getManagedWalletByWalletId(walletId);

  if (!managedWallet) {
    throw new Error("Wallet not found");
  }

  const privateKey = decryptPrivateKey(managedWallet.encryptedPrivateKey);

  return new ethers.Wallet(privateKey);
}
