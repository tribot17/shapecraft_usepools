"use client";

import { PropsWithChildren, useMemo } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { mainnet, sepolia } from "wagmi/chains";
import { RainbowKitProvider, getDefaultConfig, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@rainbow-me/rainbowkit/styles.css";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// If a WalletConnect projectId is provided, use RainbowKit's default config.
// Otherwise, fall back to a simple injected connector so the app still runs.
const config = projectId
  ? getDefaultConfig({
      appName: "Scooby",
      projectId,
      chains: [mainnet, sepolia],
      transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
      },
    })
  : createConfig({
      chains: [mainnet, sepolia],
      connectors: [injected()],
      transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
      },
    });

export default function Web3Provider({ children }: PropsWithChildren) {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}


