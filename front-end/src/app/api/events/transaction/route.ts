import {
  getAllEventsFromTransaction,
  getEventFromTransaction,
  getPoolCreatedFromTransaction,
} from "@/lib/web3/events";
import { NextRequest, NextResponse } from "next/server";

// GET /api/events/transaction - Récupère les événements d'une transaction
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get("txHash");
    const eventName = searchParams.get("eventName");
    const chainId = parseInt(searchParams.get("chainId") || "360");
    const contractType = searchParams.get("contractType") as
      | "PoolFactory"
      | "Pool";
    const mode = searchParams.get("mode") || "single"; // single, all, poolCreated

    if (!txHash) {
      return NextResponse.json(
        { error: "txHash parameter is required" },
        { status: 400 }
      );
    }

    if (![360, 11011].includes(chainId)) {
      return NextResponse.json(
        { error: "Unsupported chainId. Use 360 (mainnet) or 11011 (sepolia)" },
        { status: 400 }
      );
    }

    if (!contractType || !["PoolFactory", "Pool"].includes(contractType)) {
      return NextResponse.json(
        { error: "contractType must be 'PoolFactory' or 'Pool'" },
        { status: 400 }
      );
    }

    let result;
    let resultType: string;

    switch (mode) {
      case "single":
        if (!eventName) {
          return NextResponse.json(
            { error: "eventName parameter is required for single mode" },
            { status: 400 }
          );
        }
        result = await getEventFromTransaction({
          txHash,
          eventName,
          chainId,
          contractType,
        });
        resultType = "singleEvent";
        break;

      case "all":
        result = await getAllEventsFromTransaction({
          txHash,
          chainId,
          contractType,
        });
        resultType = "allEvents";
        break;

      case "poolCreated":
        if (contractType !== "PoolFactory") {
          return NextResponse.json(
            {
              error:
                "poolCreated mode requires contractType to be 'PoolFactory'",
            },
            { status: 400 }
          );
        }
        result = await getPoolCreatedFromTransaction(txHash, chainId);
        resultType = "poolCreatedEvent";
        break;

      default:
        return NextResponse.json(
          { error: "Invalid mode. Use 'single', 'all', or 'poolCreated'" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      txHash,
      chainId,
      contractType,
      mode,
      [resultType]: result,
    });
  } catch (error) {
    console.error("Error fetching transaction events:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch transaction events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/events/transaction - Récupère les événements de plusieurs transactions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHashes, eventName, chainId = 360, contractType } = body;

    if (!Array.isArray(txHashes) || txHashes.length === 0) {
      return NextResponse.json(
        { error: "txHashes array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (![360, 11011].includes(chainId)) {
      return NextResponse.json(
        { error: "Unsupported chainId. Use 360 (mainnet) or 11011 (sepolia)" },
        { status: 400 }
      );
    }

    if (!contractType || !["PoolFactory", "Pool"].includes(contractType)) {
      return NextResponse.json(
        { error: "contractType must be 'PoolFactory' or 'Pool'" },
        { status: 400 }
      );
    }

    // Limiter le nombre de transactions pour éviter les timeouts
    if (txHashes.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 transactions allowed per request" },
        { status: 400 }
      );
    }

    const { getEventsFromTransactions } = await import("@/lib/web3/events");

    const events = await getEventsFromTransactions({
      txHashes,
      eventName,
      chainId,
      contractType,
    });

    return NextResponse.json({
      success: true,
      txHashes,
      chainId,
      contractType,
      eventName: eventName || "all",
      events,
      count: events.length,
    });
  } catch (error) {
    console.error("Error fetching multiple transaction events:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch multiple transaction events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
