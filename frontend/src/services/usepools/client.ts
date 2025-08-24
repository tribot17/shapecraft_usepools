/**
 * 🌊 UsePools API Client
 *
 * Client HTTP pour interagir avec l'API UsePools
 * Gère automatiquement l'authentification avant chaque requête
 */

import { usePoolsAuth } from "./auth";

interface UserSession {
  user: {
    walletAddress: string;
  };
}

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: Record<string, unknown> | string | number | boolean | null | object;
  headers?: Record<string, string>;
}

export class UsePoolsClient {
  private static instance: UsePoolsClient;
  private readonly apiUrl: string;

  private constructor() {
    this.apiUrl = process.env.POOL_URL || "";
    if (!this.apiUrl) {
      throw new Error("POOL_URL environment variable is required");
    }
  }

  static getInstance(): UsePoolsClient {
    if (!UsePoolsClient.instance) {
      UsePoolsClient.instance = new UsePoolsClient();
    }
    return UsePoolsClient.instance;
  }

  async request<T = unknown>(
    endpoint: string,
    session: UserSession,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const token = await usePoolsAuth.getAuthToken(session);
    if (!token) {
      throw new Error("Failed to authenticate with UsePools");
    }

    const { method = "GET", body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `${token}`,
      ...headers,
    };

    const url = `${this.apiUrl}${
      endpoint.startsWith("/") ? "" : "/"
    }${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        usePoolsAuth.invalidateAuth(session.user.walletAddress);

        const newToken = await usePoolsAuth.getAuthToken(session);
        if (!newToken) {
          throw new Error("Re-authentication failed");
        }

        requestHeaders.Authorization = `Bearer ${newToken}`;

        const retryResponse = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!retryResponse.ok) {
          throw new Error(
            `API Error: ${retryResponse.status} ${retryResponse.statusText}`
          );
        }

        return retryResponse.json();
      }

      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async get<T = unknown>(endpoint: string, session: UserSession): Promise<T> {
    return this.request<T>(endpoint, session, { method: "GET" });
  }

  async post<T = unknown>(
    endpoint: string,
    session: UserSession,
    body?: Record<string, unknown> | string | number | boolean | null | object
  ): Promise<T> {
    return this.request<T>(endpoint, session, { method: "POST", body });
  }

  async put<T = unknown>(
    endpoint: string,
    session: UserSession,
    body?: Record<string, unknown> | string | number | boolean | null | object
  ): Promise<T> {
    return this.request<T>(endpoint, session, { method: "PUT", body });
  }

  async delete<T = unknown>(
    endpoint: string,
    session: UserSession
  ): Promise<T> {
    return this.request<T>(endpoint, session, { method: "DELETE" });
  }

  async patch<T = unknown>(
    endpoint: string,
    session: UserSession,
    body?: Record<string, unknown> | string | number | boolean | null | object
  ): Promise<T> {
    return this.request<T>(endpoint, session, { method: "PATCH", body });
  }

  async createPool(
    session: UserSession,
    poolData: import("./types").CreatePoolRequest
  ): Promise<import("./types").CreatePoolResponse> {
    return this.post<import("./types").CreatePoolResponse>(
      "/api/pool/create",
      session,
      poolData
    );
  }

  async getPools(session: UserSession): Promise<import("./types").PoolData[]> {
    return this.get<import("./types").PoolData[]>("/api/pools", session);
  }

  async getPool(
    session: UserSession,
    poolId: string
  ): Promise<import("./types").PoolData> {
    return this.get<import("./types").PoolData>(
      `/api/pools/${poolId}`,
      session
    );
  }

  async joinPool(
    session: UserSession,
    joinData: import("./types").JoinPoolRequest
  ): Promise<import("./types").JoinPoolResponse> {
    return this.post<import("./types").JoinPoolResponse>(
      "/api/pools/join",
      session,
      joinData
    );
  }

  async exitPool(
    session: UserSession,
    exitData: import("./types").ExitPoolRequest
  ): Promise<import("./types").ExitPoolResponse> {
    return this.post<import("./types").ExitPoolResponse>(
      "/api/pools/exit",
      session,
      exitData
    );
  }

  async getUserPositions(
    session: UserSession
  ): Promise<import("./types").UserPoolPosition[]> {
    return this.get<import("./types").UserPoolPosition[]>(
      "/api/user/positions",
      session
    );
  }

  async getUserAnalytics(
    session: UserSession
  ): Promise<import("./types").UserAnalytics> {
    return this.get<import("./types").UserAnalytics>(
      "/api/user/analytics",
      session
    );
  }
}

export const usePoolsClient = UsePoolsClient.getInstance();

export interface PoolData {
  id: string;
  name: string;
  address: string;
  tvl: number;
  apy: number;
}

export interface UserPoolPosition {
  poolId: string;
  amount: number;
  rewards: number;
}
