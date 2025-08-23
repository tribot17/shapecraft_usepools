import { getRecentPoolCreations } from "@/lib/services/eventService";
import { NextRequest, NextResponse } from "next/server";

// GET /api/events/pools - Récupère les événements de création de pools
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get("chainId") || "360");
    const fromBlock = parseInt(searchParams.get("fromBlock") || "0");

    if (![360, 11011].includes(chainId)) {
      return NextResponse.json(
        { error: "Unsupported chainId. Use 360 (mainnet) or 11011 (sepolia)" },
        { status: 400 }
      );
    }

    const poolEvents = await getRecentPoolCreations(chainId, fromBlock);

    return NextResponse.json({
      success: true,
      chainId,
      fromBlock,
      events: poolEvents,
      count: poolEvents.length,
    });
  } catch (error) {
    console.error("Error fetching pool events:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch pool events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
