"use client";

import { useWeb3 } from "@/lib/hooks/useWeb3";
import { executeRequest } from "@/lib/requests";
import { UserWithManagedWallets } from "models/Users";
import { signIn, useSession } from "next-auth/react";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useToast } from "./Toast";

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    address,
    isConnected: walletIsConnected,
    generateOwnershipProof,
  } = useWeb3();
  const { showToast } = useToast();
  const [user, setUser] = useState<UserWithManagedWallets | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (session?.user && !user) {
      fetchUser(session.user.walletAddress);
    }

    setIsInitializing(false);
  }, [session, status]);

  const fetchUser = async (walletAddress: string) => {
    setUserLoading(true);
    const _user = await executeRequest(
      `/api/users?address=${walletAddress}`,
      null,
      "GET"
    );
    console.log("🚀 ~ fetchUser ~ _user:", _user);

    if (_user) setUser(_user);
    setUserLoading(false);
  };

  const handleSignIn = async () => {
    if (!walletIsConnected || !address) {
      showToast("Please connect your wallet first", "error");
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

      if (response?.ok) {
        fetchUser(proof.walletAddress);
        showToast("Successfully authenticated!", "success");
        return true;
      } else {
        showToast("Authentication failed", "error");
        return false;
      }
    } catch (error) {
      console.error("Authentication error:", error);
      showToast("Authentication failed", "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    // NextAuth gère la déconnexion automatiquement
    showToast("Successfully signed out", "success");
  };

  const isAuthenticated = !!user || status === "authenticated";

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isInitializing,
    userLoading,
    fetchUser,
    signIn: handleSignIn,
    signOut,
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
