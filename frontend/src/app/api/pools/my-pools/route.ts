import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: {
        walletAddress: session.user.walletAddress.toLowerCase(),
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Récupérer les pools créés par cet utilisateur
    const pools = await prisma.pool.findMany({
      where: {
        creatorId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      pools: pools.map((pool) => ({
        id: pool.id,
        name: pool.name,
        nftCollectionAddress: pool.nftCollectionAddress,
        poolAddress: pool.poolAddress,
        creatorFee: pool.creatorFee,
        buyPrice: pool.buyPrice,
        sellPrice: pool.sellPrice,
        totalContribution: pool.totalContribution,
        createdAt: pool.createdAt.toISOString(),
        updatedAt: pool.updatedAt.toISOString(),
      })),
      count: pools.length,
    });
  } catch (error) {
    console.error("Error fetching user pools:", error);
    return NextResponse.json(
      { error: "Failed to fetch pools" },
      { status: 500 }
    );
  }
}
