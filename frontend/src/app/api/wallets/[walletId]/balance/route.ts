import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { NextRequest, NextResponse } from "next/server";

// GET /api/wallets/[walletId]/balance - Get wallet balance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  try {
    const { walletId } = await params;

    // Get wallet from database
    const wallet = await prisma.managedWallet.findUnique({
      where: { walletId },
      include: { balances: true },
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // For demo purposes, we'll use a mock RPC. In production, use a real RPC endpoint
    const mockShapeRPC = "https://mainnet.shape.network";

    try {
      // Try to fetch real balance (this will fail in demo but shows the structure)
      const provider = new ethers.JsonRpcProvider(mockShapeRPC);
      const balance = await provider.getBalance(wallet.address);
      const balanceETH = ethers.formatEther(balance);

      // Update database with new balance
      await prisma.walletBalance.upsert({
        where: {
          walletId_chainId: {
            walletId: wallet.walletId,
            chainId: 360,
          },
        },
        update: {
          balance: balance.toString(),
          balanceETH,
          lastSyncedAt: new Date(),
        },
        create: {
          walletId: wallet.walletId,
          chainId: 360,
          balance: balance.toString(),
          balanceETH,
          lastSyncedAt: new Date(),
        },
      });

      return NextResponse.json({
        address: wallet.address,
        balance: balance.toString(),
        balanceETH,
        chainId: 360,
        lastSyncedAt: new Date(),
      });
    } catch (rpcError) {
      // Fallback to database balance if RPC fails
      console.log("RPC failed, using database balance:", rpcError);

      const dbBalance = wallet.balances.find((b) => b.chainId === 360);
      return NextResponse.json({
        address: wallet.address,
        balance: dbBalance?.balance || "0",
        balanceETH: dbBalance?.balanceETH || "0.0",
        chainId: 360,
        lastSyncedAt: dbBalance?.lastSyncedAt || new Date(),
        note: "Balance from cache (RPC unavailable)",
      });
    }
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/wallets/[walletId]/balance - Refresh wallet balance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  // This would be the same as GET but forces a refresh
  return GET(request, { params });
}
