import { executeRequest } from "@/lib/requests";

interface CreateUserParams {
  walletAddress: string;
  signature: string;
  timestamp: string;
  nonce: string;
}

export class UserRequest {
  static async getUserByWalletAddress(walletAddress: string) {
    return await executeRequest(
      `/api/users?address=${walletAddress}`,
      null,
      "GET"
    );
  }

  static async createUser({
    walletAddress,
    signature,
    timestamp,
    nonce,
  }: CreateUserParams) {
    return await executeRequest(
      `/api/users/create`,
      { walletAddress, signature, timestamp, nonce },
      "POST"
    );
  }
}
