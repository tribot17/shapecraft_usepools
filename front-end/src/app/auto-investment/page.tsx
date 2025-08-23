"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/providers/AuthProvider";
import { PoolType } from "@prisma/client";
import { useEffect, useState } from "react";

interface AutoInvestmentRule {
  id: string;
  name: string;
  isActive: boolean;
  maxBuyPrice?: number;
  minSellPrice?: number;
  maxCreatorFee?: number;
  allowedCollections: string[];
  poolTypes: PoolType[];
  chains: number[];
  investmentAmount: number;
  maxInvestmentPerDay?: number;
  walletId: string;
  minPoolAge?: number;
  requireVerifiedCreator: boolean;
  totalInvested: number;
  totalInvestments: number;
  lastTriggered?: string;
  wallet: {
    id: string;
    name?: string;
    address: string;
  };
  _count: {
    investments: number;
  };
}

interface Wallet {
  id: string;
  walletId: string;
  name?: string;
  address: string;
}

export default function AutoInvestmentPage() {
  const { user } = useAuth();
  const [rules, setRules] = useState<AutoInvestmentRule[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [systemStats, setSystemStats] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    maxBuyPrice: "",
    minSellPrice: "",
    maxCreatorFee: "",
    allowedCollections: "",
    poolTypes: [] as PoolType[],
    chains: [360] as number[],
    investmentAmount: "",
    maxInvestmentPerDay: "",
    walletId: "",
    minPoolAge: "",
    requireVerifiedCreator: false,
  });

  useEffect(() => {
    if (user) {
      fetchRules();
      fetchWallets();
      fetchSystemStats();
    }
  }, [user]);

  const fetchRules = async () => {
    try {
      const response = await fetch("/api/auto-investment/rules");
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules);
      }
    } catch (error) {
      console.error("Error fetching rules:", error);
    }
  };

  const fetchWallets = async () => {
    try {
      const response = await fetch(`/api/wallets?userId=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setWallets(data.wallets);
      }
    } catch (error) {
      console.error("Error fetching wallets:", error);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await fetch("/api/auto-investment/system?action=status");
      if (response.ok) {
        const data = await response.json();
        setSystemStats(data);
      }
    } catch (error) {
      console.error("Error fetching system stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        maxBuyPrice: formData.maxBuyPrice
          ? parseFloat(formData.maxBuyPrice)
          : null,
        minSellPrice: formData.minSellPrice
          ? parseFloat(formData.minSellPrice)
          : null,
        maxCreatorFee: formData.maxCreatorFee
          ? parseFloat(formData.maxCreatorFee)
          : null,
        allowedCollections: formData.allowedCollections
          ? formData.allowedCollections.split(",").map((s) => s.trim())
          : [],
        investmentAmount: parseFloat(formData.investmentAmount),
        maxInvestmentPerDay: formData.maxInvestmentPerDay
          ? parseFloat(formData.maxInvestmentPerDay)
          : null,
        minPoolAge: formData.minPoolAge ? parseInt(formData.minPoolAge) : null,
      };

      const response = await fetch("/api/auto-investment/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setFormData({
          name: "",
          maxBuyPrice: "",
          minSellPrice: "",
          maxCreatorFee: "",
          allowedCollections: "",
          poolTypes: [],
          chains: [360],
          investmentAmount: "",
          maxInvestmentPerDay: "",
          walletId: "",
          minPoolAge: "",
          requireVerifiedCreator: false,
        });
        fetchRules();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating rule:", error);
      alert("Erreur lors de la création de la règle");
    }
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/auto-investment/rules/${ruleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error("Error toggling rule:", error);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette règle ?")) return;

    try {
      const response = await fetch(`/api/auto-investment/rules/${ruleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error("Error deleting rule:", error);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              🤖 Auto-Investment
            </h1>
            <p className="text-gray-600 mt-2">
              Configurez des règles pour investir automatiquement dans les pools
              qui correspondent à vos critères
            </p>
          </div>

          {/* System Status */}
          {systemStats && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                📊 Statut du Système
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {systemStats.autoInvestmentEngine?.rules?.active || 0}
                  </div>
                  <div className="text-sm text-gray-600">Règles Actives</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {systemStats.autoInvestmentEngine?.investments?.completed ||
                      0}
                  </div>
                  <div className="text-sm text-gray-600">
                    Investissements Réussis
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {systemStats.autoInvestmentEngine?.investments?.pending ||
                      0}
                  </div>
                  <div className="text-sm text-gray-600">En Attente</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Mes Règles d'Investissement
            </h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              ➕ Créer une Règle
            </button>
          </div>

          {/* Create Form Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">
                      Créer une Nouvelle Règle
                    </h3>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCreateRule} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom de la règle *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="Ma stratégie d'investissement"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prix d'achat max (ETH)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={formData.maxBuyPrice}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxBuyPrice: e.target.value,
                            })
                          }
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prix de vente min (ETH)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={formData.minSellPrice}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              minSellPrice: e.target.value,
                            })
                          }
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="0.2"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frais créateur max (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.maxCreatorFee}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxCreatorFee: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Collections autorisées (adresses séparées par virgule)
                      </label>
                      <input
                        type="text"
                        value={formData.allowedCollections}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            allowedCollections: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="0x..., 0x..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Montant d'investissement (ETH) *
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          required
                          value={formData.investmentAmount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              investmentAmount: e.target.value,
                            })
                          }
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="0.05"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Limite journalière (ETH)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={formData.maxInvestmentPerDay}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxInvestmentPerDay: e.target.value,
                            })
                          }
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="0.5"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Wallet à utiliser *
                      </label>
                      <select
                        required
                        value={formData.walletId}
                        onChange={(e) =>
                          setFormData({ ...formData, walletId: e.target.value })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Sélectionner un wallet</option>
                        {wallets.map((wallet) => (
                          <option key={wallet.id} value={wallet.id}>
                            {wallet.name || wallet.address.slice(0, 8)}... (
                            {wallet.address.slice(0, 6)}...
                            {wallet.address.slice(-4)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Créer la Règle
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Rules List */}
          <div className="space-y-4">
            {rules.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <div className="text-gray-500 mb-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    🤖
                  </div>
                  <p className="text-lg">
                    Aucune règle d'auto-investment configurée
                  </p>
                  <p className="text-sm">
                    Créez votre première règle pour commencer l'investissement
                    automatique
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Créer ma Première Règle
                </button>
              </div>
            ) : (
              rules.map((rule) => (
                <div key={rule.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {rule.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            rule.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {rule.isActive ? "Actif" : "Inactif"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <p>
                            <strong>Montant:</strong> {rule.investmentAmount}{" "}
                            ETH
                          </p>
                          <p>
                            <strong>Wallet:</strong>{" "}
                            {rule.wallet.name ||
                              rule.wallet.address.slice(0, 8)}
                            ...
                          </p>
                        </div>
                        <div>
                          <p>
                            <strong>Prix max:</strong>{" "}
                            {rule.maxBuyPrice || "Aucune limite"}
                          </p>
                          <p>
                            <strong>Frais max:</strong>{" "}
                            {rule.maxCreatorFee
                              ? `${rule.maxCreatorFee}%`
                              : "Aucune limite"}
                          </p>
                        </div>
                        <div>
                          <p>
                            <strong>Investissements:</strong>{" "}
                            {rule.totalInvestments}
                          </p>
                          <p>
                            <strong>Total investi:</strong> {rule.totalInvested}{" "}
                            ETH
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleRule(rule.id, rule.isActive)}
                        className={`px-3 py-1 text-sm rounded-md ${
                          rule.isActive
                            ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {rule.isActive ? "Désactiver" : "Activer"}
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
