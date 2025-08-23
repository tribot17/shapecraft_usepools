import { createManagedWallet, getUserWallets } from "@/lib/services/wallet";
import { getUserById } from "models/Users";
import { NextRequest, NextResponse } from "next/server";

// GET /api/wallets - List user's managed wallets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const wallets = await getUserWallets(userId);

    return NextResponse.json({ wallets });
  } catch (error) {
    console.error("Error fetching wallets:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallets" },
      { status: 500 }
    );
  }
}

// POST /api/wallets - Create a new managed wallet
export async function POST(request: NextRequest) {
  try {
    const { userId, name } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const wallet = await createManagedWallet({
      userId: user.id,
      name: name || `Wallet ${Date.now()}`,
    });

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        walletId: wallet.walletId,
        address: wallet.address,
        name: wallet.name,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error creating wallet:", error);
    return NextResponse.json(
      { error: "Failed to create wallet" },
      { status: 500 }
    );
  }
}
