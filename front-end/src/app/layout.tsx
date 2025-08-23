import {
  AuthProvider,
  QueryProvider,
  SessionProvider,
  ToastProvider,
  WagmiAppProvider,
} from "@/providers";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShapeCraft UsePools",
  description: "NFT collection discovery and investment platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <WagmiAppProvider>
            <QueryProvider>
              <ToastProvider>
                <AuthProvider>{children}</AuthProvider>
              </ToastProvider>
            </QueryProvider>
          </WagmiAppProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
