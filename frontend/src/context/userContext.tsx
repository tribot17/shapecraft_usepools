"use client";

import { useWeb3 } from "@/hooks/useWeb3";
import { UserRequest } from "@/requests/User";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { UserWithManagedWallets } from "models/Users";
import {
  signOut as nextAuthSignOut,
  signIn,
  useSession,
} from "next-auth/react";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { useDisconnect } from "wagmi";

interface AuthContextType {
  user: UserWithManagedWallets | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  userLoading: boolean;
  fetchUser: (walletAddress: string) => Promise<void>;
  signIn: () => Promise<boolean>;
  signOut: () => void;
}

const UserContext = createContext<AuthContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithManagedWallets | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userLoading, setUserLoading] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const {
    address,
    isConnected: isWalletConnected,
    generateOwnershipProof,
  } = useWeb3();
  const { disconnect } = useDisconnect();

  const publicRoutes = ["/", "/chat"];
  const isPublicRoute =
    publicRoutes.includes(pathname) || pathname.startsWith("/chat");

  useEffect(() => {
    if (status === "loading") return;

    if (session?.user && !user) {
      fetchUser(session.user.walletAddress);
    }

    setIsInitializing(false);
  }, [session, status, user]);

  const fetchUser = async (walletAddress: string) => {
    setUserLoading(true);
    try {
      const user = await UserRequest.getUserByWalletAddress(walletAddress);
      setUser(user);
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setUserLoading(false);
      setIsLoading(false);
    }
  };

  const handleSignIn = async (): Promise<boolean> => {
    if (!isWalletConnected || !address) {
      return false;
    }

    setIsLoading(true);

    try {
      const proof = await generateOwnershipProof(address);

      const response = await signIn("wallet", {
        address: proof.walletAddress,
        signature: proof.signature,
        message: proof.message,
        nonce: proof.nonce,
        timestamp: proof.timestamp,
        redirect: false,
      });

      if (!response) {
        return false;
      }

      if (response.ok) {
        await fetchUser(address);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error fetching user:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isInitializing,
    userLoading,
    fetchUser,
    signIn: handleSignIn,
    signOut: async () => {
      try {
        // Disconnect wallet session
        disconnect();
      } catch {}
      try {
        await nextAuthSignOut({ redirect: false });
      } catch {}
      try {
        localStorage.removeItem("scoobyUser");
      } catch {}
      setUser(null);
    },
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#141414]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (isPublicRoute) {
    return (
      <UserContext.Provider value={value}>{children}</UserContext.Provider>
    );
  }

  if (!isWalletConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#141414]">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-white">
            Wallet connection required
          </h2>
          <p className="text-white/60">
            You need to connect your wallet to access this page
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}
