import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

interface Pool {
  id: string;
  name: string;
  nftCollectionAddress: string;
  poolAddress: string;
  creatorFee: number;
  buyPrice: number;
  sellPrice: number;
  totalContribution: number;
  createdAt: string;
  updatedAt: string;
}

export const useMyPools = () => {
  const { data: session, status } = useSession();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  const fetchPoolsCallback = useCallback(async () => {
    if (!session?.user?.walletAddress) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/pools/my-pools");

      if (!response.ok) {
        throw new Error("Failed to fetch pools");
      }

      const data = await response.json();
      setPools(data.pools || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPools([]);
    } finally {
      setLoading(false);
      setHasChecked(true);
    }
  }, [session?.user?.walletAddress]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.walletAddress) {
      fetchPoolsCallback();
    } else if (status === "unauthenticated") {
      setHasChecked(true);
      setPools([]);
    }
  }, [session, status, fetchPoolsCallback]);

  return {
    pools,
    loading,
    error,
    hasChecked,
    refetch: fetchPoolsCallback,
    hasPools: pools.length > 0,
    poolCount: pools.length,
  };
};
