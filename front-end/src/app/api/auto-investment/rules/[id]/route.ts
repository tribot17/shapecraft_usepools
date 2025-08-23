import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

// PUT /api/auto-investment/rules/[id] - Met à jour une règle d'auto-investment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.walletAddress) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: session.user.walletAddress },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ruleId = params.id;
    const body = await request.json();

    // Vérifier que la règle appartient à l'utilisateur
    const existingRule = await prisma.autoInvestmentRule.findFirst({
      where: { id: ruleId, userId: user.id },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Rule not found or not owned by user" },
        { status: 404 }
      );
    }

    // Mettre à jour la règle
    const updatedRule = await prisma.autoInvestmentRule.update({
      where: { id: ruleId },
      data: {
        name: body.name,
        isActive: body.isActive,
        maxBuyPrice: body.maxBuyPrice || null,
        minSellPrice: body.minSellPrice || null,
        maxCreatorFee: body.maxCreatorFee || null,
        allowedCollections: body.allowedCollections || [],
        poolTypes: body.poolTypes || [],
        chains: body.chains || [],
        investmentAmount: body.investmentAmount,
        maxInvestmentPerDay: body.maxInvestmentPerDay || null,
        walletId: body.walletId,
        minPoolAge: body.minPoolAge || null,
        requireVerifiedCreator: body.requireVerifiedCreator || false,
      },
      include: {
        wallet: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    console.log(`📝 Auto-investment rule updated: ${updatedRule.name}`);

    return NextResponse.json({
      rule: updatedRule,
      message: "Auto-investment rule updated successfully",
    });
  } catch (error) {
    console.error("Error updating auto-investment rule:", error);
    return NextResponse.json(
      {
        error: "Failed to update rule",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/auto-investment/rules/[id] - Supprime une règle d'auto-investment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.walletAddress) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: session.user.walletAddress },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ruleId = params.id;

    // Vérifier que la règle appartient à l'utilisateur
    const existingRule = await prisma.autoInvestmentRule.findFirst({
      where: { id: ruleId, userId: user.id },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Rule not found or not owned by user" },
        { status: 404 }
      );
    }

    // Supprimer la règle (cela supprimera aussi les investissements associés)
    await prisma.autoInvestmentRule.delete({
      where: { id: ruleId },
    });

    console.log(`🗑️ Auto-investment rule deleted: ${existingRule.name}`);

    return NextResponse.json({
      message: "Auto-investment rule deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting auto-investment rule:", error);
    return NextResponse.json(
      {
        error: "Failed to delete rule",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET /api/auto-investment/rules/[id] - Récupère une règle spécifique avec ses statistiques
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.walletAddress) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: session.user.walletAddress },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ruleId = params.id;

    const rule = await prisma.autoInvestmentRule.findFirst({
      where: { id: ruleId, userId: user.id },
      include: {
        wallet: {
          select: { id: true, name: true, address: true },
        },
        investments: {
          include: {
            pool: {
              select: {
                id: true,
                name: true,
                poolAddress: true,
                creatorFee: true,
                buyPrice: true,
                sellPrice: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { investments: true },
        },
      },
    });

    if (!rule) {
      return NextResponse.json(
        { error: "Rule not found or not owned by user" },
        { status: 404 }
      );
    }

    // Calculer les statistiques
    const totalInvested = rule.investments.reduce(
      (sum, inv) => sum + inv.amount,
      0
    );
    const successfulInvestments = rule.investments.filter(
      (inv) => inv.status === "COMPLETED"
    ).length;
    const failedInvestments = rule.investments.filter(
      (inv) => inv.status === "FAILED"
    ).length;

    const stats = {
      totalInvestments: rule.investments.length,
      totalInvested,
      successfulInvestments,
      failedInvestments,
      successRate:
        rule.investments.length > 0
          ? (successfulInvestments / rule.investments.length) * 100
          : 0,
    };

    return NextResponse.json({ rule, stats });
  } catch (error) {
    console.error("Error fetching auto-investment rule:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch rule",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
