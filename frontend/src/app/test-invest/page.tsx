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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConditionalWallet } from "@/hooks/useConditionalWallet";
import { useMyPools } from "@/hooks/useMyPools";
import { ArrowRight, Copy, RefreshCw, Send, Wallet } from "lucide-react";
import { useState } from "react";

interface InvestmentResult {
  success: boolean;
  investment: {
    id: string;
    amount: number;
    amountETH: string;
    txHash: string;
    status: string;
    poolId: string;
    poolName: string;
    poolAddress: string;
    createdAt: string;
  };
  pool: {
    id: string;
    name: string;
    totalContribution: number;
    updatedAt: string;
  };
}

export default function TestInvestPage() {
  const { user, isLoading } = useConditionalWallet();
  const { pools, loading: poolsLoading, refetch: refetchPools } = useMyPools();
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInvest = async () => {
    if (!selectedPoolId || !amount) {
      setError("Please select a pool and enter an amount");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/pool/invest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poolId: selectedPoolId,
          amount: numAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to invest");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <ChatSidebar />
        <div className="flex-1 flex items-center justify-center ml-[280px]">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen bg-gray-50">
        <ChatSidebar />
        <div className="flex-1 flex items-center justify-center ml-[280px]">
          <div className="text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 mb-4">
              You need to be logged in to test investments.
            </p>
            <Button
              onClick={() => (window.location.href = "/")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <ChatSidebar />

      <div className="flex-1 flex flex-col overflow-hidden ml-[280px]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Test Investment
              </h1>
              <p className="text-sm text-gray-600">
                Test the investment API route with your pools
              </p>
            </div>
            <Button
              onClick={refetchPools}
              disabled={poolsLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${poolsLoading ? "animate-spin" : ""}`}
              />
              Refresh Pools
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Investment Form */}
            <Card>
              <CardHeader>
                <CardTitle>Investment Form</CardTitle>
                <CardDescription>
                  Select a pool and enter the amount to invest
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="pool">Select Pool</Label>
                  <select
                    id="pool"
                    value={selectedPoolId}
                    onChange={(e) => setSelectedPoolId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Choose a pool...</option>
                    {pools.map((pool) => (
                      <option key={pool.id} value={pool.id}>
                        {pool.name} -{" "}
                        {pool.poolAddress
                          ? formatAddress(pool.poolAddress)
                          : "No address"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="amount">Investment Amount (ETH)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.001"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleInvest}
                    disabled={loading || !selectedPoolId || !amount}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Invest
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPoolId("");
                      setAmount("");
                      setResult(null);
                      setError(null);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Result Display */}
            {result && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <ArrowRight className="h-5 w-5" />
                    Investment Successful
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Your investment has been processed successfully
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Investment Details */}
                  <div>
                    <h3 className="text-sm font-medium text-green-800 mb-2">
                      Investment Details
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Amount:</span>
                        <span className="font-medium">
                          {result.investment.amountETH} ETH
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Status:</span>
                        <Badge variant="default" className="bg-green-600">
                          {result.investment.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Pool:</span>
                        <span className="font-medium">
                          {result.investment.poolName}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">
                          Transaction Hash:
                        </span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-green-100 px-2 py-1 rounded">
                            {formatAddress(result.investment.txHash)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(result.investment.txHash)
                            }
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Created:</span>
                        <span>{formatDate(result.investment.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pool Update */}
                  <div>
                    <h3 className="text-sm font-medium text-green-800 mb-2">
                      Pool Updated
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">
                          New Total Contribution:
                        </span>
                        <span className="font-medium">
                          {result.pool.totalContribution} ETH
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Updated:</span>
                        <span>{formatDate(result.pool.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="pt-4 border-t border-green-200">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `https://sepolia.etherscan.io/tx/${result.investment.txHash}`,
                            "_blank"
                          )
                        }
                        className="text-green-700 border-green-300 hover:bg-green-100"
                      >
                        View on Etherscan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => (window.location.href = "/my-pools")}
                        className="text-green-700 border-green-300 hover:bg-green-100"
                      >
                        View My Pools
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Available Pools */}
            {pools.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Pools</CardTitle>
                  <CardDescription>
                    Available pools for investment testing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pools.map((pool) => (
                      <div
                        key={pool.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{pool.name}</div>
                          <div className="text-sm text-gray-600">
                            {pool.poolAddress
                              ? formatAddress(pool.poolAddress)
                              : "No address"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Pool</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPoolId(pool.id)}
                            disabled={selectedPoolId === pool.id}
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Pools Message */}
            {!poolsLoading && pools.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Pools Available
                  </h3>
                  <p className="text-gray-600 mb-4">
                    You need to create pools first before testing investments.
                  </p>
                  <Button onClick={() => (window.location.href = "/test-pool")}>
                    Create Test Pool
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
