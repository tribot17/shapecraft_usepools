import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { NextAuthOptions } from "next-auth";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyMessage } from "viem";
import { createUserWithWallet } from "./user/userCreation";

const prisma = new PrismaClient();

export async function authenticateWalletUser(credentials: {
  address: string;
  signature: string;
  message: string;
  nonce?: string;
  timestamp?: string;
}) {
  if (!credentials.address || !credentials.signature || !credentials.message) {
    return null;
  }

  try {
    const isValid = verifyMessage({
      address: credentials.address as `0x${string}`,
      message: credentials.message,
      signature: credentials.signature as `0x${string}`,
    });

    if (!isValid) {
      return null;
    }

    let user = await prisma.user.findUnique({
      where: {
        walletAddress: credentials.address.toLowerCase(),
      },
    });

    if (!user) {
      if (!credentials.timestamp || !credentials.nonce) {
        throw new Error("Timestamp and nonce are required");
      }

      user = await createUserWithWallet({
        walletAddress: credentials.address.toLowerCase(),
        signature: credentials.signature,
        timestamp: credentials.timestamp,
        nonce: credentials.nonce,
      });
    }

    return {
      id: user.id,
      email: `${user.walletAddress}@wallet.local`,
      name: user.name || `Wallet ${user.walletAddress.slice(0, 8)}...`,
      walletAddress: user.walletAddress,
    };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      id: "wallet",
      name: "Wallet",
      credentials: {
        address: { label: "Address", type: "text" },
        signature: { label: "Signature", type: "text" },
        message: { label: "Message", type: "text" },
        nonce: { label: "Nonce", type: "text" },
        timestamp: { label: "Timestamp", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        return await authenticateWalletUser(credentials);
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.walletAddress = user.walletAddress;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.walletAddress = token.walletAddress as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};
