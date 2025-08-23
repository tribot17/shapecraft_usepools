"use client";

import {
  useAllTransactionEvents,
  usePoolCreatedEvent,
  useTransactionEvent,
} from "@/lib/hooks/useTransactionEvents";
import {
  formatEventForDisplay,
  formatPoolCreatedEvent,
  validateTransactionHash,
} from "@/lib/web3/eventHelpers";
import { useState } from "react";

export function TransactionEventViewer() {
  const [txHash, setTxHash] = useState("");
  const [selectedMode, setSelectedMode] = useState<
    "poolCreated" | "specific" | "all"
  >("poolCreated");
  const [eventName, setEventName] = useState("PoolCreated");
  const [chainId, setChainId] = useState(360);
  const [contractType, setContractType] = useState<"PoolFactory" | "Pool">(
    "PoolFactory"
  );

  // Hooks pour récupérer les événements
  const {
    data: poolCreatedEvent,
    isLoading: isLoadingPoolCreated,
    error: poolCreatedError,
  } = usePoolCreatedEvent({
    txHash: txHash,
    chainId,
    enabled: selectedMode === "poolCreated" && validateTransactionHash(txHash),
  });

  const {
    data: specificEvent,
    isLoading: isLoadingSpecific,
    error: specificError,
  } = useTransactionEvent({
    txHash,
    eventName,
    chainId,
    contractType,
    enabled: selectedMode === "specific" && validateTransactionHash(txHash),
  });

  const {
    data: allEvents,
    isLoading: isLoadingAll,
    error: allError,
  } = useAllTransactionEvents({
    txHash,
    chainId,
    contractType,
    enabled: selectedMode === "all" && validateTransactionHash(txHash),
  });

  const isLoading = isLoadingPoolCreated || isLoadingSpecific || isLoadingAll;
  const error = poolCreatedError || specificError || allError;

  const handleSearch = () => {
    if (!validateTransactionHash(txHash)) {
      alert(
        "Please enter a valid transaction hash (0x followed by 64 hex characters)"
      );
      return;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        🔍 Transaction Event Viewer
      </h2>

      {/* Configuration */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transaction Hash
          </label>
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chain ID
            </label>
            <select
              value={chainId}
              onChange={(e) => setChainId(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value={360}>Shape Mainnet (360)</option>
              <option value={11011}>Shape Sepolia (11011)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Type
            </label>
            <select
              value={contractType}
              onChange={(e) =>
                setContractType(e.target.value as "PoolFactory" | "Pool")
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="PoolFactory">Pool Factory</option>
              <option value="Pool">Pool</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Mode
            </label>
            <select
              value={selectedMode}
              onChange={(e) =>
                setSelectedMode(
                  e.target.value as "poolCreated" | "specific" | "all"
                )
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="poolCreated">Pool Created Event</option>
              <option value="specific">Specific Event</option>
              <option value="all">All Events</option>
            </select>
          </div>
        </div>

        {selectedMode === "specific" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="PoolCreated"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={!txHash || isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Searching..." : "Search Events"}
        </button>
      </div>

      {/* Résultats */}
      <div className="border-t pt-6">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading events...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* PoolCreated Event */}
            {selectedMode === "poolCreated" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Pool Created Event
                </h3>
                {poolCreatedEvent ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <h4 className="font-medium text-green-800 mb-2">
                      ✅ Event Found
                    </h4>
                    <p className="text-green-700">
                      {formatPoolCreatedEvent(poolCreatedEvent)}
                    </p>
                    <div className="mt-3 text-sm text-green-600">
                      <p>
                        <strong>Pool Address:</strong>{" "}
                        {poolCreatedEvent.poolAddress}
                      </p>
                      <p>
                        <strong>Creator:</strong> {poolCreatedEvent.creator}
                      </p>
                      <p>
                        <strong>Block:</strong> {poolCreatedEvent.blockNumber}
                      </p>
                      <p>
                        <strong>Transaction:</strong>{" "}
                        {poolCreatedEvent.transactionHash}
                      </p>
                    </div>
                  </div>
                ) : txHash && validateTransactionHash(txHash) ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-yellow-700">
                      No PoolCreated event found in this transaction.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Specific Event */}
            {selectedMode === "specific" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Specific Event: {eventName}
                </h3>
                {specificEvent ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <h4 className="font-medium text-green-800 mb-2">
                      ✅ Event Found
                    </h4>
                    <p className="text-green-700">
                      {formatEventForDisplay(specificEvent)}
                    </p>
                    <div className="mt-3 text-sm text-green-600">
                      <p>
                        <strong>Address:</strong> {specificEvent.address}
                      </p>
                      <p>
                        <strong>Block:</strong> {specificEvent.blockNumber}
                      </p>
                      <p>
                        <strong>Arguments:</strong>
                      </p>
                      <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(specificEvent.args, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : txHash && validateTransactionHash(txHash) ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-yellow-700">
                      No {eventName} event found in this transaction.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* All Events */}
            {selectedMode === "all" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  All {contractType} Events
                </h3>
                {allEvents && allEvents.length > 0 ? (
                  <div className="space-y-3">
                    {allEvents.map((event, index) => (
                      <div
                        key={index}
                        className="bg-blue-50 border border-blue-200 rounded-md p-4"
                      >
                        <h4 className="font-medium text-blue-800">
                          {event.eventName}
                        </h4>
                        <p className="text-blue-700 text-sm">
                          {formatEventForDisplay(event)}
                        </p>
                        <div className="mt-2 text-xs text-blue-600">
                          <p>
                            <strong>Address:</strong> {event.address}
                          </p>
                          <details className="mt-1">
                            <summary className="cursor-pointer hover:text-blue-800">
                              View Arguments
                            </summary>
                            <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                              {JSON.stringify(event.args, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : txHash && validateTransactionHash(txHash) ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-yellow-700">
                      No {contractType} events found in this transaction.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}

        {!txHash && (
          <div className="text-center py-8 text-gray-500">
            Enter a transaction hash above to search for events
          </div>
        )}
      </div>
    </div>
  );
}
