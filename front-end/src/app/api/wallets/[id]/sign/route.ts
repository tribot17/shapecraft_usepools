import { signMessage } from "@/lib/services/wallet";
import { NextRequest, NextResponse } from "next/server";

// POST /api/wallets/[id]/sign - Sign message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { message } = await request.json();
    const walletId = params.id;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const signature = await signMessage(walletId, message);

    return NextResponse.json({
      signature,
      success: true,
    });
  } catch (error) {
    console.error("Error signing message:", error);
    return NextResponse.json(
      { error: "Failed to sign message" },
      { status: 500 }
    );
  }
}
