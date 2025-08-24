import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    identifier: string;
  }>;
}

// GET /api/pools/[identifier] - Get a specific pool by ID or pool address
export async function GET({ params }: RouteParams) {
  try {
    const { identifier } = await params;

    const isAddress = identifier.startsWith("0x") && identifier.length === 42;

    const whereClause = isAddress
      ? { poolAddress: { equals: identifier, mode: "insensitive" as const } }
      : { id: identifier };

    const pool = await prisma.pool.findFirst({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            walletAddress: true,
            name: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                walletAddress: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            joinedAt: "desc",
          },
        },
        transactions: {
          include: {
            user: {
              select: {
                walletAddress: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20, // Last 20 transactions
        },
        autoInvestments: {
          include: {
            rule: {
              select: {
                name: true,
              },
            },
            user: {
              select: {
                walletAddress: true,
                name: true,
              },
            },
          },
          where: {
            status: "COMPLETED",
          },
          orderBy: {
            executedAt: "desc",
          },
        },
        _count: {
          select: {
            participants: true,
            transactions: true,
            autoInvestments: true,
          },
        },
      },
    });

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    // Calculate additional statistics
    const totalAutoInvested = pool.autoInvestments.reduce(
      (sum, investment) => sum + investment.amount,
      0
    );

    const avgContribution =
      pool.participants.length > 0
        ? pool.participants.reduce((sum, p) => sum + p.contribution, 0) /
          pool.participants.length
        : 0;

    // Format the response
    const formattedPool = {
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

      // Participants with their contributions
      participants: pool.participants.map((p) => ({
        id: p.id,
        contribution: p.contribution,
        contributionETH: p.contribution.toFixed(6),
        joinedAt: p.joinedAt.toISOString(),
        isActive: p.isActive,
        user: {
          walletAddress: p.user.walletAddress,
          name: p.user.name,
          avatar: p.user.avatar,
        },
      })),

      // Recent transactions
      transactions: pool.transactions.map((tx) => ({
        id: tx.id,
        txHash: tx.txHash,
        type: tx.type,
        amount: tx.amount,
        amountETH: (parseFloat(tx.amount) / 1e18).toFixed(6),
        status: tx.status,
        chainId: tx.chainId,
        createdAt: tx.createdAt.toISOString(),
        user: {
          walletAddress: tx.user.walletAddress,
          name: tx.user.name,
        },
      })),

      // Auto-investments
      autoInvestments: pool.autoInvestments.map((investment) => ({
        id: investment.id,
        amount: investment.amount,
        amountETH: investment.amount.toFixed(6),
        status: investment.status,
        executedAt: investment.executedAt?.toISOString(),
        txHash: investment.txHash,
        rule: {
          name: investment.rule.name,
        },
        user: {
          walletAddress: investment.user.walletAddress,
          name: investment.user.name,
        },
      })),

      // Statistics
      stats: {
        totalParticipants: pool._count.participants,
        totalTransactions: pool._count.transactions,
        totalAutoInvestments: pool._count.autoInvestments,
        totalAutoInvested: totalAutoInvested,
        totalAutoInvestedETH: totalAutoInvested.toFixed(6),
        avgContribution: avgContribution,
        avgContributionETH: avgContribution.toFixed(6),
        priceRange: {
          buyPriceETH: (parseFloat(pool.buyPrice) / 1e18).toFixed(6),
          sellPriceETH: (parseFloat(pool.sellPrice) / 1e18).toFixed(6),
          spread: (
            (parseFloat(pool.sellPrice) - parseFloat(pool.buyPrice)) /
            1e18
          ).toFixed(6),
          spreadPercentage: (
            ((parseFloat(pool.sellPrice) - parseFloat(pool.buyPrice)) /
              parseFloat(pool.buyPrice)) *
            100
          ).toFixed(2),
        },
      },
    };

    return NextResponse.json({
      success: true,
      pool: formattedPool,
    });
  } catch (error) {
    console.error("Error fetching pool:", error);
    return NextResponse.json(
      { error: "Failed to fetch pool" },
      { status: 500 }
    );
  }
}
