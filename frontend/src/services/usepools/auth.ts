import { signMessageWithManagedWallet } from "@/lib/web3/wallet";
import { getUserByWalletAddress } from "models/Users";

export const poolMessageToSign = `
  Welcom to UsePools !

  You are about to sign a message to connect your wallet to UsePools.

  Nonce : 
`;

interface AuthResult {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    address: string;
    username: string;
  };
  error?: string;
}

interface UserSession {
  user: {
    walletAddress: string;
  };
}

export class UsePoolsAuthService {
  private static instance: UsePoolsAuthService;
  private readonly apiUrl: string;
  private authCache = new Map<string, { token: string; expiresAt: number }>();

  private constructor() {
    this.apiUrl = process.env.POOL_URL || "";
    if (!this.apiUrl) {
      throw new Error("POOL_URL environment variable is required");
    }
  }

  static getInstance(): UsePoolsAuthService {
    if (!UsePoolsAuthService.instance) {
      UsePoolsAuthService.instance = new UsePoolsAuthService();
    }
    return UsePoolsAuthService.instance;
  }

  async authenticateUser(session: UserSession): Promise<AuthResult> {
    try {
      const user = await getUserByWalletAddress(session.user.walletAddress);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      const userWallet = user.managedWallets[0];
      if (!userWallet) {
        return { success: false, error: "No managed wallet found" };
      }

      const cached = this.authCache.get(userWallet.address);
      if (cached && cached.expiresAt > Date.now()) {
        return {
          success: true,
          token: cached.token,
          user: {
            id: userWallet.address,
            address: userWallet.address,
            username: userWallet.address,
          },
        };
      }

      const time = (new Date().getTime() / 1000).toString();
      const nonce = Math.floor(Math.random() * 100000) + time;
      const message = poolMessageToSign + nonce;

      const signature = await signMessageWithManagedWallet(
        userWallet.walletId,
        message
      );

      if (!signature) {
        return { success: false, error: "Failed to sign message" };
      }

      const authResult = await this.callAuthAPI({
        address: userWallet.address,
        signature,
        nonce,
      });

      if (authResult.success && authResult.token) {
        this.authCache.set(userWallet.address, {
          token: authResult.token,
          expiresAt: Date.now() + 60 * 60 * 1000,
        });
      }

      return authResult;
    } catch (error) {
      console.error("UsePools authentication error:", error);
      return { success: false, error: "Authentication failed" };
    }
  }

  async getAuthToken(session: UserSession): Promise<string | null> {
    const result = await this.authenticateUser(session);
    return result.success ? result.token || null : null;
  }

  isAuthenticated(walletAddress: string): boolean {
    const cached = this.authCache.get(walletAddress);
    return cached ? cached.expiresAt > Date.now() : false;
  }

  invalidateAuth(walletAddress: string): void {
    this.authCache.delete(walletAddress);
  }

  private async callAuthAPI(credentials: {
    address: string;
    signature: string;
    nonce: string;
  }): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/wallet-signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `API Error: ${errorText}` };
      }

      const data = await response.json();
      return {
        success: true,
        token: data.token,
        user: data.user,
      };
    } catch (error) {
      console.error("API call error:", error);
      return { success: false, error: "Network error" };
    }
  }
}

// Instance singleton
export const usePoolsAuth = UsePoolsAuthService.getInstance();
