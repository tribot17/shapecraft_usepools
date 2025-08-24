/**
 * 🌊 Route pour les positions utilisateur UsePools
 */

import { authOptions } from "@/lib/auth";
import { usePoolsClient } from "@/services/usepools";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Récupérer les positions et analytics en parallèle
    const [positions, analytics] = await Promise.all([
      usePoolsClient.getUserPositions(session),
      usePoolsClient.getUserAnalytics(session),
    ]);

    return NextResponse.json({
      success: true,
      positions,
      analytics,
    });
  } catch (error) {
    console.error("Error fetching user positions:", error);
    return NextResponse.json(
      { error: "Failed to fetch user positions" },
      { status: 500 }
    );
  }
}
