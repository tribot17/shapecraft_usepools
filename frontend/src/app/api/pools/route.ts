/**
 * 🌊 Exemple d'utilisation du service UsePools
 *
 * Route API qui utilise le service UsePools pour récupérer des données
 */

import { authOptions } from "@/lib/auth";
import {
  usePoolsClient,
  type JoinPoolRequest,
  type JoinPoolResponse,
  type PoolData,
} from "@/services/usepools";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Récupérer la liste des pools via le service UsePools
    // Le service gère automatiquement l'authentification
    const pools = await usePoolsClient.get<PoolData[]>("/api/pools", session);

    return NextResponse.json({
      success: true,
      pools,
    });
  } catch (error) {
    console.error("Error fetching pools:", error);
    return NextResponse.json(
      { error: "Failed to fetch pools" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body: JoinPoolRequest = await request.json();
    const { poolId, amountInWEI, transactionHash } = body;

    if (!poolId || !amountInWEI || !transactionHash) {
      return NextResponse.json(
        { error: "Missing poolId or amount" },
        { status: 400 }
      );
    }

    const result = await usePoolsClient.post<JoinPoolResponse>(
      "/api/pools/join",
      session,
      {
        poolId,
        amountInWEI,
        transactionHash,
      }
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error joining pool:", error);
    return NextResponse.json({ error: "Failed to join pool" }, { status: 500 });
  }
}
