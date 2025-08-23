import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

// GET /api/auto-investment/rules - Récupère les règles d'auto-investment de l'utilisateur
export async function GET(request: NextRequest) {
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

    const rules = await prisma.autoInvestmentRule.findMany({
      where: { userId: user.id },
      include: {
        wallet: {
          select: { id: true, name: true, address: true },
        },
        investments: {
          select: { id: true, amount: true, status: true, createdAt: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { investments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Error fetching auto-investment rules:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch rules",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/auto-investment/rules - Crée une nouvelle règle d'auto-investment
export async function POST(request: NextRequest) {
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
      include: { managedWallets: true },
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

    // Validation des données
    if (!name || !investmentAmount || !walletId) {
      return NextResponse.json(
        { error: "Name, investment amount, and wallet ID are required" },
        { status: 400 }
      );
    }

    if (investmentAmount <= 0) {
      return NextResponse.json(
        { error: "Investment amount must be positive" },
        { status: 400 }
      );
    }

    // Vérifier que le wallet appartient à l'utilisateur
    const wallet = user.managedWallets.find((w) => w.id === walletId);
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found or not owned by user" },
        { status: 404 }
      );
    }

    // Créer la règle
    const rule = await prisma.autoInvestmentRule.create({
      data: {
        userId: user.id,
        name,
        maxBuyPrice: maxBuyPrice || null,
        minSellPrice: minSellPrice || null,
        maxCreatorFee: maxCreatorFee || null,
        allowedCollections: allowedCollections || [],
        poolTypes: poolTypes || [],
        chains: chains || [],
        investmentAmount,
        maxInvestmentPerDay: maxInvestmentPerDay || null,
        walletId,
        minPoolAge: minPoolAge || null,
        requireVerifiedCreator: requireVerifiedCreator || false,
      },
      include: {
        wallet: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    console.log(
      `📋 Auto-investment rule created: ${rule.name} for user ${user.id}`
    );

    return NextResponse.json({
      rule,
      message: "Auto-investment rule created successfully",
    });
  } catch (error) {
    console.error("Error creating auto-investment rule:", error);
    return NextResponse.json(
      {
        error: "Failed to create rule",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
