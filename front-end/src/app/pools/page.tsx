"use client";

import { usePoolEvents } from "@/lib/hooks/useEvents";
import Link from "next/link";
import { useState } from "react";

export default function PoolsPage() {
  const [selectedChain, setSelectedChain] = useState<number>(360);

  const { events: poolEvents, isLoading } = usePoolEvents({
    chainId: selectedChain,
    fromBlock: 0,
    autoRefresh: true,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Pools de Trading
            </h1>
            <p className="text-gray-600 mt-1">
              Découvrez et rejoignez des pools de trading NFT
            </p>
          </div>

          <Link
            href="/pools/create"
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
          >
            + Créer une Pool
          </Link>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                Réseau :
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedChain(360)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedChain === 360
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Shape Mainnet
                </button>
                <button
                  onClick={() => setSelectedChain(11011)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedChain === 11011
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Shape Sepolia
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              {poolEvents.length} pool{poolEvents.length !== 1 ? "s" : ""}{" "}
              trouvée{poolEvents.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Liste des pools */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm p-6 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : poolEvents.length === 0 ? (
          <div className="text-center py-16">
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune pool trouvée
            </h3>
            <p className="text-gray-500 mb-6">
              Soyez le premier à créer une pool sur ce réseau !
            </p>
            <Link
              href="/pools/create"
              className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Créer la première pool
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {poolEvents.map((pool) => (
              <div
                key={pool.transactionHash}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Pool #{pool.poolAddress.slice(-6)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {pool.poolAddress.slice(0, 8)}...
                      {pool.poolAddress.slice(-6)}
                    </p>
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                    Actif
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Créateur :</span>
                    <span className="font-mono text-gray-900">
                      {pool.creator.slice(0, 6)}...{pool.creator.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Créé le :</span>
                    <span className="text-gray-900">
                      {new Date(pool.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Bloc :</span>
                    <span className="font-mono text-gray-900">
                      #{pool.blockNumber}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                    Rejoindre
                  </button>
                  <Link
                    href={`/pools/${pool.poolAddress}`}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    Détails
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
