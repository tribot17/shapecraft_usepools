import { authOptions } from "@/lib/auth";
import { sendTransaction } from "@/lib/web3/transaction";
import { getUserByWalletAddress } from "models/Users";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { amount, chainId } = await request.json();

    if (!session?.user.walletAddress) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (!amount) {
      return NextResponse.json(
        { error: "Amount and walletId are required" },
        { status: 400 }
      );
    }

    const user = await getUserByWalletAddress(session?.user.walletAddress);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userWallet = user.managedWallets[0];
    if (!userWallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const result = await sendTransaction({
      walletId: userWallet.walletId,
      to: user.walletAddress,
      value: amount,
      chainId,
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
