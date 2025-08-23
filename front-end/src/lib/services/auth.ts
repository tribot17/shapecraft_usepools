import { PrismaClient } from "@prisma/client";
import { verifyMessage } from "viem";

const prisma = new PrismaClient();

export async function authenticateWalletUser(credentials: {
  address: string;
  signature: string;
  message: string;
  nonce?: string;
  timestamp?: string;
}) {
  if (!credentials.address || !credentials.signature || !credentials.message) {
    return null;
  }

  try {
    const isValid = verifyMessage({
      address: credentials.address as `0x${string}`,
      message: credentials.message,
      signature: credentials.signature as `0x${string}`,
    });

    if (!isValid) {
      return null;
    }

    let user = await prisma.user.findUnique({
      where: {
        walletAddress: credentials.address.toLowerCase(),
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress: credentials.address.toLowerCase(),
          name: `Wallet ${credentials.address.slice(0, 8)}...`,
          privyUserId: `wallet_${credentials.address.toLowerCase()}`,
        },
      });
    }

    return {
      id: user.id,
      email: `${user.walletAddress}@wallet.local`,
      name: user.name || `Wallet ${user.walletAddress.slice(0, 8)}...`,
      walletAddress: user.walletAddress,
    };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}
