/**
 * 🌊 Route pour créer un pool via UsePools
 *
 * Utilise le service UsePools pour créer un pool de manière authentifiée
 */

import { authOptions } from "@/lib/auth";
import { usePoolsClient, type CreatePoolRequest } from "@/services/usepools";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const poolData: CreatePoolRequest = await request.json();

    // Validation des champs requis
    if (
      !poolData.poolName ||
      !poolData.collectionAddress ||
      !poolData.chainId
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: poolName, collectionAddress, chainId",
        },
        { status: 400 }
      );
    }

    // Créer le pool via le service UsePools
    const result = await usePoolsClient.createPool(session, poolData);

    return NextResponse.json({
      success: true,
      pool: result.pool,
    });
  } catch (error) {
    console.error("Error creating pool:", error);
    return NextResponse.json(
      { error: "Failed to create pool" },
      { status: 500 }
    );
  }
}

// GET pour récupérer les pools de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Récupérer tous les pools via le service UsePools
    const pools = await usePoolsClient.getPools(session);

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
