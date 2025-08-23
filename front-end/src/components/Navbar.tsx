"use client";

import { useWeb3 } from "@/lib/hooks/useWeb3";
import { useAuth } from "@/providers/AuthProvider";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const { chainId, isConnected } = useWeb3();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 1:
        return "Ethereum";
      case 11155111:
        return "Sepolia";
      case 137:
        return "Polygon";
      case 80001:
        return "Mumbai";
      case 42161:
        return "Arbitrum";
      case 10:
        return "Optimism";
      case 360:
        return "Shape";
      case 11011:
        return "Shape Sepolia";
      default:
        return `Chain ${chainId}`;
    }
  };

  const getNetworkColor = (chainId: number) => {
    switch (chainId) {
      case 1:
        return "bg-blue-500";
      case 11155111:
        return "bg-purple-500";
      case 137:
        return "bg-purple-600";
      case 80001:
        return "bg-purple-400";
      case 42161:
        return "bg-blue-600";
      case 10:
        return "bg-red-500";
      case 360:
        return "bg-orange-500";
      case 11011:
        return "bg-orange-400";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => router.push("/")}
              className="flex-shrink-0 flex items-center"
            >
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">
                ShapeCraft
              </span>
            </button>
          </div>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <button
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </button>
              {isAuthenticated && (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Network Indicator */}
            {isConnected && chainId && (
              <div className="hidden sm:flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${getNetworkColor(chainId)}`}
                ></div>
                <span className="text-sm font-medium text-gray-700">
                  {getNetworkName(chainId)}
                </span>
              </div>
            )}

            {/* User Info */}
            {isAuthenticated && user && (
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {user.name?.charAt(0) || "U"}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700 max-w-24 truncate">
                  {user.name}
                </span>
              </div>
            )}

            {/* Connect Button */}
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== "loading";
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus ||
                    authenticationStatus === "authenticated");

                return (
                  <div
                    {...(!ready && {
                      "aria-hidden": true,
                      style: {
                        opacity: 0,
                        pointerEvents: "none",
                        userSelect: "none",
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            Connect Wallet
                          </button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                          >
                            Wrong Network
                          </button>
                        );
                      }

                      return (
                        <div className="flex items-center space-x-2">
                          {/* Chain Button */}
                          <button
                            onClick={openChainModal}
                            style={{ backgroundColor: chain.iconBackground }}
                            type="button"
                            className="flex items-center px-3 py-2 rounded-lg hover:opacity-80 transition-opacity"
                          >
                            {chain.hasIcon && (
                              <div
                                style={{
                                  background: chain.iconUrl
                                    ? `url(${chain.iconUrl})`
                                    : undefined,
                                  backgroundSize: "cover",
                                  width: 20,
                                  height: 20,
                                  borderRadius: 999,
                                }}
                              />
                            )}
                            <span className="ml-2 text-white font-medium text-sm">
                              {chain.name}
                            </span>
                          </button>

                          {/* Account Button */}
                          <button
                            onClick={openAccountModal}
                            type="button"
                            className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg transition-colors font-medium"
                          >
                            {account.displayName}
                            {account.displayBalance
                              ? ` (${account.displayBalance})`
                              : ""}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      isMenuOpen
                        ? "M6 18L18 6M6 6l12 12"
                        : "M4 6h16M4 12h16M4 18h16"
                    }
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              <button
                onClick={() => {
                  router.push("/");
                  setIsMenuOpen(false);
                }}
                className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
              >
                Home
              </button>
              {isAuthenticated && (
                <button
                  onClick={() => {
                    router.push("/dashboard");
                    setIsMenuOpen(false);
                  }}
                  className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                >
                  Dashboard
                </button>
              )}

              {/* Mobile Network Info */}
              {isConnected && chainId && (
                <div className="flex items-center space-x-2 px-3 py-2">
                  <div
                    className={`w-3 h-3 rounded-full ${getNetworkColor(
                      chainId
                    )}`}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">
                    Network: {getNetworkName(chainId)}
                  </span>
                </div>
              )}

              {/* Mobile User Info */}
              {isAuthenticated && user && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg mx-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {user.name?.charAt(0) || "U"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
