"use client";

import { useUserContext } from "@/context/userContext";
import { usePathname } from "next/navigation";

export function useConditionalWallet() {
  const pathname = usePathname();
  const context = useUserContext();

  // Pages qui ne nécessitent pas de connexion wallet
  const publicRoutes = ["/", "/chat"];
  const isPublicRoute =
    publicRoutes.includes(pathname) || pathname.startsWith("/chat");

  if (isPublicRoute) {
    // Sur les pages publiques, le user peut être null
    return {
      ...context,
      user: context.user || null,
      isAuthenticated: !!context.user,
      requiresWallet: false,
    };
  }

  // Sur les pages privées, le user doit exister
  return {
    ...context,
    requiresWallet: true,
  };
}
