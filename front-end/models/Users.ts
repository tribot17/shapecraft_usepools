import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function createUser(
  walletAddress: string,
  userId: string,
  privyUserId: string
) {
  return await prisma.user.create({
    data: { walletAddress, id: userId, privyUserId },
  });
}

export type UserByWalletAddress = Awaited<
  ReturnType<typeof getUserByWalletAddress>
>;
export async function getUserByWalletAddress(walletAddress: string) {
  return await prisma.user.findUnique({
    where: { walletAddress },
    include: {
      managedWallets: true,
    },
  });
}

export type UserWithManagedWallets = Awaited<ReturnType<typeof getUserById>>;
export async function getUserById(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      managedWallets: true,
    },
  });
}
