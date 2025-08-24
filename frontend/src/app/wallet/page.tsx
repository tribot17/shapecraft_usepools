"use client";

import ChatSidebar from "@/components/chat/ChatSidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DepositModal } from "@/components/wallet/DepositModal";
import { WithdrawModal } from "@/components/wallet/WithdrawModal";
import { useConditionalWallet } from "@/hooks/useConditionalWallet";
import { useWeb3 } from "@/hooks/useWeb3";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface WalletBalance {
  walletId: string;
  chainId: number;
  balance: string;
  balanceETH: string;
  lastSyncedAt: string;
}

interface NetworkBalance {
  chainId: number;
  name: string;
  balance: string;
  isLoading: boolean;
}

interface ManagedWallet {
  id: string;
  walletId: string;
  address: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  balances: WalletBalance[];
  _count: {
    transactions: number;
  };
}

// Supported networks
const SUPPORTED_NETWORKS = [
  { chainId: 360, name: "Shape Mainnet" },
  { chainId: 11011, name: "Shape Sepolia" },
];

function WalletPageContent() {
  const router = useRouter();
  const { user, requiresWallet } = useConditionalWallet();
  const { getBalance } = useWeb3();
  const [wallets, setWallets] = useState<ManagedWallet[]>([]);
  const [wallet, setWallet] = useState<ManagedWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newWalletName, setNewWalletName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState(360);
  const [networkBalances, setNetworkBalances] = useState<NetworkBalance[]>(
    SUPPORTED_NETWORKS.map((network) => ({
      ...network,
      balance: "0.0",
      isLoading: false,
    }))
  );

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const fetchWallets = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/wallets?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setWallets(data);
        // Always use the first (and only) wallet
        if (data.length > 0) {
          setWallet(data[0]);
        }
      } else {
        setError("Error loading wallets");
      }
    } catch (err) {
      console.error("Error fetching wallets:", err);
      setError("Network error while loading");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchWallets();
    }
  }, [user?.id, fetchWallets]);

  const fetchNetworkBalance = useCallback(
    async (chainId: number, walletAddress: string) => {
      setNetworkBalances((prev) =>
        prev.map((nb) =>
          nb.chainId === chainId ? { ...nb, isLoading: true } : nb
        )
      );

      try {
        const balance = await getBalance(walletAddress, chainId);
        console.log("🚀 ~ WalletPageContent ~ balance:", balance);
        setNetworkBalances((prev) =>
          prev.map((nb) =>
            nb.chainId === chainId
              ? { ...nb, balance: balance.toString(), isLoading: false }
              : nb
          )
        );
      } catch (error) {
        console.error(`Error fetching balance for chain ${chainId}:`, error);
        setNetworkBalances((prev) =>
          prev.map((nb) =>
            nb.chainId === chainId
              ? { ...nb, balance: "Error", isLoading: false }
              : nb
          )
        );
      }
    },
    [getBalance]
  );

  // Fetch balances for all networks when wallet is loaded
  useEffect(() => {
    if (wallet?.address) {
      SUPPORTED_NETWORKS.forEach((network) => {
        fetchNetworkBalance(network.chainId, wallet.address);
      });
    }
  }, [wallet?.address, fetchNetworkBalance]);

  const createWallet = async () => {
    if (!user?.id) return;

    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: newWalletName || "My Wallet",
        }),
      });

      if (response.ok) {
        const newWallet = await response.json();
        setWallets((prev) => [newWallet, ...prev]);
        setWallet(newWallet); // Set as the single wallet
        setNewWalletName("");
        setIsCreateDialogOpen(false);
      } else {
        setError("Error creating wallet");
      }
    } catch (err) {
      console.error("Error creating wallet:", err);
      setError("Network error while creating");
    } finally {
      setCreating(false);
    }
  };

  const refreshNetworkBalance = async (chainId: number) => {
    if (!wallet?.address) return;
    await fetchNetworkBalance(chainId, wallet.address);
  };

  const handleNetworkChange = (networkId: string) => {
    const chainId = parseInt(networkId);
    setSelectedNetwork(chainId);
    if (wallet?.address) {
      fetchNetworkBalance(chainId, wallet.address);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleTransactionComplete = () => {
    if (wallet?.address) {
      fetchNetworkBalance(selectedNetwork, wallet.address);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#141414]">
        <ChatSidebar />
        <main className="flex-1 ml-[280px] flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </main>
      </div>
    );
  }

  const currentNetworkBalance = networkBalances.find(
    (nb) => nb.chainId === selectedNetwork
  );

  if (requiresWallet && !user) {
    return (
      <div className="flex min-h-screen bg-[#141414]">
        <ChatSidebar />
        <main className="flex-1 ml-[280px] flex items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                User not found
              </CardTitle>
              <CardDescription>Your user account was not found</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/")}>Back to home</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#141414]">
      <ChatSidebar />
      <main className="flex-1 ml-[280px]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Wallets</h1>
              <p className="text-white/60">
                Manage your wallets and check your balances
              </p>
            </div>

            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  className="flex items-center gap-2"
                  disabled={wallets.length > 0}
                >
                  <Plus className="h-4 w-4" />
                  {wallets.length > 0 ? "Wallet already exists" : "New Wallet"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a new wallet</DialogTitle>
                  <DialogDescription>
                    A new wallet will be automatically generated with a unique
                    address.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="walletName">Wallet name</Label>
                    <Input
                      id="walletName"
                      value={newWalletName}
                      onChange={(e) => setNewWalletName(e.target.value)}
                      placeholder="My Trading Wallet"
                    />
                  </div>
                  <Button
                    onClick={createWallet}
                    disabled={creating}
                    className="w-full"
                  >
                    {creating ? "Creating..." : "Create wallet"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {error && (
            <Alert className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!wallet ? (
            <Card className="text-center py-12">
              <CardContent>
                <Wallet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No wallet found</h3>
                <p className="text-muted-foreground mb-6">
                  Create your wallet to start managing your funds
                </p>
                <Dialog
                  open={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create my wallet
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Network Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Network Selection</CardTitle>
                  <CardDescription>
                    Choose a network to view your wallet balance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="network-select">Network</Label>
                      <Select
                        value={selectedNetwork.toString()}
                        onValueChange={handleNetworkChange}
                      >
                        <SelectTrigger id="network-select">
                          <SelectValue placeholder="Select a network" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_NETWORKS.map((network) => (
                            <SelectItem
                              key={network.chainId}
                              value={network.chainId.toString()}
                            >
                              {network.name} (Chain ID: {network.chainId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-right">
                      <Label>Balance</Label>
                      <div className="text-lg font-semibold">
                        {currentNetworkBalance?.isLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin inline" />
                        ) : (
                          `${currentNetworkBalance?.balance || "0.0"} ETH`
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Details */}
              <div>
                <div className="space-y-6">
                  {/* Wallet Info */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5" />
                            {wallet.name}
                          </CardTitle>
                          <CardDescription>
                            Created on{" "}
                            {new Date(wallet.createdAt).toLocaleDateString(
                              "en-US"
                            )}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refreshNetworkBalance(selectedNetwork)}
                          disabled={currentNetworkBalance?.isLoading}
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${
                              currentNetworkBalance?.isLoading
                                ? "animate-spin"
                                : ""
                            }`}
                          />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Address</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-secondary/50 px-3 py-2 rounded text-sm flex-1">
                            {wallet.address}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(wallet.address)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{currentNetworkBalance?.name} Balance</Label>
                          <div className="text-2xl font-bold mt-1">
                            {currentNetworkBalance?.isLoading ? (
                              <RefreshCw className="h-6 w-6 animate-spin" />
                            ) : (
                              `${currentNetworkBalance?.balance || "0.0"} ETH`
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Network: {currentNetworkBalance?.name}
                          </div>
                        </div>
                        <div>
                          <Label>Transactions</Label>
                          <div className="text-2xl font-bold mt-1">
                            {wallet._count.transactions}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total transactions
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card
                      className="text-center p-6 hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => setIsDepositModalOpen(true)}
                    >
                      <ArrowDown className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <h3 className="font-medium">Deposit</h3>
                      <p className="text-sm text-muted-foreground">
                        Receive funds
                      </p>
                    </Card>

                    <Card
                      className="text-center p-6 hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => setIsWithdrawModalOpen(true)}
                    >
                      <ArrowUp className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <h3 className="font-medium">Withdraw</h3>
                      <p className="text-sm text-muted-foreground">
                        Send funds
                      </p>
                    </Card>

                    {/* <Card className="text-center p-6 hover:bg-secondary/50 cursor-pointer transition-colors">
                        <History className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                        <h3 className="font-medium">History</h3>
                        <p className="text-sm text-muted-foreground">
                          View transactions
                        </p>
                      </Card> */}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modals */}
          {wallet && (
            <>
              <DepositModal
                isOpen={isDepositModalOpen}
                onClose={() => setIsDepositModalOpen(false)}
                walletAddress={wallet.address}
                networkName={currentNetworkBalance?.name || "Unknown"}
                currentBalance={currentNetworkBalance?.balance || "0.0"}
              />

              <WithdrawModal
                isOpen={isWithdrawModalOpen}
                onClose={() => setIsWithdrawModalOpen(false)}
                networkName={currentNetworkBalance?.name || "Unknown"}
                networkChainId={selectedNetwork}
                currentBalance={currentNetworkBalance?.balance || "0.0"}
                walletId={wallet.walletId}
                onTransactionComplete={handleTransactionComplete}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function WalletPage() {
  return <WalletPageContent />;
}
