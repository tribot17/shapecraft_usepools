"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

interface PoolFormData {
  name: string;
  nftCollectionAddress: string;
  creatorFee: number;
  buyPrice: number;
  sellPrice: number;
  chainId: number;
  collection_slug: string;
}

interface PoolResult {
  id: string;
  name: string;
  poolAddress: string;
  creatorFee: number;
  buyPrice: number;
  sellPrice: number;
}

export default function TestPoolPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PoolResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<PoolFormData>({
    name: "Test Pool",
    nftCollectionAddress: "0x0602b0fad4d305b2c670808dd9f77b0a68e36c5b", // Shape Collection
    creatorFee: 2.5,
    buyPrice: 1.0,
    sellPrice: 1.5,
    chainId: 11011,
    collection_slug: "moveable-type-shape",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/pool/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      console.log("🚀 ~ handleSubmit ~ response:", response);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create pool");
      }

      const poolResult = await response.json();
      setResult(poolResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
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
            You need to be logged in to create a pool.
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
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🌊 Test Pool Creation
          </h1>
          <p className="text-gray-600 mb-6">
            Create a test pool to verify the UsePools integration
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pool Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pool Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Collection Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NFT Collection Address
              </label>
              <input
                type="text"
                name="nftCollectionAddress"
                value={formData.nftCollectionAddress}
                onChange={handleInputChange}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0x..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: Bored Ape Yacht Club
              </p>
            </div>

            {/* Creator Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Creator Fee (%)
              </label>
              <input
                type="number"
                name="creatorFee"
                value={formData.creatorFee}
                onChange={handleInputChange}
                min="0"
                max="10"
                step="0.1"
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Buy Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buy Price (ETH)
                </label>
                <input
                  type="number"
                  name="buyPrice"
                  value={formData.buyPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Sell Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sell Price (ETH)
                </label>
                <input
                  type="number"
                  name="sellPrice"
                  value={formData.sellPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Chain ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Network
              </label>
              <select
                name="chainId"
                value={formData.chainId}
                onChange={handleInputChange}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={360}>Shape</option>
                <option value={11011}>Shape sepolia</option>
              </select>
            </div>

            {/* Collection Slug */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Collection Slug
              </label>
            </div>
            <input
              type="text"
              name="collection_slug"
              value={formData.collection_slug}
              onChange={handleInputChange}
              className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Pool...
                </div>
              ) : (
                "Create Pool"
              )}
            </button>
          </form>

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">
                ✅ Pool Created Successfully!
              </h3>
              <div className="text-sm text-green-700 mb-4">
                <p>
                  <strong>Pool ID:</strong> {result.id}
                </p>
                <p>
                  <strong>Pool Name:</strong> {result.name}
                </p>
                <p>
                  <strong>Pool Address:</strong> {result.poolAddress}
                </p>
                <p>
                  <strong>Creator Fee:</strong> {result.creatorFee}%
                </p>
                <p>
                  <strong>Buy Price:</strong> {result.buyPrice} wei
                </p>
                <p>
                  <strong>Sell Price:</strong> {result.sellPrice} wei
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mb-4">
                <button
                  onClick={() => (window.location.href = "/my-pools")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  View My Pools
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setError(null);
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
                >
                  Create Another Pool
                </button>
              </div>

              {/* Raw JSON for debugging */}
              <details className="mt-4">
                <summary className="cursor-pointer text-green-800 font-medium">
                  Show Raw Result (Debug)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">
            📋 Instructions
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• This form will create a pool in your local database</li>
            <li>
              • It will also create a corresponding pool in UsePools via the
              service
            </li>
            <li>• Check the console logs for UsePools integration details</li>
            <li>• Make sure you&apos;re authenticated with a managed wallet</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
