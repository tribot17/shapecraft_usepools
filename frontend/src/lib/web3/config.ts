import { ethers } from "ethers";
import { createPublicClient, http } from "viem";
import { shape, shapeSepolia } from "wagmi/chains";

export const RPC_URL_CONFIG: Record<number, string> = {
  360: "https://shape-mainnet.g.alchemy.com/v2",
  11011: "https://shape-sepolia.g.alchemy.com/v2",
};

export const CHAIN_ID_CONFIG = {
  shape: 360,
  shapeSepolia: 11011,
};

export const CHAIN_ID_TO_NAME = {
  [CHAIN_ID_CONFIG.shape]: "shape",
  [CHAIN_ID_CONFIG.shapeSepolia]: "shapeSepolia",
};

export const POOL_FACTORY_ADDRESS: Record<number, string> = {
  [CHAIN_ID_CONFIG.shape]: "0x7E579B34D024343FBD6eDF8266FF5fA38d082466",
  [CHAIN_ID_CONFIG.shapeSepolia]: "0x7b1B4090fb7bEa28B7E7B08AfE1572AE5CB35098",
};

export function getProvider(chainId: number = 360): ethers.JsonRpcProvider {
  const rpcUrl = `${RPC_URL_CONFIG[chainId]}/${process.env.ALCHEMY_API_KEY}`;
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getSignerProvider(
  chainId: number = 360,
  privateKey: string
): ethers.Wallet {
  const rpcUrl = `${RPC_URL_CONFIG[chainId]}/${process.env.ALCHEMY_API_KEY}`;
  return new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(rpcUrl));
}

export const SUPPORTED_CHAINS = {
  shape,
  shapeSepolia,
} as const;

export const publicClient = createPublicClient({
  chain: shapeSepolia,
  transport: http(),
});

export function getPublicClientForChain(chainId: number) {
  const chain = Object.values(SUPPORTED_CHAINS).find((c) => c.id === chainId);
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  return createPublicClient({
    chain,
    transport: http(),
  });
}
