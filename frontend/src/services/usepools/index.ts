export { poolMessageToSign, usePoolsAuth, UsePoolsAuthService } from "./auth";
export {
  UsePoolsClient,
  usePoolsClient,
  type PoolData,
  type UserPoolPosition,
} from "./client";

export type * from "./types";

export const createSessionFromWallet = (walletAddress: string) => ({
  user: { walletAddress },
});

export interface UsePoolsSession {
  user: {
    walletAddress: string;
  };
}
