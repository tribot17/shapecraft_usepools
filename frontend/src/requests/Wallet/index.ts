import { executeRequest } from "@/lib/requests";

interface WithdrawRequest {
  amount: string;
  to: string;
  walletId: string;
}

export class WalletRequest {
  static async getWallets() {
    return await executeRequest(`/api/wallets`, {}, "GET");
  }

  static async createWallet(userId: string) {
    return await executeRequest(
      `/api/wallets`,
      {
        userId: userId,
      },
      "POST"
    );
  }

  static async withdraw({ amount, to, walletId }: WithdrawRequest) {
    return await executeRequest(
      `/api/wallets/withdraw`,
      { amount, to, walletId },
      "POST"
    );
  }
}
