"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export default function TestUsePoolsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  const testEndpoint = async (
    name: string,
    endpoint: string,
    method = "GET",
    body?: any
  ) => {
    setLoading(name);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to call ${endpoint}`);
      }

      const result = await response.json();
      setResults((prev: any) => ({
        ...prev,
        [name]: result,
      }));
    } catch (err) {
      setError(
        `${name}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setLoading(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 mb-6">
            You need to be logged in to test UsePools.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🌊 UsePools Service Test
          </h1>
          <p className="text-gray-600 mb-6">
            Test all UsePools service endpoints and functionality
          </p>

          {/* User Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-800 mb-2">Current User</h2>
            <p className="text-sm text-blue-700">
              <strong>Wallet:</strong> {session.user.walletAddress}
            </p>
            <p className="text-sm text-blue-700">
              <strong>User ID:</strong> {session.user.id}
            </p>
          </div>

          {/* Test Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Authentication Test */}
            <button
              onClick={() =>
                testEndpoint("auth", "/api/auth/connect_to_pool", "POST")
              }
              disabled={loading === "auth"}
              className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {loading === "auth" ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Testing...
                </div>
              ) : (
                <>
                  🔐 Test Authentication
                  <p className="text-xs mt-1 opacity-80">Connect to UsePools</p>
                </>
              )}
            </button>

            {/* Get Pools */}
            <button
              onClick={() => testEndpoint("pools", "/api/usepools/create-pool")}
              disabled={loading === "pools"}
              className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading === "pools" ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </div>
              ) : (
                <>
                  🏊 Get Pools
                  <p className="text-xs mt-1 opacity-80">List all pools</p>
                </>
              )}
            </button>

            {/* Get Positions */}
            <button
              onClick={() =>
                testEndpoint("positions", "/api/usepools/positions")
              }
              disabled={loading === "positions"}
              className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              {loading === "positions" ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </div>
              ) : (
                <>
                  👤 Get Positions
                  <p className="text-xs mt-1 opacity-80">
                    User positions & analytics
                  </p>
                </>
              )}
            </button>

            {/* Test Join Pool */}
            <button
              onClick={() =>
                testEndpoint("join", "/api/usepools/pools/join", "POST", {
                  poolId: "test-pool-123",
                  amount: 1000000,
                  slippage: 0.5,
                })
              }
              disabled={loading === "join"}
              className="bg-yellow-600 text-white p-4 rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors"
            >
              {loading === "join" ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Testing...
                </div>
              ) : (
                <>
                  ⬇️ Test Join Pool
                  <p className="text-xs mt-1 opacity-80">Join test pool</p>
                </>
              )}
            </button>

            {/* Test Exit Pool */}
            <button
              onClick={() =>
                testEndpoint("exit", "/api/usepools/pools/exit", "POST", {
                  poolId: "test-pool-123",
                  amount: 500000,
                  slippage: 0.5,
                })
              }
              disabled={loading === "exit"}
              className="bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
            >
              {loading === "exit" ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Testing...
                </div>
              ) : (
                <>
                  ⬆️ Test Exit Pool
                  <p className="text-xs mt-1 opacity-80">Exit test pool</p>
                </>
              )}
            </button>

            {/* Clear Results */}
            <button
              onClick={() => {
                setResults({});
                setError(null);
              }}
              className="bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              🗑️ Clear Results
              <p className="text-xs mt-1 opacity-80">Reset all results</p>
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Results Display */}
          {Object.keys(results).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800">
                📊 Test Results
              </h3>

              {Object.entries(results).map(([name, result]) => (
                <div
                  key={name}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                >
                  <h4 className="font-semibold text-gray-800 mb-2 capitalize">
                    {name} Result
                  </h4>

                  {/* Summary for specific endpoints */}
                  {name === "auth" && (
                    <div className="mb-3 text-sm">
                      <p className="text-green-700">
                        ✅ Authentication Status:{" "}
                        {(result as any).success ? "Success" : "Failed"}
                      </p>
                      {(result as any).user && (
                        <>
                          <p className="text-gray-600">
                            User ID: {(result as any).user.id}
                          </p>
                          <p className="text-gray-600">
                            Address: {(result as any).user.address}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {name === "pools" && (
                    <div className="mb-3 text-sm">
                      <p className="text-blue-700">
                        📊 Found {(result as any).pools?.length || 0} pools
                      </p>
                    </div>
                  )}

                  {name === "positions" && (
                    <div className="mb-3 text-sm">
                      <p className="text-purple-700">
                        👤 Positions: {(result as any).positions?.length || 0}
                      </p>
                      {(result as any).analytics && (
                        <p className="text-purple-700">
                          💰 Total Value: {(result as any).analytics.totalValue}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Raw JSON */}
                  <details>
                    <summary className="cursor-pointer text-gray-700 font-medium hover:text-gray-900">
                      Show Raw Response
                    </summary>
                    <pre className="mt-2 p-3 bg-white border rounded text-xs overflow-x-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">
            📋 Test Instructions
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>
              • <strong>Authentication:</strong> Test connection to UsePools API
            </li>
            <li>
              • <strong>Get Pools:</strong> Retrieve all available pools
            </li>
            <li>
              • <strong>Get Positions:</strong> Get user positions and analytics
            </li>
            <li>
              • <strong>Join/Exit Pool:</strong> Test pool transactions (may
              fail if pool doesn&apos;t exist)
            </li>
            <li>• Check browser console for detailed logs</li>
            <li>• All requests use your managed wallet automatically</li>
          </ul>
        </div>

        {/* Service Status */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">
            🔧 Service Status
          </h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>
              • <strong>POOL_URL:</strong>{" "}
              {process.env.NEXT_PUBLIC_POOL_URL || "Not set in public env"}
            </p>
            <p>
              • <strong>Service:</strong> UsePools Client with
              auto-authentication
            </p>
            <p>
              • <strong>Cache:</strong> Tokens cached for 1 hour
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
