import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    ruleId: string;
  }>;
}

// PUT /api/auto-invest/[ruleId] - Update auto-investment rule
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { ruleId } = await params;

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

    // Check if rule exists and belongs to user
    const existingRule = await prisma.autoInvestmentRule.findFirst({
      where: {
        id: ruleId,
        userId: user.id,
      },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Rule not found or doesn't belong to user" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      isActive,
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

    // Validate wallet if provided
    if (walletId) {
      const wallet = user.managedWallets.find((w) => w.id === walletId);
      if (!wallet) {
        return NextResponse.json(
          { error: "Wallet not found or doesn't belong to user" },
          { status: 400 }
        );
      }
    }

    // Update rule
    const updatedRule = await prisma.autoInvestmentRule.update({
      where: {
        id: ruleId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
        ...(maxBuyPrice !== undefined && {
          maxBuyPrice: maxBuyPrice ? parseFloat(maxBuyPrice) : null,
        }),
        ...(minSellPrice !== undefined && {
          minSellPrice: minSellPrice ? parseFloat(minSellPrice) : null,
        }),
        ...(maxCreatorFee !== undefined && {
          maxCreatorFee: maxCreatorFee ? parseFloat(maxCreatorFee) : null,
        }),
        ...(allowedCollections !== undefined && { allowedCollections }),
        ...(poolTypes !== undefined && { poolTypes }),
        ...(chains !== undefined && { chains }),
        ...(investmentAmount !== undefined && {
          investmentAmount: parseFloat(investmentAmount),
        }),
        ...(maxInvestmentPerDay !== undefined && {
          maxInvestmentPerDay: maxInvestmentPerDay
            ? parseFloat(maxInvestmentPerDay)
            : null,
        }),
        ...(walletId !== undefined && { walletId }),
        ...(minPoolAge !== undefined && {
          minPoolAge: minPoolAge ? parseInt(minPoolAge) : null,
        }),
        ...(requireVerifiedCreator !== undefined && { requireVerifiedCreator }),
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
    });

    return NextResponse.json({
      success: true,
      rule: {
        id: updatedRule.id,
        name: updatedRule.name,
        isActive: updatedRule.isActive,
        maxBuyPrice: updatedRule.maxBuyPrice,
        minSellPrice: updatedRule.minSellPrice,
        maxCreatorFee: updatedRule.maxCreatorFee,
        allowedCollections: updatedRule.allowedCollections,
        poolTypes: updatedRule.poolTypes,
        chains: updatedRule.chains,
        investmentAmount: updatedRule.investmentAmount,
        maxInvestmentPerDay: updatedRule.maxInvestmentPerDay,
        walletId: updatedRule.walletId,
        minPoolAge: updatedRule.minPoolAge,
        requireVerifiedCreator: updatedRule.requireVerifiedCreator,
        totalInvested: updatedRule.totalInvested,
        totalInvestments: updatedRule.totalInvestments,
        lastTriggered: updatedRule.lastTriggered?.toISOString(),
        createdAt: updatedRule.createdAt.toISOString(),
        updatedAt: updatedRule.updatedAt.toISOString(),
        wallet: updatedRule.wallet,
        investments: updatedRule.investments,
      },
    });
  } catch (error) {
    console.error("Error updating auto-investment rule:", error);
    return NextResponse.json(
      { error: "Failed to update auto-investment rule" },
      { status: 500 }
    );
  }
}

// DELETE /api/auto-invest/[ruleId] - Delete auto-investment rule
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { ruleId } = await params;

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

    // Check if rule exists and belongs to user
    const existingRule = await prisma.autoInvestmentRule.findFirst({
      where: {
        id: ruleId,
        userId: user.id,
      },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Rule not found or doesn't belong to user" },
        { status: 404 }
      );
    }

    // Delete rule (this will cascade delete investments)
    await prisma.autoInvestmentRule.delete({
      where: {
        id: ruleId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Auto-investment rule deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting auto-investment rule:", error);
    return NextResponse.json(
      { error: "Failed to delete auto-investment rule" },
      { status: 500 }
    );
  }
}
