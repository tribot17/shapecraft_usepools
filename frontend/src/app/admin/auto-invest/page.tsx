"use client";

import ChatSidebar from "@/components/chat/ChatSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConditionalWallet } from "@/hooks/useConditionalWallet";
import {
  Activity,
  Bot,
  Play,
  RefreshCw,
  Settings,
  Square,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface MonitoringStats {
  activeRules: number;
  totalInvestments: number;
  totalInvestedAmount: number;
  lastMonitoringRun?: string;
}

interface SchedulerStatus {
  isRunning: boolean;
  intervalMs: number;
  nextRunIn?: number;
}

export default function AutoInvestAdminPage() {
  const { user, isLoading } = useConditionalWallet();
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [statsResponse, schedulerResponse] = await Promise.all([
        fetch("/api/auto-invest/monitor"),
        fetch("/api/auto-invest/scheduler"),
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      if (schedulerResponse.ok) {
        const schedulerData = await schedulerResponse.json();
        setScheduler(schedulerData.scheduler);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchData();

      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    } else if (!isLoading && !user) {
      setLoading(false);
    }
  }, [user, isLoading, fetchData]);

  const handleSchedulerAction = async (action: "start" | "stop") => {
    try {
      setActionLoading(action);

      const response = await fetch("/api/auto-invest/scheduler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error("Failed to control scheduler");
      }

      const data = await response.json();
      setScheduler(data.scheduler);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to control scheduler"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualMonitoring = async () => {
    try {
      setActionLoading("monitor");

      const response = await fetch("/api/auto-invest/monitor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to trigger monitoring");
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to trigger monitoring"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const renderContent = () => {
    if (isLoading || loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading auto-invest monitoring...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 mb-4">
              You need to be logged in to access auto-investment administration.
            </p>
            <Button
              onClick={() => (window.location.href = "/")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Go to Login
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
            <Button
              onClick={() => setError(null)}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Scheduler Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Auto-Investment Scheduler
            </CardTitle>
            <CardDescription>
              Control the automated pool monitoring and investment system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge
                    variant={scheduler?.isRunning ? "default" : "secondary"}
                  >
                    {scheduler?.isRunning ? "Running" : "Stopped"}
                  </Badge>
                </div>
                {scheduler?.isRunning && (
                  <p className="text-xs text-muted-foreground">
                    Monitoring every {formatTime(scheduler.intervalMs)}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSchedulerAction("start")}
                  disabled={scheduler?.isRunning || actionLoading === "start"}
                  variant="default"
                  size="sm"
                >
                  {actionLoading === "start" ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Start
                </Button>
                <Button
                  onClick={() => handleSchedulerAction("stop")}
                  disabled={!scheduler?.isRunning || actionLoading === "stop"}
                  variant="outline"
                  size="sm"
                >
                  {actionLoading === "stop" ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  Stop
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Rules
              </CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeRules || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-investment rules running
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Investments
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalInvestments || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Automated executions completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Invested
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalInvestedAmount?.toFixed(4) || "0.0000"} ETH
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically invested via rules
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Manual Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Controls</CardTitle>
            <CardDescription>
              Trigger monitoring cycles and other administrative actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={handleManualMonitoring}
                disabled={actionLoading === "monitor"}
                variant="outline"
              >
                {actionLoading === "monitor" ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Activity className="h-4 w-4 mr-2" />
                )}
                Run Monitoring Cycle
              </Button>
              <Button onClick={fetchData} disabled={loading} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The monitoring cycle checks for new pools and executes investments
              based on active rules.
            </p>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Environment:</span>
              <span className="font-medium">
                {process.env.NODE_ENV || "development"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Auto-invest enabled:
              </span>
              <span className="font-medium">
                {process.env.AUTO_INVEST_ENABLED === "true" ? "Yes" : "No"}
              </span>
            </div>
            {stats?.lastMonitoringRun && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Last monitoring run:
                </span>
                <span className="font-medium">
                  {new Date(stats.lastMonitoringRun).toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <ChatSidebar />

      <div className="flex-1 flex flex-col overflow-hidden ml-[280px]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Auto-Investment Admin
              </h1>
              <p className="text-sm text-gray-600">
                Monitor and control automated investment system
              </p>
            </div>
            {user && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Admin user</p>
                <p className="text-sm font-medium text-gray-900">
                  {user.walletAddress.slice(0, 6)}...
                  {user.walletAddress.slice(-4)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
      </div>
    </div>
  );
}
