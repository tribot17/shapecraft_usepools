"use client";

import { useSigner } from "@/lib/hooks/useSigner";
import { useState } from "react";

export function SignerExample() {
  const {
    getSigner,
    signMessage,
    signTypedData,
    isConnected,
    walletClient,
    getSignerForUser,
    getSignerForChain,
  } = useSigner();
  const [message, setMessage] = useState("Hello World!");
  const [signature, setSignature] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignMessage = async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      const sig = await signMessage(message);
      setSignature(sig);
    } catch (error) {
      console.error("Error signing message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignTypedData = async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      const domain = {
        name: "ShapeCraft",
        version: "1",
        chainId: 1,
        verifyingContract: "0x1234567890123456789012345678901234567890",
      };

      const types = {
        Message: [
          { name: "content", type: "string" },
          { name: "timestamp", type: "uint256" },
        ],
      };

      const value = {
        content: message,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const sig = await signTypedData(domain, types, value);
      setSignature(sig);
    } catch (error) {
      console.error("Error signing typed data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSignerInfo = () => {
    try {
      const signer = getSigner();
      console.log("Signer:", signer);
      return signer;
    } catch (error) {
      console.error("Error getting signer:", error);
      return null;
    }
  };

  const testSignerForUser = async () => {
    try {
      const signer = await getSignerForUser();
      console.log("Signer for user:", signer);
    } catch (error) {
      console.error("Error getting signer for user:", error);
    }
  };

  const testSignerForChain = async (chainId: number) => {
    try {
      const signer = await getSignerForChain(chainId);
      console.log(`Signer for chain ${chainId}:`, signer);
    } catch (error) {
      console.error(`Error getting signer for chain ${chainId}:`, error);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <p className="text-yellow-800">
          Please connect your wallet to use the signer
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Signer Example</h3>

      {/* Message Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Message to sign:
        </label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter message..."
        />
      </div>

      {/* Buttons */}
      <div className="space-y-2 mb-4">
        <button
          onClick={handleSignMessage}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Signing..." : "Sign Message"}
        </button>

        <button
          onClick={handleSignTypedData}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? "Signing..." : "Sign Typed Data"}
        </button>

        <button
          onClick={getSignerInfo}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Get Signer Info (Check Console)
        </button>

        <button
          onClick={testSignerForUser}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Get Signer for User (Check Console)
        </button>

        <button
          onClick={() => testSignerForChain(360)}
          className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          Get Signer for Shape (Check Console)
        </button>
      </div>

      {/* Signature Display */}
      {signature && (
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Signature:</label>
          <div className="p-3 bg-gray-50 rounded-lg">
            <code className="text-xs break-all text-gray-800">{signature}</code>
          </div>
        </div>
      )}

      {/* Signer Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Wallet Client Available:</strong>{" "}
          {walletClient ? "✅ Yes" : "❌ No"}
        </p>
      </div>
    </div>
  );
}
