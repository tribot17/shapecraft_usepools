import {
  PrismaClient,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

const prisma = new PrismaClient();

export async function createTransaction({
  txHash,
  type,
  amount,
  tokenAddress,
  chainId,
  status,
  userId,
  managedWalletId,
  poolId,
}: {
  txHash: string;
  type: TransactionType;
  amount: string;
  tokenAddress: string;
  chainId: number;
  status: TransactionStatus;
  userId: string;
  managedWalletId: string;
  poolId: string;
}) {
  return await prisma.transaction.create({
    data: {
      txHash,
      type,
      amount,
      tokenAddress,
      chainId,
      status,
      userId,
      managedWalletId,
      poolId,
    },
  });
}
