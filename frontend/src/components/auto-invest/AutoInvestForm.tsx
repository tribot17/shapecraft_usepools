"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConditionalWallet } from "@/hooks/useConditionalWallet";
import { useWeb3 } from "@/hooks/useWeb3";
import { useCallback, useEffect, useState } from "react";

interface AutoInvestFormData {
  name: string;
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
}

interface AutoInvestFormProps {
  initialData?: Partial<AutoInvestFormData & { id: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AutoInvestForm({
  initialData,
  onSuccess,
  onCancel,
}: AutoInvestFormProps) {
  const { getBalance, chainId } = useWeb3();
  const { user } = useConditionalWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);

  const [formData, setFormData] = useState<AutoInvestFormData>({
    name: initialData?.name || "",
    maxBuyPrice: initialData?.maxBuyPrice,
    minSellPrice: initialData?.minSellPrice,
    maxCreatorFee: initialData?.maxCreatorFee,
    allowedCollections: initialData?.allowedCollections || [],
    poolTypes: initialData?.poolTypes || [],
    chains: initialData?.chains || [360, 11011], // Shape Mainnet, Shape Sepolia
    investmentAmount: initialData?.investmentAmount || 0,
    maxInvestmentPerDay: initialData?.maxInvestmentPerDay,
    walletId: initialData?.walletId || "",
    minPoolAge: initialData?.minPoolAge,
    requireVerifiedCreator: initialData?.requireVerifiedCreator || false,
  });

  const [collectionsInput, setCollectionsInput] = useState(
    initialData?.allowedCollections?.join("\n") || ""
  );

  const fetchWallets = useCallback(async () => {
    if (!user?.id) return;

    const managedWallet = user.managedWallets[0];

    if (managedWallet) {
      const balance = Number(await getBalance(managedWallet.address));
      setFormData((prev) => ({
        ...prev,
        walletId: managedWallet.id,
      }));
      setBalance(balance);
    }

    if (!managedWallet) return;
  }, [user?.id, user?.managedWallets, getBalance]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Parse collections from textarea
      const allowedCollections = collectionsInput
        .split("\n")
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      const payload = {
        ...formData,
        allowedCollections,
      };

      const url = initialData?.id
        ? `/api/auto-invest/${initialData.id}`
        : "/api/auto-invest";

      const method = initialData?.id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save rule");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof AutoInvestFormData,
    value: string | number | boolean | string[] | number[] | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const togglePoolType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      poolTypes: prev.poolTypes.includes(type)
        ? prev.poolTypes.filter((t) => t !== type)
        : [...prev.poolTypes, type],
    }));
  };

  const toggleChain = (chainId: number) => {
    setFormData((prev) => ({
      ...prev,
      chains: prev.chains.includes(chainId)
        ? prev.chains.filter((c) => c !== chainId)
        : [...prev.chains, chainId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div>
          <Label htmlFor="name">Rule Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="e.g., High Volume NFTs"
            required
          />
        </div>

        {/* <div>
          <Label htmlFor="wallet">Investment Wallet *</Label>
          <select
            id="wallet"
            value={formData.walletId}
            onChange={(e) => handleInputChange("walletId", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="">Select wallet</option>
            {wallets && (
              <option key={wallets?.id} value={wallets?.id}>
                {wallets.name ||
                  `${wallets.address.slice(0, 6)}...${wallets.address.slice(
                    -4
                  )}`}
              </option>
            )}
          </select>
        </div> */}

        <div>
          <Label htmlFor="investmentAmount">Investment Amount (ETH) *</Label>
          <Input
            id="investmentAmount"
            type="number"
            step="0.00000005"
            min="0"
            value={formData.investmentAmount}
            onChange={(e) =>
              handleInputChange(
                "investmentAmount",
                parseFloat(e.target.value) || 0
              )
            }
            placeholder="0.1"
            required
          />
          {formData.walletId && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-2">
                Available balances:
              </p>
              <div className="space-y-2">
                <div className="space-y-2">
                  <div key={chainId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">
                        {balance.toFixed(4)} ETH
                      </span>
                    </div>
                    {balance > 0 && (
                      <div className="flex gap-1">
                        {[5, 10, 25, 50].map((percentage) => {
                          const amount = (balance * percentage) / 100;
                          return (
                            <Button
                              key={percentage}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() =>
                                handleInputChange("investmentAmount", amount)
                              }
                            >
                              {percentage}% ({amount.toFixed(4)})
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="maxInvestmentPerDay">
            Max Investment Per Day (ETH)
          </Label>
          <Input
            id="maxInvestmentPerDay"
            type="number"
            step="0.001"
            min="0"
            value={formData.maxInvestmentPerDay || ""}
            onChange={(e) =>
              handleInputChange(
                "maxInvestmentPerDay",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            placeholder="Optional daily limit"
          />
        </div>
      </div>

      {/* Investment Criteria */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Investment Criteria</h3>

        <div>
          <Label htmlFor="maxBuyPrice">Max Buy Price (ETH)</Label>
          <Input
            id="maxBuyPrice"
            type="number"
            step="0.001"
            min="0"
            value={formData.maxBuyPrice || ""}
            onChange={(e) =>
              handleInputChange(
                "maxBuyPrice",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            placeholder="e.g., 2.0"
          />
        </div>

        <div>
          <Label htmlFor="minSellPrice">Min Sell Price (ETH)</Label>
          <Input
            id="minSellPrice"
            type="number"
            step="0.001"
            min="0"
            value={formData.minSellPrice || ""}
            onChange={(e) =>
              handleInputChange(
                "minSellPrice",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            placeholder="e.g., 1.0"
          />
        </div>

        <div>
          <Label htmlFor="maxCreatorFee">Max Creator Fee (%)</Label>
          <Input
            id="maxCreatorFee"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={formData.maxCreatorFee || ""}
            onChange={(e) =>
              handleInputChange(
                "maxCreatorFee",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            placeholder="e.g., 5.0"
          />
        </div>

        <div>
          <Label htmlFor="minPoolAge">Min Pool Age (minutes)</Label>
          <Input
            id="minPoolAge"
            type="number"
            min="0"
            value={formData.minPoolAge || ""}
            onChange={(e) =>
              handleInputChange(
                "minPoolAge",
                e.target.value ? parseInt(e.target.value) : undefined
              )
            }
            placeholder="e.g., 60"
          />
        </div>
      </div>

      {/* Pool Types */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pool Types</h3>
        <div className="flex flex-wrap gap-2">
          {["TOKEN", "COLLECTION"].map((type) => (
            <Button
              key={type}
              type="button"
              variant={
                formData.poolTypes.includes(type) ? "default" : "outline"
              }
              size="sm"
              onClick={() => togglePoolType(type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Chains */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Supported Chains</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 360, name: "Shape Mainnet" },
            { id: 11011, name: "Shape Sepolia" },
          ].map((chain) => (
            <Button
              key={chain.id}
              type="button"
              variant={
                formData.chains.includes(chain.id) ? "default" : "outline"
              }
              size="sm"
              onClick={() => toggleChain(chain.id)}
            >
              {chain.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Allowed Collections */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Allowed Collections (Optional)
        </h3>
        <div>
          <Label htmlFor="allowedCollections">NFT Collection Addresses</Label>
          <Textarea
            id="allowedCollections"
            value={collectionsInput}
            onChange={(e) => setCollectionsInput(e.target.value)}
            placeholder="0x1234...&#10;0x5678...&#10;(one address per line, leave empty for all collections)"
            rows={4}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave empty to invest in any collection. Enter one contract address
            per line to restrict to specific collections.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-3">
        <Button
          type="submit"
          disabled={loading || !formData.name || !formData.walletId}
        >
          {loading
            ? "Saving..."
            : initialData?.id
            ? "Update Rule"
            : "Create Rule"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
