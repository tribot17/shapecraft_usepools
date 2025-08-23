"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { CreatePoolForm } from "@/components/CreatePoolForm";
import { WalletSelector } from "@/components/WalletSelector";
import { useWallets } from "@/lib/hooks/useWallets";
import { useAuth } from "@/providers/AuthProvider";
import { ManagedWallet } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CreatePoolPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [selectedChain, setSelectedChain] = useState<number>(360);
  const [wallets, setWallets] = useState<ManagedWallet[]>([]);
  const { isLoading: walletsLoading } = useWallets(session?.user?.id);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.managedWallets) {
      setWallets(user.managedWallets);
    }
  }, [user]);

  const handlePoolCreated = (poolData: any) => {
    console.log("Pool created:", poolData);
    router.push(`/pools/${poolData.id}`);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Créer une nouvelle Pool
            </h1>
            <p className="text-gray-600 text-lg">
              Configurez votre pool de trading NFT et invitez {"d'autres"}
              utilisateurs à participer
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Formulaire principal */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <CreatePoolForm
                  selectedWallet={selectedWallet}
                  selectedChain={selectedChain}
                  onPoolCreated={handlePoolCreated}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Sélecteur de wallet */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Sélectionner un Wallet
                </h3>
                <WalletSelector
                  wallets={wallets}
                  selectedWallet={selectedWallet}
                  onWalletSelect={setSelectedWallet}
                  isLoading={walletsLoading}
                />
              </div>

              {/* Sélecteur de réseau */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Réseau blockchain
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="chain"
                      value={360}
                      checked={selectedChain === 360}
                      onChange={(e) => setSelectedChain(Number(e.target.value))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        Shape Mainnet
                      </div>
                      <div className="text-sm text-gray-500">
                        Réseau principal
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="chain"
                      value={11011}
                      checked={selectedChain === 11011}
                      onChange={(e) => setSelectedChain(Number(e.target.value))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        Shape Sepolia
                      </div>
                      <div className="text-sm text-gray-500">
                        Réseau de test
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Informations */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-3">💡 Comment ça marche ?</h3>
                <ul className="space-y-2 text-sm opacity-90">
                  <li>• Créez votre pool avec les paramètres souhaités</li>
                  <li>• Invitez d'autres utilisateurs à participer</li>
                  <li>• Collectez les fonds et gérez les trades ensemble</li>
                  <li>• Partagez les profits selon les contributions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
