"use client";

import { TransactionEventViewer } from "@/components/TransactionEventViewer";
import { useState } from "react";

export default function EventDebugPage() {
  const [showExamples, setShowExamples] = useState(false);

  const exampleTxHashes = [
    {
      hash: "0xb85978aa26bf93295b00ff3c266a549300ffe0af01e46a0dd26b69a1f95ceabe",
      description: "Example transaction with events",
      chainId: 360,
    },
    // Ajoutez d'autres exemples ici
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Event Debug Tool</h1>
          <p className="text-gray-600 mt-2">
            Test et débogage des événements blockchain à partir de hash de
            transactions
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            🔧 Comment utiliser cet outil
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>
              Entrez un hash de transaction valide (format: 0x suivi de 64
              caractères hexadécimaux)
            </li>
            <li>Sélectionnez le réseau (Shape Mainnet ou Sepolia)</li>
            <li>Choisissez le type de contrat (PoolFactory ou Pool)</li>
            <li>
              Sélectionnez le mode de recherche :
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>
                  <strong>Pool Created Event</strong> : Recherche spécifiquement
                  l'événement PoolCreated
                </li>
                <li>
                  <strong>Specific Event</strong> : Recherche un événement
                  particulier par nom
                </li>
                <li>
                  <strong>All Events</strong> : Affiche tous les événements du
                  type de contrat sélectionné
                </li>
              </ul>
            </li>
            <li>Cliquez sur "Search Events" pour analyser la transaction</li>
          </ol>
        </div>

        {/* Exemples */}
        <div className="mb-8">
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>{showExamples ? "🔽" : "▶️"}</span>
            <span className="ml-2">Exemples de transactions</span>
          </button>

          {showExamples && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">
                Transactions d'exemple
              </h3>
              <div className="space-y-3">
                {exampleTxHashes.map((example, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm text-gray-800">
                          {example.hash}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {example.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          Chain ID: {example.chainId}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(example.hash)
                        }
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Outil principal */}
        <TransactionEventViewer />

        {/* Documentation API */}
        <div className="mt-12 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            📚 API Documentation
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-2">
                GET /api/events/transaction
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Récupère les événements d'une transaction unique
              </p>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                <p>
                  ?txHash=0x...&mode=poolCreated&contractType=PoolFactory&chainId=360
                </p>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <p>
                  <strong>Modes disponibles:</strong> single, all, poolCreated
                </p>
                <p>
                  <strong>Contract Types:</strong> PoolFactory, Pool
                </p>
                <p>
                  <strong>Chain IDs:</strong> 360 (mainnet), 11011 (sepolia)
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-2">
                POST /api/events/transaction
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Récupère les événements de plusieurs transactions
              </p>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                <pre>
                  {JSON.stringify(
                    {
                      txHashes: ["0x...", "0x..."],
                      eventName: "PoolCreated",
                      chainId: 360,
                      contractType: "PoolFactory",
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
