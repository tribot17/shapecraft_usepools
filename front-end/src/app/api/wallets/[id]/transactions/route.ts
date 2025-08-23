import { estimateGas, sendTransaction } from "@/lib/services/wallet";
import { NextRequest, NextResponse } from "next/server";

// POST /api/wallets/[id]/transactions - Send transaction
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { to, value, gasLimit, gasPrice, data } = await request.json();
    const walletId = params.id;

    if (!to || !value) {
      return NextResponse.json(
        { error: "To address and value are required" },
        { status: 400 }
      );
    }

    const result = await sendTransaction({
      walletId,
      to,
      value,
      gasLimit,
      gasPrice,
      data,
    });

    return NextResponse.json({
      transaction: result,
      success: true,
    });
  } catch (error) {
    console.error("Error sending transaction:", error);
    return NextResponse.json(
      { error: "Failed to send transaction" },
      { status: 500 }
    );
  }
}

// GET /api/wallets/[id]/transactions/estimate - Estimate gas
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const to = searchParams.get("to");
    const value = searchParams.get("value");
    const data = searchParams.get("data") || "0x";
    const walletId = params.id;

    if (!to || !value) {
      return NextResponse.json(
        { error: "To address and value are required" },
        { status: 400 }
      );
    }

    const estimate = await estimateGas({
      walletId,
      to,
      value,
      data,
    });

    return NextResponse.json({
      estimate,
      success: true,
    });
  } catch (error) {
    console.error("Error estimating gas:", error);
    return NextResponse.json(
      { error: "Failed to estimate gas" },
      { status: 500 }
    );
  }
}
