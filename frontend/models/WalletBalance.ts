import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateWalletBalanceData {
  walletId: string;
  chainId: number;
  balance: string;
  balanceETH: string;
}

export interface UpdateWalletBalanceData {
  balance: string;
  balanceETH: string;
  lastSyncedAt?: Date;
}

export async function createWalletBalance(data: CreateWalletBalanceData) {
  return await prisma.walletBalance.create({
    data: {
      walletId: data.walletId,
      chainId: data.chainId,
      balance: data.balance,
      balanceETH: data.balanceETH,
    },
  });
}

export async function getWalletBalance(walletId: string, chainId: number) {
  return await prisma.walletBalance.findUnique({
    where: {
      walletId_chainId: {
        walletId,
        chainId,
      },
    },
  });
}

export async function getAllWalletBalances(walletId: string) {
  return await prisma.walletBalance.findMany({
    where: { walletId },
    orderBy: { chainId: "asc" },
  });
}

export async function updateWalletBalance(
  walletId: string,
  chainId: number,
  data: UpdateWalletBalanceData
) {
  return await prisma.walletBalance.upsert({
    where: {
      walletId_chainId: {
        walletId,
        chainId,
      },
    },
    update: {
      balance: data.balance,
      balanceETH: data.balanceETH,
      lastSyncedAt: data.lastSyncedAt || new Date(),
      updatedAt: new Date(),
    },
    create: {
      walletId,
      chainId,
      balance: data.balance,
      balanceETH: data.balanceETH,
      lastSyncedAt: data.lastSyncedAt || new Date(),
    },
  });
}

export async function deleteWalletBalances(walletId: string) {
  return await prisma.walletBalance.deleteMany({
    where: { walletId },
  });
}
