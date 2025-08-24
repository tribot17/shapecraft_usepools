import { PoolMonitorService } from "@/services/auto-invest/poolMonitor";
import { NextResponse } from "next/server";

// GET /api/auto-invest/monitor - Get monitoring statistics
export async function GET() {
  try {
    const monitorService = PoolMonitorService.getInstance();
    const stats = await monitorService.getMonitoringStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error getting monitoring stats:", error);
    return NextResponse.json(
      { error: "Failed to get monitoring statistics" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const monitorService = PoolMonitorService.getInstance();

    console.log("🚀 Manual monitoring cycle triggered");
    await monitorService.monitorAndInvest();

    const stats = await monitorService.getMonitoringStats();

    return NextResponse.json({
      success: true,
      message: "Monitoring cycle completed",
      stats,
    });
  } catch (error) {
    console.error("Error in manual monitoring cycle:", error);
    return NextResponse.json(
      { error: "Failed to execute monitoring cycle" },
      { status: 500 }
    );
  }
}
