import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { NextAuthOptions } from "next-auth";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyMessage } from "viem";

const prisma = new PrismaClient();

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
        if (
          !credentials?.address ||
          !credentials?.signature ||
          !credentials?.message
        ) {
          return null;
        }

        try {
          // Vérifier la signature
          const isValid = verifyMessage({
            address: credentials.address as `0x${string}`,
            message: credentials.message,
            signature: credentials.signature as `0x${string}`,
          });

          if (!isValid) {
            return null;
          }

          // Trouver ou créer l'utilisateur
          let user = await prisma.user.findUnique({
            where: {
              walletAddress: credentials.address.toLowerCase(),
            },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                walletAddress: credentials.address.toLowerCase(),
                name: `Wallet ${credentials.address.slice(0, 8)}...`,
                privyUserId: `wallet_${credentials.address.toLowerCase()}`,
              },
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
