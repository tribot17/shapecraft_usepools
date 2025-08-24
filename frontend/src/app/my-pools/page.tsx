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
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Pool {
  id: string;
  name: string;
  nftCollectionAddress: string;
  poolAddress: string;
  creatorFee: number;
  buyPrice: string;
  sellPrice: string;
  totalContribution: number;
  createdAt: string;
  updatedAt: string;
}

export default function MyPoolsPage() {
  const { user, isLoading } = useConditionalWallet();
  const router = useRouter();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchMyPools();
    } else if (!isLoading && !user) {
      setLoading(false);
    }
  }, [user, isLoading]);

  const fetchMyPools = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/pools/my-pools");

      if (!response.ok) {
        throw new Error("Failed to fetch pools");
      }

      const data = await response.json();
      setPools(data.pools || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const formatEther = (wei: number) => {
    return (wei / 1e18).toFixed(4);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderContent = () => {
    if (isLoading || loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading your pools...</p>
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
              You need to be logged in to view your pools.
            </p>
            <Button
              onClick={() => router.push("/")}
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
            <Button onClick={fetchMyPools} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    if (pools.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🏊</div>
            <CardTitle className="mb-2">No Pools Created Yet</CardTitle>
            <CardDescription className="mb-6">
              Create your first pool to start building your investment
              community.
            </CardDescription>
            <div className="space-x-2">
              <Button asChild>
                <Link href="/test-pool">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Pool
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/test-usepools">Test UsePools Integration</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pools</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pools.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Contributions
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pools
                  .reduce((sum, pool) => sum + pool.totalContribution, 0)
                  .toFixed(2)}{" "}
                ETH
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Creator Fee
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(
                  pools.reduce((sum, pool) => sum + pool.creatorFee, 0) /
                  pools.length
                ).toFixed(1)}
                %
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pools Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pools.map((pool) => (
            <Card key={pool.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{pool.name}</CardTitle>
                    <CardDescription>
                      Created {formatDate(pool.createdAt)}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pool Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pool Address:</span>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {formatAddress(pool.poolAddress)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(pool.poolAddress)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Collection:</span>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {formatAddress(pool.nftCollectionAddress)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(pool.nftCollectionAddress)
                        }
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Creator Fee:</span>
                    <Badge variant="outline">{pool.creatorFee}%</Badge>
                  </div>
                </div>

                {/* Price Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xs text-green-700 mb-1">Buy Price</div>
                    <div className="text-sm font-semibold text-green-800">
                      {formatEther(Number(pool.buyPrice))} ETH
                    </div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-xs text-red-700 mb-1">Sell Price</div>
                    <div className="text-sm font-semibold text-red-800">
                      {formatEther(Number(pool.sellPrice))} ETH
                    </div>
                  </div>
                </div>

                {/* Contribution */}
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    Total Contributions
                  </div>
                  <div className="text-sm font-semibold">
                    {pool.totalContribution} ETH
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your pools and create new ones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Button asChild>
                <Link href="/test-pool">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Pool
                </Link>
              </Button>
              <Button variant="outline" onClick={fetchMyPools}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-50">
      <ChatSidebar />

      <div className="flex flex-col overflow-hidden ml-[280px] h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Pools</h1>
              <p className="text-sm text-gray-600">
                Manage and monitor your created pools
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
