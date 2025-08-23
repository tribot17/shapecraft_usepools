"use client";

import { useWeb3 } from "@/lib/hooks/useWeb3";
import { WalletRequest } from "@/lib/requests/Wallet";
import { useAuth } from "@/providers/AuthProvider";
import { ManagedWallet } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

export function WalletManager() {
  const { user, userLoading, fetchUser } = useAuth();
  const {
    getBalance,
    sendTransaction,
    chainId,
    isLoading: transactionLoading,
  } = useWeb3();
  const [wallets, setWallets] = useState<ManagedWallet[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [loadingBalances, setLoadingBalances] = useState<
    Record<string, boolean>
  >({});
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  const fetchBalance = useCallback(async (walletAddress: string) => {
    setLoadingBalances((prev) => ({ ...prev, [walletAddress]: true }));

    try {
      const balance = await getBalance(walletAddress);
      console.log("🚀 ~ WalletManager ~ balance:", balance);
      setBalances((prev) => ({ ...prev, [walletAddress]: balance }));
    } catch (error) {
      console.error(`Error fetching balance for ${walletAddress}:`, error);
      setBalances((prev) => ({ ...prev, [walletAddress]: "Error" }));
    } finally {
      setLoadingBalances((prev) => ({ ...prev, [walletAddress]: false }));
    }
  }, []);

  useEffect(() => {
    if (user && !userLoading) setWallets(user.managedWallets);
  }, [user, userLoading]);

  useEffect(() => {
    if (wallets.length > 0) {
      wallets.forEach((wallet) => {
        fetchBalance(wallet.address);
      });
    }
  }, [wallets, fetchBalance]);

  if (!user) return null;

  const handleCreateWallet = async () => {
    const wallet = await WalletRequest.createWallet(user.id);

    fetchUser(wallet.address);
  };

  const handleViewDetails = (walletId: string) => {
    setSelectedWalletId(walletId);
  };

  const handleDeposit = async (walletAddress: string) => {
    const result = await sendTransaction(walletAddress, depositAmount);
    console.log("🚀 ~ handleDeposit ~ result:", result);

    if (result.success) {
      fetchBalance(walletAddress);
    }
  };

  const handleWithdraw = async (walletAddress: string, walletId: string) => {
    console.log("🚀 ~ handleWithdraw ~ walletId:", walletId);
    const result = await WalletRequest.withdraw({
      amount: depositAmount,
      walletId,
      to: walletAddress,
    });

    if (result.success) {
      fetchBalance(walletAddress);
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Managed Wallets</h2>

          {/* Wallet list */}
          <div className="space-y-4">
            {wallets.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  No wallets found. Create your first wallet above.
                </p>
                <button
                  onClick={handleCreateWallet}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Wallet
                </button>
              </div>
            ) : (
              wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                    wallet.isActive ? "border-green-500" : "border-red-500"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-black">
                        {wallet.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 font-mono">
                        {wallet.address}
                      </p>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>
                          Created{" "}
                          {new Date(wallet.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                          Balance:{" "}
                          {loadingBalances[wallet.address]
                            ? "Loading..."
                            : balances[wallet.address] || "0"}{" "}
                          ETH
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeposit(wallet.address)}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Deposit
                        </button>
                        <button
                          onClick={() =>
                            handleWithdraw(wallet.address, wallet.walletId)
                          }
                          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Withdraw
                        </button>
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="px-4 py-2 text-sm bg-gray-200 text-black rounded-lg"
                        />
                        {transactionLoading && (
                          <div className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">
                            Loading...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchBalance(wallet.address)}
                        disabled={loadingBalances[wallet.address]}
                        className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                        title="Refresh balance"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => handleViewDetails(wallet.id)}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
