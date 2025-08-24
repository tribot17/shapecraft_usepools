import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    address: string;
  }>;
}

// GET /api/pools/collection/[address] - Get all pools for a specific NFT collection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { address } = await params;

    if (!address || !address.startsWith("0x") || address.length !== 42) {
      return NextResponse.json(
        { error: "Invalid collection address format" },
        { status: 400 }
      );
    }

    const pools = await prisma.pool.findMany({
      where: {
        nftCollection: {
          equals: address.toLowerCase(),
          mode: "insensitive",
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            walletAddress: true,
            name: true,
          },
        },
        _count: {
          select: {
            participants: true,
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format the response
    const formattedPools = pools.map((pool) => ({
      id: pool.id,
      usepools_id: pool.usepools_id,
      name: pool.name,
      poolAddress: pool.poolAddress,
      nftCollectionAddress: pool.nftCollection,
      poolType: pool.poolType,
      status: pool.status,
      chainId: pool.chainId,
      buyPrice: pool.buyPrice,
      sellPrice: pool.sellPrice,
      buyPriceETH: (parseFloat(pool.buyPrice) / 1e18).toFixed(6),
      sellPriceETH: (parseFloat(pool.sellPrice) / 1e18).toFixed(6),
      creatorFee: pool.creatorFee,
      totalContribution: pool.totalContribution,
      createdAt: pool.createdAt.toISOString(),
      updatedAt: pool.updatedAt.toISOString(),
      creator: {
        id: pool.creator.id,
        walletAddress: pool.creator.walletAddress,
        name: pool.creator.name,
      },
      stats: {
        totalParticipants: pool._count.participants,
        totalTransactions: pool._count.transactions,
      },
    }));

    return NextResponse.json({
      success: true,
      collectionAddress: address.toLowerCase(),
      pools: formattedPools,
      totalPools: pools.length,
    });
  } catch (error) {
    console.error("Error fetching pools for collection:", error);
    return NextResponse.json(
      { error: "Failed to fetch pools for collection" },
      { status: 500 }
    );
  }
}
