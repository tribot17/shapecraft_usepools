"use client";

import { useWallet } from "@/lib/hooks/useWallets";
import type { WalletWithBalance } from "@/lib/services/wallet";
import { useState } from "react";

interface WalletSelectorProps {
  wallets: WalletWithBalance[];
  selectedWallet: string;
  onWalletSelect: (walletId: string) => void;
  isLoading?: boolean;
}

export function WalletSelector({
  wallets,
  selectedWallet,
  onWalletSelect,
  isLoading,
}: WalletSelectorProps) {
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const { chainId } = useWallet(selectedWallet);
  console.log("🚀 ~ WalletSelector ~ chainId:", chainId);
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun wallet trouvé
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Créez votre premier wallet pour commencer
        </p>
        <button
          onClick={() => setShowCreateWallet(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Créer un wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {wallets.map((wallet) => {
        // Calculer la balance totale sur toutes les chaînes

        const isSelected = selectedWallet === wallet.walletId;

        return (
          <div
            key={wallet.id}
            onClick={() => onWalletSelect(wallet.walletId)}
            className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
              isSelected
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      isSelected
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">
                      {wallet.name || "Wallet sans nom"}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                    </p>
                  </div>
                </div>

                {/* Balances par chaîne */}
                <div className="mt-3 space-y-1">
                  {/* {wallet.balances.map((balance) => (
                    <div
                      key={balance.chainId}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600">
                        {balance.chainId === 360
                          ? "Shape Mainnet"
                          : "Shape Sepolia"}
                        :
                      </span>
                      <span className="font-medium text-gray-900">
                        {parseFloat(balance.balanceETH).toFixed(4)} ETH
                      </span>
                    </div>
                  ))} */}
                </div>
              </div>

              {isSelected && (
                <div className="ml-4">
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Bouton pour créer un nouveau wallet */}
      <button
        onClick={() => setShowCreateWallet(true)}
        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
      >
        <div className="flex items-center justify-center space-x-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span className="font-medium">Créer un nouveau wallet</span>
        </div>
      </button>

      {/* Modal de création de wallet (simple pour l'instant) */}
      {showCreateWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Créer un nouveau wallet
            </h3>
            <p className="text-gray-600 mb-6">
              Cette fonctionnalité sera bientôt disponible.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateWallet(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setShowCreateWallet(false);
                  // TODO: Implémenter la création de wallet
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
