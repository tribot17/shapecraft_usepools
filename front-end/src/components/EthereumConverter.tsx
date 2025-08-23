"use client";

import {
  etherToWei,
  formatAddress,
  formatBalance,
  isValidAmount,
  weiToEther,
} from "@/lib/utils/ethereum";
import { useState } from "react";

export function EthereumConverter() {
  const [etherValue, setEtherValue] = useState("1.0");
  const [weiValue, setWeiValue] = useState("");
  const [address, setAddress] = useState(
    "0x1234567890123456789012345678901234567890"
  );

  const convertEtherToWei = () => {
    if (!isValidAmount(etherValue)) {
      setWeiValue("Invalid amount");
      return;
    }

    try {
      const wei = etherToWei(etherValue);
      setWeiValue(wei.toString());
    } catch (error) {
      setWeiValue(
        "Error: " + (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const convertWeiToEther = () => {
    if (!weiValue || weiValue === "Invalid amount") return;

    try {
      const ether = weiToEther(weiValue);
      setEtherValue(ether);
    } catch (error) {
      setEtherValue(
        "Error: " + (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Ethereum Utils Tester</h3>

      {/* Ether to Wei Converter */}
      <div className="border rounded-lg p-4">
        <h4 className="font-semibold mb-3">Ether ↔ Wei Converter</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Ether</label>
            <input
              type="text"
              value={etherValue}
              onChange={(e) => setEtherValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1.0"
            />
            <button
              onClick={convertEtherToWei}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Convert to Wei →
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Wei</label>
            <textarea
              value={weiValue}
              onChange={(e) => setWeiValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 text-xs"
              placeholder="Wei value will appear here"
            />
            <button
              onClick={convertWeiToEther}
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              ← Convert to Ether
            </button>
          </div>
        </div>
      </div>

      {/* Address Formatter */}
      <div className="border rounded-lg p-4">
        <h4 className="font-semibold mb-3">Address Formatter</h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">
              Ethereum Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0x..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Short (6):</span>
              <div className="mt-1 p-2 bg-gray-50 rounded font-mono">
                {formatAddress(address, 6)}
              </div>
            </div>
            <div>
              <span className="font-medium">Medium (8):</span>
              <div className="mt-1 p-2 bg-gray-50 rounded font-mono">
                {formatAddress(address, 8)}
              </div>
            </div>
            <div>
              <span className="font-medium">Long (10):</span>
              <div className="mt-1 p-2 bg-gray-50 rounded font-mono">
                {formatAddress(address, 10)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Formatter */}
      <div className="border rounded-lg p-4">
        <h4 className="font-semibold mb-3">Balance Formatter Examples</h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { wei: "1000000000000000000", label: "1 ETH" },
            { wei: "500000000000000000", label: "0.5 ETH" },
            { wei: "100000000000000", label: "0.0001 ETH" },
            { wei: "1000000000000000000000", label: "1000 ETH" },
            { wei: "1500000000000000000000000", label: "1.5M ETH" },
          ].map((example, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded">
              <div className="font-medium">{example.label}</div>
              <div className="text-blue-600 font-mono">
                {formatBalance(example.wei)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Validation Example */}
      <div className="border rounded-lg p-4">
        <h4 className="font-semibold mb-3">Amount Validation</h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {["1.5", "0", "-1", "abc", "999999999999999999", "0.000001"].map(
            (amount, index) => (
              <div
                key={index}
                className="p-2 bg-gray-50 rounded flex justify-between"
              >
                <span className="font-mono">{amount}</span>
                <span
                  className={
                    isValidAmount(amount) ? "text-green-600" : "text-red-600"
                  }
                >
                  {isValidAmount(amount) ? "✅" : "❌"}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
