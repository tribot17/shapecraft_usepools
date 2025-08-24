import { authOptions } from "@/lib/auth";
import { AutoInvestScheduler } from "@/services/auto-invest/scheduler";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/auto-invest/scheduler - Get scheduler status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const scheduler = AutoInvestScheduler.getInstance();
    const status = scheduler.getStatus();

    return NextResponse.json({
      success: true,
      scheduler: status,
    });
  } catch (error) {
    console.error("Error getting scheduler status:", error);
    return NextResponse.json(
      { error: "Failed to get scheduler status" },
      { status: 500 }
    );
  }
}

// POST /api/auto-invest/scheduler - Control scheduler (start/stop)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { action, intervalMs } = body;

    if (!action || !["start", "stop"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'start' or 'stop'" },
        { status: 400 }
      );
    }

    const scheduler = AutoInvestScheduler.getInstance();

    if (action === "start") {
      scheduler.start(intervalMs);
      console.log(
        `🚀 Auto-investment scheduler started by user ${session.user.walletAddress}`
      );
    } else if (action === "stop") {
      scheduler.stop();
      console.log(
        `🛑 Auto-investment scheduler stopped by user ${session.user.walletAddress}`
      );
    }

    const status = scheduler.getStatus();

    return NextResponse.json({
      success: true,
      message: `Scheduler ${action}ed successfully`,
      scheduler: status,
    });
  } catch (error) {
    console.error("Error controlling scheduler:", error);
    return NextResponse.json(
      { error: "Failed to control scheduler" },
      { status: 500 }
    );
  }
}
