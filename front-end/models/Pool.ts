import { PoolStatus, PoolType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreatePoolParams {
  name: string;
  nftCollectionAddress: string;
  creatorFee: number;
  poolAddress: string;
  poolType: PoolType;
  buyPrice: number;
  sellPrice: number;
  totalContribution: number;
  creatorId: string;
}

export async function createPool({
  name,
  nftCollectionAddress,
  creatorFee,
  poolAddress,
  poolType,
  buyPrice,
  sellPrice,
  totalContribution,
  creatorId,
}: CreatePoolParams) {
  return await prisma.pool.create({
    data: {
      name,
      nftCollection: nftCollectionAddress,
      poolAddress,
      poolType,
      status: PoolStatus.FUNDING,
      creatorFee,
      buyPrice: buyPrice.toString(),
      sellPrice: sellPrice.toString(),
      totalContribution,
      creatorId,
    },
  });
}

export async function getPoolById(poolId: string) {
  return await prisma.pool.findUnique({
    where: { id: poolId },
  });
}

export async function getPoolsByCreatorId(creatorId: string) {
  return await prisma.pool.findMany({
    where: { creatorId },
  });
}

export async function getPoolsByUserId(userId: string) {
  return await prisma.poolParticipant.findMany({
    where: { userId },
  });
}

export async function getPoolByAddress(poolAddress: string) {
  return await prisma.pool.findFirst({
    where: { poolAddress },
  });
}
