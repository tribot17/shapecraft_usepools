export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AuthCredentials {
  address: string;
  signature: string;
  nonce: string;
}

export interface AuthUser {
  id: string;
  address: string;
  username: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface PoolData {
  id: string;
  name: string;
  address: string;
  tvl: number;
  apy: number;
  totalSupply: number;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  fee: number;
  volume24h: number;
  createdAt: string;
  updatedAt: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

// Types de positions utilisateur
export interface UserPoolPosition {
  id: string;
  poolId: string;
  pool: PoolData;
  amount: number;
  tokenAAmount: number;
  tokenBAmount: number;
  rewards: number;
  unrealizedPnl: number;
  createdAt: string;
  updatedAt: string;
}

// Types de transactions
export interface PoolTransaction {
  id: string;
  poolId: string;
  userAddress: string;
  type: "JOIN" | "EXIT" | "CLAIM" | "SWAP";
  amount: number;
  tokenAAmount?: number;
  tokenBAmount?: number;
  txHash: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  createdAt: string;
  confirmedAt?: string;
}

// Types de requêtes
export interface JoinPoolRequest {
  poolId: string;
  amount: number;
  slippage?: number;
  deadline?: number;
}

export interface ExitPoolRequest {
  poolId: string;
  amount: number;
  slippage?: number;
  deadline?: number;
}

export interface SwapRequest {
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  minAmountOut: number;
  slippage?: number;
  deadline?: number;
}

// Types de réponses
export interface JoinPoolResponse {
  transactionId: string;
  txHash: string;
  position: UserPoolPosition;
}

export interface ExitPoolResponse {
  transactionId: string;
  txHash: string;
  amountReceived: number;
  tokenAReceived: number;
  tokenBReceived: number;
}

export interface SwapResponse {
  transactionId: string;
  txHash: string;
  amountOut: number;
  priceImpact: number;
}

// Types d'analytics
export interface PoolAnalytics {
  poolId: string;
  tvlHistory: { timestamp: string; value: number }[];
  volumeHistory: { timestamp: string; value: number }[];
  apyHistory: { timestamp: string; value: number }[];
  userCount: number;
  transactionCount: number;
}

export interface UserAnalytics {
  totalValue: number;
  totalRewards: number;
  totalPnl: number;
  positionCount: number;
  transactionCount: number;
  favoriteTokens: string[];
}

export interface CreatePoolRequest {
  poolName: string;
  escrowAddress: string;
  poolDescription: string;
  poolAddress: string;
  deadline: string;
  poolPhilosophy: string;
  poolImage: string;
  collectionName: string;
  collectionSlug: string;
  creator: string;
  creatorFee: string;
  collectionAddress: string;
  targetType: string;
  tokenId: string;
  buyPrice: string;
  buyPriceWithFeeEthers: string;
  sellPrice: string;
  marketType: string;
  isERC721: boolean;
  chainId: number;
  contractVersion: string;
}

export interface CreatePoolResponse {
  pool: {
    id: string;
    poolName: string;
    poolNumber: number;
    escrowAddress: string;
    poolDescription: string;
    poolAddress: string;
    poolPhilosophy: string;
    poolImage: string;
    collectionName: string;
    collectionSlug: string;
    creator: string;
    creatorFee: string;
    collectionAddress: string;
    targetType: string;
    tokenId: string;
    buyPrice: string;
    buyPriceWithFeeEthers: string;
    sellPrice: string;
    marketType: string;
    isERC721: boolean;
    discordChannelId: string;
    deadline: string;
    networkId: string;
    chainId: number;
    contractVersion: string;
    createdAt: string;
    updatedAt: string;
  };
}
