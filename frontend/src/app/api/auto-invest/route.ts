import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/auto-invest - Get user's auto-investment rules
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user
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

    // Get auto-investment rules
    const rules = await prisma.autoInvestmentRule.findMany({
      where: {
        userId: user.id,
      },
      include: {
        wallet: {
          select: {
            address: true,
            name: true,
          },
        },
        investments: {
          select: {
            amount: true,
            status: true,
            executedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      rules: rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        isActive: rule.isActive,
        maxBuyPrice: rule.maxBuyPrice,
        minSellPrice: rule.minSellPrice,
        maxCreatorFee: rule.maxCreatorFee,
        allowedCollections: rule.allowedCollections,
        poolTypes: rule.poolTypes,
        chains: rule.chains,
        investmentAmount: rule.investmentAmount,
        maxInvestmentPerDay: rule.maxInvestmentPerDay,
        walletId: rule.walletId,
        minPoolAge: rule.minPoolAge,
        requireVerifiedCreator: rule.requireVerifiedCreator,
        totalInvested: rule.totalInvested,
        totalInvestments: rule.totalInvestments,
        lastTriggered: rule.lastTriggered?.toISOString(),
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
        wallet: rule.wallet,
        investments: rule.investments,
      })),
    });
  } catch (error) {
    console.error("Error fetching auto-investment rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch auto-investment rules" },
      { status: 500 }
    );
  }
}

// POST /api/auto-invest - Create new auto-investment rule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: {
        walletAddress: session.user.walletAddress.toLowerCase(),
      },
      select: {
        id: true,
        managedWallets: {
          select: {
            id: true,
            walletId: true,
            address: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      maxBuyPrice,
      minSellPrice,
      maxCreatorFee,
      allowedCollections,
      poolTypes,
      chains,
      investmentAmount,
      maxInvestmentPerDay,
      walletId,
      minPoolAge,
      requireVerifiedCreator,
    } = body;

    // Validate required fields
    if (!name || !investmentAmount || !walletId) {
      return NextResponse.json(
        { error: "Missing required fields: name, investmentAmount, walletId" },
        { status: 400 }
      );
    }

    // Validate wallet belongs to user
    const wallet = user.managedWallets.find((w) => w.id === walletId);
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found or doesn't belong to user" },
        { status: 400 }
      );
    }

    // Create auto-investment rule
    const rule = await prisma.autoInvestmentRule.create({
      data: {
        userId: user.id,
        name,
        maxBuyPrice: maxBuyPrice ? parseFloat(maxBuyPrice) : null,
        minSellPrice: minSellPrice ? parseFloat(minSellPrice) : null,
        maxCreatorFee: maxCreatorFee ? parseFloat(maxCreatorFee) : null,
        allowedCollections: allowedCollections || [],
        poolTypes: poolTypes || [],
        chains: chains || [],
        investmentAmount: parseFloat(investmentAmount),
        maxInvestmentPerDay: maxInvestmentPerDay
          ? parseFloat(maxInvestmentPerDay)
          : null,
        walletId,
        minPoolAge: minPoolAge ? parseInt(minPoolAge) : null,
        requireVerifiedCreator: requireVerifiedCreator || false,
      },
      include: {
        wallet: {
          select: {
            address: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      rule: {
        id: rule.id,
        name: rule.name,
        isActive: rule.isActive,
        maxBuyPrice: rule.maxBuyPrice,
        minSellPrice: rule.minSellPrice,
        maxCreatorFee: rule.maxCreatorFee,
        allowedCollections: rule.allowedCollections,
        poolTypes: rule.poolTypes,
        chains: rule.chains,
        investmentAmount: rule.investmentAmount,
        maxInvestmentPerDay: rule.maxInvestmentPerDay,
        walletId: rule.walletId,
        minPoolAge: rule.minPoolAge,
        requireVerifiedCreator: rule.requireVerifiedCreator,
        totalInvested: rule.totalInvested,
        totalInvestments: rule.totalInvestments,
        lastTriggered: rule.lastTriggered?.toISOString(),
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
        wallet: rule.wallet,
      },
    });
  } catch (error) {
    console.error("Error creating auto-investment rule:", error);
    return NextResponse.json(
      { error: "Failed to create auto-investment rule" },
      { status: 500 }
    );
  }
}
