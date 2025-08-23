import { WagmiAppProvider } from "@/components/WagmiProvider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Shapecraft UsePools - Wallet Connection",
  description: "Connect your wallet to Shapecraft UsePools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <WagmiAppProvider>{children}</WagmiAppProvider>
      </body>
    </html>
  );
}
