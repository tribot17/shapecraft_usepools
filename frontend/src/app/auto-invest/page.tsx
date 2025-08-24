"use client";

import { AutoInvestForm } from "@/components/auto-invest/AutoInvestForm";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useConditionalWallet } from "@/hooks/useConditionalWallet";
import {
  Bot,
  Edit,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface AutoInvestmentRule {
  id: string;
  name: string;
  isActive: boolean;
  maxBuyPrice?: number;
  minSellPrice?: number;
  maxCreatorFee?: number;
  allowedCollections: string[];
  poolTypes: string[];
  chains: number[];
  investmentAmount: number;
  maxInvestmentPerDay?: number;
  walletId: string;
  minPoolAge?: number;
  requireVerifiedCreator: boolean;
  totalInvested: number;
  totalInvestments: number;
  lastTriggered?: string;
  createdAt: string;
  updatedAt: string;
  wallet: {
    address: string;
    name?: string;
  };
  investments: {
    amount: number;
    status: string;
    executedAt?: string;
  }[];
}

export default function AutoInvestPage() {
  const { user, isLoading } = useConditionalWallet();
  const [rules, setRules] = useState<AutoInvestmentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoInvestmentRule | null>(
    null
  );

  const fetchRules = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/auto-invest");

      if (!response.ok) {
        throw new Error("Failed to fetch auto-investment rules");
      }

      const data = await response.json();
      setRules(data.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchRules();
    } else if (!isLoading && !user) {
      setLoading(false);
    }
  }, [user, isLoading, fetchRules]);

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/auto-invest/${ruleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update rule");
      }

      // Update local state
      setRules((prev) =>
        prev.map((rule) => (rule.id === ruleId ? { ...rule, isActive } : rule))
      );
    } catch (err) {
      console.error("Error toggling rule:", err);
      setError(err instanceof Error ? err.message : "Failed to update rule");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (
      !confirm("Are you sure you want to delete this auto-investment rule?")
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/auto-invest/${ruleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete rule");
      }

      // Remove from local state
      setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
    } catch (err) {
      console.error("Error deleting rule:", err);
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "No address";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderContent = () => {
    if (isLoading || loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading auto-investment rules...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 mb-4">
              You need to be logged in to manage auto-investment rules.
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

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchRules} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    if (rules.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <CardTitle className="mb-2">No Auto-Investment Rules Yet</CardTitle>
            <CardDescription className="mb-6">
              Create your first auto-investment rule to automatically invest in
              pools based on your criteria.
            </CardDescription>
            <Dialog
              open={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Auto-Investment Rule</DialogTitle>
                  <DialogDescription>
                    Set up automated investing based on your criteria
                  </DialogDescription>
                </DialogHeader>
                <AutoInvestForm
                  onSuccess={() => {
                    setIsCreateModalOpen(false);
                    fetchRules();
                  }}
                  onCancel={() => setIsCreateModalOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6 ml-[360px]">
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
                {rules.filter((rule) => rule.isActive).length}
              </div>
              <p className="text-xs text-muted-foreground">
                of {rules.length} total rules
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
                {rules
                  .reduce((sum, rule) => sum + rule.totalInvested, 0)
                  .toFixed(4)}{" "}
                ETH
              </div>
              <p className="text-xs text-muted-foreground">
                across{" "}
                {rules.reduce((sum, rule) => sum + rule.totalInvestments, 0)}{" "}
                investments
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Auto Investment
              </CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rules.some((rule) => rule.isActive) ? "Active" : "Inactive"}
              </div>
              <p className="text-xs text-muted-foreground">
                {rules.filter((rule) => rule.isActive).length} rules running
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rules List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <CardDescription>
                      Created {formatDate(rule.createdAt)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={rule.isActive ? "default" : "secondary"}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(checked) =>
                        handleToggleRule(rule.id, checked)
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Investment Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-blue-700 mb-1">
                      Investment Amount
                    </div>
                    <div className="text-sm font-semibold text-blue-800">
                      {rule.investmentAmount} ETH
                    </div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xs text-green-700 mb-1">
                      Total Invested
                    </div>
                    <div className="text-sm font-semibold text-green-800">
                      {rule.totalInvested} ETH
                    </div>
                  </div>
                </div>

                {/* Criteria */}
                <div className="space-y-2">
                  {rule.maxBuyPrice && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Max Buy Price:
                      </span>
                      <span className="font-medium">
                        {rule.maxBuyPrice} ETH
                      </span>
                    </div>
                  )}
                  {rule.minSellPrice && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Min Sell Price:
                      </span>
                      <span className="font-medium">
                        {rule.minSellPrice} ETH
                      </span>
                    </div>
                  )}
                  {rule.maxCreatorFee && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Max Creator Fee:
                      </span>
                      <span className="font-medium">{rule.maxCreatorFee}%</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Wallet:</span>
                    <span className="font-medium">
                      {rule.wallet.name || formatAddress(rule.wallet.address)}
                    </span>
                  </div>
                </div>

                {/* Pool Types & Chains */}
                {rule.poolTypes.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Pool Types:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rule.poolTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {rule.chains.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Chains:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rule.chains.map((chainId) => (
                        <Badge
                          key={chainId}
                          variant="outline"
                          className="text-xs"
                        >
                          Chain {chainId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    Investments
                  </div>
                  <div className="text-sm font-semibold">
                    {rule.totalInvestments} executions
                  </div>
                  {rule.lastTriggered && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Last: {formatDate(rule.lastTriggered)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditingRule(rule)}
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Auto-Investment Rule</DialogTitle>
                        <DialogDescription>
                          Update your automated investing criteria
                        </DialogDescription>
                      </DialogHeader>
                      {editingRule && (
                        <AutoInvestForm
                          initialData={editingRule}
                          onSuccess={() => {
                            setEditingRule(null);
                            fetchRules();
                          }}
                          onCancel={() => setEditingRule(null)}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create New Rule */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Rule</CardTitle>
            <CardDescription>
              Add another auto-investment rule with different criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog
              open={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Auto-Investment Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Auto-Investment Rule</DialogTitle>
                  <DialogDescription>
                    Set up automated investing based on your criteria
                  </DialogDescription>
                </DialogHeader>
                <AutoInvestForm
                  onSuccess={() => {
                    setIsCreateModalOpen(false);
                    fetchRules();
                  }}
                  onCancel={() => setIsCreateModalOpen(false)}
                />
              </DialogContent>
            </Dialog>
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
                Auto-Investment
              </h1>
              <p className="text-sm text-gray-600">
                Automate your investments with custom rules
              </p>
            </div>
            {user && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Connected as</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatAddress(user.walletAddress)}
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
