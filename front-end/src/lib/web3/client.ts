import { config } from "@/lib/wagmi";
import { createPublicClient, http } from "viem";
import { shape, shapeSepolia } from "viem/chains";
import { getAccount, getWalletClient } from "wagmi/actions";

export const SUPPORTED_CHAINS = {
  shape,
  shapeSepolia,
} as const;

export const publicClient = createPublicClient({
  chain: shapeSepolia,
  transport: http(),
});

export async function getWalletClientForUser() {
  const account = getAccount(config);
  if (!account.address) {
    throw new Error("No wallet connected");
  }

  const walletClient = await getWalletClient(config);
  if (!walletClient) {
    throw new Error("No wallet client available");
  }

  return walletClient;
}

export function getPublicClientForChain(chainId: number) {
  console.log(SUPPORTED_CHAINS);

  const chain = Object.values(SUPPORTED_CHAINS).find((c) => c.id === chainId);
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  return createPublicClient({
    chain,
    transport: http(),
  });
}

export async function getWalletClientForChain(chainId: number) {
  const account = getAccount(config);
  if (!account.address) {
    throw new Error("No wallet connected");
  }

  const walletClient = await getWalletClient(config, { chainId });
  if (!walletClient) {
    throw new Error(`No wallet client available for chain ${chainId}`);
  }

  return walletClient;
}
