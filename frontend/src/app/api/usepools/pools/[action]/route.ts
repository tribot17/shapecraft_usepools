/**
 * 🌊 Route pour les actions sur les pools (join/exit)
 */

import { authOptions } from "@/lib/auth";
import {
  usePoolsClient,
  type ExitPoolRequest,
  type JoinPoolRequest,
} from "@/services/usepools";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

interface RouteParams {
  params: {
    action: string;
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { action } = params;

    if (action === "join") {
      const joinData: JoinPoolRequest = await request.json();

      if (!joinData.poolId || !joinData.amount) {
        return NextResponse.json(
          { error: "Missing required fields: poolId, amount" },
          { status: 400 }
        );
      }

      const result = await usePoolsClient.joinPool(session, joinData);

      return NextResponse.json({
        success: true,
        result,
      });
    }

    if (action === "exit") {
      const exitData: ExitPoolRequest = await request.json();

      if (!exitData.poolId || !exitData.amount) {
        return NextResponse.json(
          { error: "Missing required fields: poolId, amount" },
          { status: 400 }
        );
      }

      const result = await usePoolsClient.exitPool(session, exitData);

      return NextResponse.json({
        success: true,
        result,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'join' or 'exit'" },
      { status: 400 }
    );
  } catch (error) {
    console.error(`Error with pool ${params.action}:`, error);
    return NextResponse.json(
      { error: `Failed to ${params.action} pool` },
      { status: 500 }
    );
  }
}
