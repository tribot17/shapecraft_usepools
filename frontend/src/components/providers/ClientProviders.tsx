"use client";

import Web3Provider from "@/components/web3/Web3Provider";
import { UserProvider } from "@/context/userContext";
import { SessionProvider } from "next-auth/react";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Web3Provider>
      <SessionProvider>
        <UserProvider>{children}</UserProvider>
      </SessionProvider>
    </Web3Provider>
  );
}
