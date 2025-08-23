"use client";

import { useState } from "react";
import { useWallets } from "@/lib/hooks/useWallets";

interface WalletManagerProps {
  userId: string;
}

export default function WalletManagerNew({ userId }: WalletManagerProps) {
  const [newWalletName, setNewWalletName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [transactionForm, setTransactionForm] = useState({
    to: "",
    value: "",
    gasPrice: "",
  });

  const {
    wallets,
    isLoading,
    createWallet,
    sendTransaction,
    estimateGas,
    signMessage,
    isCreatingWallet,
    isSendingTransaction,
    createWalletError,
    sendTransactionError,
    refetchWallets,
  } = useWallets(userId);

  const handleCreateWallet = async () => {
    if (!newWalletName.trim()) return;
    
    try {
      await createWallet({
        userId,
        name: newWalletName,
      });
      setNewWalletName("");
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create wallet:", error);
    }
  };

  const handleSendTransaction = async () => {
    if (!selectedWallet || !transactionForm.to || !transactionForm.value) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const result = await sendTransaction({
        walletId: selectedWallet,
        to: transactionForm.to,
        value: transactionForm.value,
        gasPrice: transactionForm.gasPrice || undefined,
      });
      
      alert(`Transaction sent! Hash: ${result.hash}`);
      setTransactionForm({ to: "", value: "", gasPrice: "" });
    } catch (error) {
      console.error("Failed to send transaction:", error);
    }
  };

  const handleEstimateGas = async () => {
    if (!selectedWallet || !transactionForm.to || !transactionForm.value) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const estimate = await estimateGas({
        walletId: selectedWallet,
        to: transactionForm.to,
        value: transactionForm.value,
      });
      
      alert(`Gas estimate: ${estimate.gasEstimate} (${estimate.gasPrice} gwei)`);
    } catch (error) {
      console.error("Failed to estimate gas:", error);
    }
  };

  const handleSignMessage = async () => {
    if (!selectedWallet) {
      alert("Please select a wallet");
      return;
    }

    const message = prompt("Enter message to sign:");
    if (!message) return;

    try {
      const signature = await signMessage(selectedWallet, message);
      alert(`Message signed! Signature: ${signature}`);
    } catch (error) {
      console.error("Failed to sign message:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Gestion des Wallets</h1>

      {/* Create Wallet Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Créer un nouveau wallet</h2>
        
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            + Nouveau Wallet
          </button>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nom du wallet (optionnel)"
              value={newWalletName}
              onChange={(e) => setNewWalletName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleCreateWallet}
                disabled={isCreatingWallet}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
              >
                {isCreatingWallet ? "Création..." : "Créer"}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewWalletName("");
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Annuler
              </button>
            </div>
            {createWalletError && (
              <p className="text-red-500 text-sm">{createWalletError.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Wallets List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Mes Wallets</h2>
          <button
            onClick={refetchWallets}
            className="text-blue-500 hover:text-blue-600 text-sm underline"
          >
            Actualiser
          </button>
        </div>

        {wallets.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Aucun wallet trouvé. Créez votre premier wallet !
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedWallet === wallet.walletId
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedWallet(wallet.walletId)}
              >
                <h3 className="font-medium text-gray-900">
                  {wallet.name || "Wallet sans nom"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                </p>
                <p className="text-lg font-semibold text-green-600 mt-2">
                  {parseFloat(wallet.balanceETH).toFixed(4)} ETH
                </p>
                <p className="text-xs text-gray-400">
                  Créé le {new Date(wallet.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Section */}
      {selectedWallet && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Envoyer une transaction</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse de destination
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={transactionForm.to}
                onChange={(e) =>
                  setTransactionForm({ ...transactionForm, to: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant (ETH)
              </label>
              <input
                type="number"
                step="0.0001"
                placeholder="0.0"
                value={transactionForm.value}
                onChange={(e) =>
                  setTransactionForm({ ...transactionForm, value: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gas Price (gwei) - Optionnel
              </label>
              <input
                type="number"
                placeholder="Auto"
                value={transactionForm.gasPrice}
                onChange={(e) =>
                  setTransactionForm({ ...transactionForm, gasPrice: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleEstimateGas}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Estimer Gas
              </button>
              <button
                onClick={handleSendTransaction}
                disabled={isSendingTransaction}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
              >
                {isSendingTransaction ? "Envoi..." : "Envoyer"}
              </button>
              <button
                onClick={handleSignMessage}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Signer Message
              </button>
            </div>

            {sendTransactionError && (
              <p className="text-red-500 text-sm">{sendTransactionError.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
