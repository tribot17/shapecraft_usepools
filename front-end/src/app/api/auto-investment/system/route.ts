import { getAutoInvestmentEngine } from "@/lib/services/autoInvestmentEngine";
import {
  getPoolDetectionService,
  startAllPoolDetection,
  stopAllPoolDetection,
} from "@/lib/services/poolDetectionService";
import { NextRequest, NextResponse } from "next/server";

// GET /api/auto-investment/system - Statut du système d'auto-investment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "status":
        const engine = getAutoInvestmentEngine();
        const engineStats = await engine.getStats();

        // Statut des services de détection
        const detectionStats = {
          360: getPoolDetectionService(
            360,
            process.env.POOL_FACTORY_ADDRESS_360 || "0x..."
          ).getStats(),
          11011: getPoolDetectionService(
            11011,
            process.env.POOL_FACTORY_ADDRESS_11011 || "0x..."
          ).getStats(),
        };

        return NextResponse.json({
          success: true,
          autoInvestmentEngine: engineStats,
          poolDetection: detectionStats,
          timestamp: new Date().toISOString(),
        });

      case "health":
        // Vérification de santé rapide
        return NextResponse.json({
          success: true,
          status: "healthy",
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'status' or 'health'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error getting auto-investment system status:", error);
    return NextResponse.json(
      {
        error: "Failed to get system status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/auto-investment/system - Contrôle du système d'auto-investment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, chainId, poolId } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "start_detection":
        await startAllPoolDetection();
        return NextResponse.json({
          success: true,
          message: "Pool detection services started",
        });

      case "stop_detection":
        stopAllPoolDetection();
        return NextResponse.json({
          success: true,
          message: "Pool detection services stopped",
        });

      case "process_pool":
        if (!poolId) {
          return NextResponse.json(
            { error: "poolId is required for process_pool action" },
            { status: 400 }
          );
        }

        const engine = getAutoInvestmentEngine();
        await engine.processNewPool(poolId);

        return NextResponse.json({
          success: true,
          message: `Pool ${poolId} processed for auto-investment`,
        });

      case "scan_transaction":
        if (!body.txHash || !chainId) {
          return NextResponse.json(
            {
              error:
                "txHash and chainId are required for scan_transaction action",
            },
            { status: 400 }
          );
        }

        const poolFactoryAddress =
          chainId === 360
            ? process.env.POOL_FACTORY_ADDRESS_360
            : process.env.POOL_FACTORY_ADDRESS_11011;

        if (!poolFactoryAddress || poolFactoryAddress === "0x...") {
          return NextResponse.json(
            {
              error: `Pool factory address not configured for chain ${chainId}`,
            },
            { status: 400 }
          );
        }

        const detectionService = getPoolDetectionService(
          chainId,
          poolFactoryAddress
        );
        const detectedPool = await detectionService.scanTransaction(
          body.txHash
        );

        if (detectedPool) {
          // Traiter automatiquement pour l'auto-investment
          const autoEngine = getAutoInvestmentEngine();
          await autoEngine.processNewPool(detectedPool.poolAddress);
        }

        return NextResponse.json({
          success: true,
          detectedPool,
          message: detectedPool
            ? `Pool detected and processed: ${detectedPool.poolAddress}`
            : "No pool detected in transaction",
        });

      case "evaluate_pool":
        if (!poolId || !body.ruleId) {
          return NextResponse.json(
            {
              error: "poolId and ruleId are required for evaluate_pool action",
            },
            { status: 400 }
          );
        }

        const evalEngine = getAutoInvestmentEngine();
        const evaluation = await evalEngine.evaluatePoolForRule(
          poolId,
          body.ruleId
        );

        return NextResponse.json({
          success: true,
          evaluation,
          message: evaluation
            ? `Pool matches rule with score ${evaluation.score}`
            : "Pool does not match rule criteria",
        });

      case "find_matches":
        if (!poolId) {
          return NextResponse.json(
            { error: "poolId is required for find_matches action" },
            { status: 400 }
          );
        }

        const matchEngine = getAutoInvestmentEngine();
        const matches = await matchEngine.findMatchingRules(poolId);

        return NextResponse.json({
          success: true,
          matches,
          message: `Found ${matches.length} matching rules for pool ${poolId}`,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error controlling auto-investment system:", error);
    return NextResponse.json(
      {
        error: "Failed to control system",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
