"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

interface CreatePoolFormProps {
  selectedWallet: string;
  selectedChain: number;
  onPoolCreated: (poolData: any) => void;
}

interface PoolFormData {
  name: string;
  nftCollection: string;
  poolType: "TOKEN" | "COLLECTION";
  buyPrice: number;
  sellPrice: number;
  creatorFee: number;
}

export function CreatePoolForm({
  selectedWallet,
  selectedChain,
  onPoolCreated,
}: CreatePoolFormProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<
    "form" | "deploying" | "success"
  >("form");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<PoolFormData>({
    defaultValues: {
      poolType: "COLLECTION",
      creatorFee: 2.5,
    },
  });

  const poolType = watch("poolType");

  const onSubmit = async (data: PoolFormData) => {
    if (!selectedWallet) {
      alert("Veuillez sélectionner un wallet");
      return;
    }

    setIsCreating(true);
    setCreationStep("deploying");

    try {
      console.log("🚀 ~ onSubmit ~ data:", data);

      // Créer la pool via l'API
      const response = await fetch("/api/pool/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          nftCollectionAddress: data.nftCollection.toLowerCase(),
          walletAddress: selectedWallet,
          chainId: selectedChain,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create pool");
      }

      const result = await response.json();
      setCreationStep("success");

      setTimeout(() => {
        onPoolCreated(result.pool);
      }, 2000);
    } catch (error) {
      console.error("Error creating pool:", error);
      alert(
        `Erreur: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setCreationStep("form");
    } finally {
      setIsCreating(false);
    }
  };

  if (creationStep === "deploying") {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Création de la pool en cours...
        </h3>
        <p className="text-gray-600">
          Déploiement du smart contract sur la blockchain
        </p>
      </div>
    );
  }

  if (creationStep === "success") {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Pool créée avec succès !
        </h3>
        <p className="text-gray-600">Redirection en cours...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informations de base */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">
          Informations de base
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de la pool *
          </label>
          <input
            {...register("name", { required: "Le nom est requis" })}
            type="text"
            placeholder="Ex: Rare Apes Collection Pool"
            className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type de pool *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
              <input
                {...register("poolType")}
                type="radio"
                value="COLLECTION"
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium text-gray-900">Collection</div>
                <div className="text-sm text-gray-500">
                  Pool pour une collection entière
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
              <input
                {...register("poolType")}
                type="radio"
                value="TOKEN"
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium text-gray-900">
                  Token spécifique
                </div>
                <div className="text-sm text-gray-500">
                  Pool pour un NFT précis
                </div>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {poolType === "COLLECTION"
              ? "Adresse de la collection"
              : "Adresse du contrat NFT"}{" "}
            *
          </label>
          <input
            {...register("nftCollection", {
              required: "L'adresse du contrat est requise",
              pattern: {
                value: /^0x[a-fA-F0-9]{40}$/,
                message: "Adresse Ethereum invalide",
              },
            })}
            type="text"
            placeholder="0x..."
            className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.nftCollection && (
            <p className="text-red-500 text-sm mt-1">
              {errors.nftCollection.message}
            </p>
          )}
        </div>
      </div>

      {/* Paramètres de trading */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">
          Paramètres de trading
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prix d&apos;achat (ETH) *
            </label>
            <input
              {...register("buyPrice", {
                required: "Le prix d'achat est requis",
                min: { value: 0.001, message: "Minimum 0.001 ETH" },
              })}
              type="number"
              step="0.001"
              placeholder="0.1"
              className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.buyPrice && (
              <p className="text-red-500 text-sm mt-1">
                {errors.buyPrice.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prix de vente (ETH) *
            </label>
            <input
              {...register("sellPrice", {
                required: "Le prix de vente est requis",
                min: { value: 0.001, message: "Minimum 0.001 ETH" },
              })}
              type="number"
              step="0.001"
              placeholder="0.15"
              className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.sellPrice && (
              <p className="text-red-500 text-sm mt-1">
                {errors.sellPrice.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Frais du créateur (%) *
          </label>
          <input
            {...register("creatorFee", {
              required: "Les frais du créateur sont requis",
              min: { value: 0, message: "Minimum 0%" },
              max: { value: 10, message: "Maximum 10%" },
            })}
            type="number"
            step="0.1"
            placeholder="2.5"
            className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.creatorFee && (
            <p className="text-red-500 text-sm mt-1">
              {errors.creatorFee.message}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Pourcentage que vous recevrez sur chaque transaction
          </p>
        </div>
      </div>

      {/* Validation et bouton */}
      <div className="border-t pt-6">
        {!selectedWallet && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ Veuillez sélectionner un wallet pour créer la pool
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isCreating || !selectedWallet}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isCreating ? "Création en cours..." : "Créer la Pool"}
        </button>
      </div>
    </form>
  );
}
