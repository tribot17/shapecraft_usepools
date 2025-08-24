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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConditionalWallet } from "@/hooks/useConditionalWallet";
import {
  Copy,
  ExternalLink,
  RefreshCw,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";

interface Pool {
  id: string;
  usepools_id?: string;
  name: string;
  poolAddress: string;
  nftCollectionAddress: string;
  poolType: string;
  status: string;
  chainId: number;
  buyPriceETH: string;
  sellPriceETH: string;
  creatorFee: number;
  totalContribution: number;
  createdAt: string;
  creator: {
    walletAddress: string;
    name?: string;
  };
  stats: {
    totalParticipants: number;
    totalTransactions: number;
  };
}

interface SearchFilters {
  poolAddress: string;
  nftCollection: string;
  creatorAddress: string;
  name: string;
  chainId: string;
  poolType: string;
  status: string;
  minPrice: string;
  maxPrice: string;
}

export default function TestPoolSearchPage() {
  const { user, isLoading } = useConditionalWallet();
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<{
    id: string;
    name: string;
    poolAddress: string;
    nftCollectionAddress: string;
    poolType: string;
    status: string;
    chainId: number;
    totalContribution: number;
    stats: {
      totalParticipants: number;
      totalTransactions: number;
      totalAutoInvestments: number;
      priceRange: {
        buyPriceETH: string;
        sellPriceETH: string;
        spread: string;
        spreadPercentage: string;
      };
    };
    participants: Array<{
      id: string;
      contributionETH: string;
      user: {
        walletAddress: string;
        name?: string;
      };
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<"search" | "specific">("search");

  const [filters, setFilters] = useState<SearchFilters>({
    poolAddress: "",
    nftCollection: "",
    creatorAddress: "",
    name: "",
    chainId: "",
    poolType: "",
    status: "",
    minPrice: "",
    maxPrice: "",
  });

  const [specificIdentifier, setSpecificIdentifier] = useState("");

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const searchPools = async () => {
    setLoading(true);
    setError(null);
    setPools([]);
    setSelectedPool(null);

    try {
      const params = new URLSearchParams();
      
      // Add non-empty filters to search params
      Object.entries(filters).forEach(([key, value]) => {
        if (value.trim()) {
          params.append(key, value.trim());
        }
      });

      const response = await fetch(`/api/pools/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to search pools");
      }

      const data = await response.json();
      setPools(data.pools || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getSpecificPool = async () => {
    if (!specificIdentifier.trim()) {
      setError("Please enter a pool ID or address");
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedPool(null);

    try {
      const response = await fetch(`/api/pools/${encodeURIComponent(specificIdentifier.trim())}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Pool not found");
        }
        throw new Error("Failed to fetch pool");
      }

      const data = await response.json();
      setSelectedPool(data.pool);
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
              You need to be logged in to search pools.
            </p>
            <Button onClick={() => window.location.href = "/"} className="bg-blue-600 hover:bg-blue-700">
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
              <h1 className="text-2xl font-bold text-gray-900">Pool Search</h1>
              <p className="text-sm text-gray-600">
                Search and explore pools by various criteria
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={searchType === "search" ? "default" : "outline"}
                onClick={() => setSearchType("search")}
                size="sm"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button
                variant={searchType === "specific" ? "default" : "outline"}
                onClick={() => setSearchType("specific")}
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Get Specific
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Search/Get Forms */}
            {searchType === "search" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Search Pools</CardTitle>
                  <CardDescription>
                    Use filters to find pools matching your criteria
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="poolAddress">Pool Address</Label>
                      <Input
                        id="poolAddress"
                        value={filters.poolAddress}
                        onChange={(e) => handleFilterChange("poolAddress", e.target.value)}
                        placeholder="0x..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="nftCollection">NFT Collection</Label>
                      <Input
                        id="nftCollection"
                        value={filters.nftCollection}
                        onChange={(e) => handleFilterChange("nftCollection", e.target.value)}
                        placeholder="0x..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="creatorAddress">Creator Address</Label>
                      <Input
                        id="creatorAddress"
                        value={filters.creatorAddress}
                        onChange={(e) => handleFilterChange("creatorAddress", e.target.value)}
                        placeholder="0x..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Pool Name</Label>
                      <Input
                        id="name"
                        value={filters.name}
                        onChange={(e) => handleFilterChange("name", e.target.value)}
                        placeholder="Search by name..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="chainId">Chain ID</Label>
                      <Select value={filters.chainId} onValueChange={(value) => handleFilterChange("chainId", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any chain" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any chain</SelectItem>
                          <SelectItem value="360">Shape Mainnet (360)</SelectItem>
                          <SelectItem value="11011">Shape Sepolia (11011)</SelectItem>
                          <SelectItem value="1">Ethereum (1)</SelectItem>
                          <SelectItem value="137">Polygon (137)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="poolType">Pool Type</Label>
                      <Select value={filters.poolType} onValueChange={(value) => handleFilterChange("poolType", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any type</SelectItem>
                          <SelectItem value="TOKEN">Token</SelectItem>
                          <SelectItem value="COLLECTION">Collection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any status</SelectItem>
                          <SelectItem value="FUNDING">Funding</SelectItem>
                          <SelectItem value="OFFER">Offer</SelectItem>
                          <SelectItem value="LISTING">Listing</SelectItem>
                          <SelectItem value="SOLD">Sold</SelectItem>
                          <SelectItem value="PAUSED">Paused</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="minPrice">Min Price (ETH)</Label>
                      <Input
                        id="minPrice"
                        type="number"
                        step="0.001"
                        value={filters.minPrice}
                        onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPrice">Max Price (ETH)</Label>
                      <Input
                        id="maxPrice"
                        type="number"
                        step="0.001"
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                        placeholder="10.0"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={searchPools} disabled={loading}>
                      {loading ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Search Pools
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setFilters({
                        poolAddress: "",
                        nftCollection: "",
                        creatorAddress: "",
                        name: "",
                        chainId: "",
                        poolType: "",
                        status: "",
                        minPrice: "",
                        maxPrice: "",
                      })}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Get Specific Pool</CardTitle>
                  <CardDescription>
                    Enter a pool ID or pool address to get detailed information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="identifier">Pool ID or Address</Label>
                    <Input
                      id="identifier"
                      value={specificIdentifier}
                      onChange={(e) => setSpecificIdentifier(e.target.value)}
                      placeholder="Pool ID (cuid) or 0x... address"
                    />
                  </div>
                  <Button onClick={getSpecificPool} disabled={loading}>
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Get Pool Details
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Search Results */}
            {searchType === "search" && pools.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Search Results ({pools.length})</h2>
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
                          <Badge variant={pool.status === "FUNDING" ? "default" : "secondary"}>
                            {pool.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
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
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Collection:</span>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {formatAddress(pool.nftCollectionAddress)}
                            </code>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Creator:</span>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {formatAddress(pool.creator.walletAddress)}
                            </code>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-xs text-green-700 mb-1">Buy Price</div>
                            <div className="text-sm font-semibold text-green-800">
                              {pool.buyPriceETH} ETH
                            </div>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <div className="text-xs text-red-700 mb-1">Sell Price</div>
                            <div className="text-sm font-semibold text-red-800">
                              {pool.sellPriceETH} ETH
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{pool.stats.totalParticipants} participants</span>
                          </div>
                          <Badge variant="outline">
                            Chain {pool.chainId}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Specific Pool Details */}
            {searchType === "specific" && selectedPool && (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedPool.name}</CardTitle>
                  <CardDescription>
                    Detailed pool information and statistics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Pool Details</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID:</span>
                          <span className="font-mono">{selectedPool.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <Badge variant="outline">{selectedPool.poolType}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={selectedPool.status === "FUNDING" ? "default" : "secondary"}>
                            {selectedPool.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Chain:</span>
                          <span>{selectedPool.chainId}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Statistics</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Participants:</span>
                          <span>{selectedPool.stats.totalParticipants}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transactions:</span>
                          <span>{selectedPool.stats.totalTransactions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Auto Investments:</span>
                          <span>{selectedPool.stats.totalAutoInvestments}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Contribution:</span>
                          <span>{selectedPool.totalContribution} ETH</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price Information */}
                  <div>
                    <div className="text-sm font-medium mb-2">Price Information</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-xs text-green-700 mb-1">Buy Price</div>
                        <div className="text-sm font-semibold text-green-800">
                          {selectedPool.stats.priceRange.buyPriceETH} ETH
                        </div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-xs text-red-700 mb-1">Sell Price</div>
                        <div className="text-sm font-semibold text-red-800">
                          {selectedPool.stats.priceRange.sellPriceETH} ETH
                        </div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-700 mb-1">Spread</div>
                        <div className="text-sm font-semibold text-blue-800">
                          {selectedPool.stats.priceRange.spread} ETH
                        </div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-xs text-purple-700 mb-1">Spread %</div>
                        <div className="text-sm font-semibold text-purple-800">
                          {selectedPool.stats.priceRange.spreadPercentage}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Participants */}
                  {selectedPool.participants.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Recent Participants</div>
                      <div className="space-y-2">
                        {selectedPool.participants.slice(0, 5).map((participant) => (
                          <div key={participant.id} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex items-center gap-2">
                              <code className="text-xs">
                                {formatAddress(participant.user.walletAddress)}
                              </code>
                              {participant.user.name && (
                                <span className="text-sm text-muted-foreground">
                                  ({participant.user.name})
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-medium">
                              {participant.contributionETH} ETH
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
