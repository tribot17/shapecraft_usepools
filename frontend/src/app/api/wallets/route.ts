import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { ethers } from "ethers";
import { NextRequest, NextResponse } from "next/server";

// Encryption helper functions
const ENCRYPTION_KEY =
  process.env.WALLET_ENCRYPTION_KEY || "your-secret-key-32-characters-long!";
const ALGORITHM = "aes-256-cbc";

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift()!, "hex");
  const encryptedText = parts.join(":");
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// GET /api/wallets - Get wallets for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const wallets = await prisma.managedWallet.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        balances: true,
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Remove private keys from response
    const sanitizedWallets = wallets.map((wallet) => ({
      ...wallet,
      encryptedPrivateKey: undefined,
    }));

    return NextResponse.json(sanitizedWallets);
  } catch (error) {
    console.error("Error fetching wallets:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/wallets - Create a new wallet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    const encryptedPrivateKey = encrypt(wallet.privateKey);

    // Create wallet in database
    const managedWallet = await prisma.managedWallet.create({
      data: {
        walletId: wallet.address.toLowerCase(),
        address: wallet.address,
        encryptedPrivateKey,
        name: name || `Wallet ${Date.now()}`,
        userId,
        balances: {
          create: [
            {
              chainId: 360, // Shape chain
              balance: "0",
              balanceETH: "0.0",
            },
          ],
        },
      },
      include: {
        balances: true,
        _count: {
          select: { transactions: true },
        },
      },
    });

    // Remove private key from response
    const { encryptedPrivateKey: _, ...sanitizedWallet } = managedWallet;

    return NextResponse.json(sanitizedWallet, { status: 201 });
  } catch (error) {
    console.error("Error creating wallet:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
