import { authOptions } from "@/lib/auth";
import { usePoolsAuth } from "@/services/usepools";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const authResult = await usePoolsAuth.authenticateUser(session);
    console.log("🚀 ~ POST ~ authResult:", authResult);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || "Authentication failed" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: authResult.user,
      token: authResult.token,
    });
  } catch (error) {
    console.error("Error in connect_to_pool:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
