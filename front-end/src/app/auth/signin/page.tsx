"use client";

import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignInPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isConnected: walletIsConnected,
    authenticateWallet,
  } = useWalletAuth();

  useEffect(() => {
    console.log(isAuthenticated);

    if (isAuthenticated) {
      router.push("/dashboard");
      return;
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Wallet Authentication
          </h2>
          <p className="mt-2 text-gray-600">
            Please connect your wallet and sign a message to continue
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {!walletIsConnected ? (
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-8 h-8 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Wallet Not Connected
              </h3>
              <p className="text-gray-600 mb-4">
                Please connect your wallet using the wallet.
              </p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Wallet Connected
              </h3>
              <p className="text-gray-600 mb-4">
                Click the button below to sign a message and authenticate your
                wallet.
              </p>
              <button
                onClick={authenticateWallet}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Sign Message to Authenticate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
