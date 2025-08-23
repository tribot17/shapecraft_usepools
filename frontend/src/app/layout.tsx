import { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Web3Provider from '@/components/web3/Web3Provider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Scooby - Stock Trading Companion",
  description: "Your AI-powered stock trading companion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
