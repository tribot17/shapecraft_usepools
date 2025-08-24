import { PoolMonitorService } from "./poolMonitor";

export class AutoInvestScheduler {
  private static instance: AutoInvestScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private readonly DEFAULT_INTERVAL_MS = 1 * 60 * 1000;

  static getInstance(): AutoInvestScheduler {
    if (!AutoInvestScheduler.instance) {
      AutoInvestScheduler.instance = new AutoInvestScheduler();
    }
    return AutoInvestScheduler.instance;
  }

  start(intervalMs: number = this.DEFAULT_INTERVAL_MS): void {
    if (this.isRunning) {
      console.log("Auto-investment scheduler is already running");
      return;
    }

    console.log(
      `🕐 Starting auto-investment scheduler (interval: ${intervalMs / 1000}s)`
    );

    this.isRunning = true;

    // Run immediately on start
    this.runMonitoringCycle();

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.runMonitoringCycle();
    }, intervalMs);
  }

  /**
   * Stop the auto-investment scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log("🛑 Auto-investment scheduler stopped");
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Run a monitoring cycle
   */
  private async runMonitoringCycle(): Promise<void> {
    try {
      const monitorService = PoolMonitorService.getInstance();
      await monitorService.monitorAndInvest();
    } catch (error) {
      console.error("Error in scheduled monitoring cycle:", error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    intervalMs: number;
    nextRunIn?: number;
  } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.DEFAULT_INTERVAL_MS,
      nextRunIn: this.isRunning ? this.DEFAULT_INTERVAL_MS : undefined,
    };
  }
}

// Auto-start scheduler when module is imported (for production)
if (
  process.env.NODE_ENV === "production" &&
  process.env.AUTO_INVEST_ENABLED === "true"
) {
  const scheduler = AutoInvestScheduler.getInstance();
  scheduler.start();

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, stopping auto-investment scheduler...");
    scheduler.stop();
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, stopping auto-investment scheduler...");
    scheduler.stop();
  });
}
