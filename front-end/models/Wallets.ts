import { ManagedWallet, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateManagedWalletData {
  walletId: string;
  address: string;
  encryptedPrivateKey: string;
  name?: string;
  userId: string;
}

export async function createManagedWallet(data: CreateManagedWalletData) {
  return await prisma.managedWallet.create({
    data: {
      walletId: data.walletId,
      address: data.address,
      encryptedPrivateKey: data.encryptedPrivateKey,
      name: data.name,
      userId: data.userId,
    },
  });
}

export async function getManagedWallets(userId: string) {
  return await prisma.managedWallet.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      pools: true,
      transactions: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getManagedWallet(id: string) {
  return await prisma.managedWallet.findUnique({
    where: { id, isActive: true },
  });
}

export async function getManagedWalletByWalletId(walletId: string) {
  return await prisma.managedWallet.findUnique({
    where: { walletId, isActive: true },
  });
}

export async function updateManagedWallet(
  id: string,
  data: Partial<ManagedWallet>
) {
  return await prisma.managedWallet.update({
    where: { id },
    data,
  });
}

export async function deleteManagedWallet(id: string) {
  return await prisma.managedWallet.update({
    where: { id },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
}

/**
 * Supprimer un wallet par walletId et userId (soft delete)
 */
export async function deleteManagedWalletByWalletId(
  walletId: string,
  userId: string
) {
  return await prisma.managedWallet.updateMany({
    where: { walletId, userId, isActive: true },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
}
