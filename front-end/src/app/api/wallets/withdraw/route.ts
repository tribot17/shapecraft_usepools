import { authOptions } from "@/lib/auth";
import { sendTransaction } from "@/lib/services/wallet";
import { getUserByWalletAddress } from "models/Users";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { amount, walletId, to } = await request.json();
    console.log("🚀 ~ POST ~ amount:", amount);
    console.log("🚀 ~ POST ~ walletId:", walletId);
    console.log("🚀 ~ POST ~ to:", to);

    if (!session?.user.walletAddress) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (!amount || !walletId || !to) {
      return NextResponse.json(
        { error: "Amount, walletId, and to address are required" },
        { status: 400 }
      );
    }

    const user = await getUserByWalletAddress(session?.user.walletAddress);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userWallet = user.managedWallets.find((w) => w.walletId === walletId);
    if (!userWallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const result = await sendTransaction({
      walletId,
      to,
      value: amount,
    });

    return NextResponse.json({
      transaction: result,
      success: true,
    });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    return NextResponse.json(
      { error: "Failed to process withdrawal" },
      { status: 500 }
    );
  }
}
