import { authOptions } from "@/lib/auth";
import { decryptPrivateKeyAny } from "@/lib/crypto/encryption";
import { getProvider } from "@/lib/web3/config";
import { getEventFromTransaction } from "@/lib/web3/events";
import { PoolService } from "@/services/Pool";
import { ethers } from "ethers";
import { createPool } from "models/Pool";
import { getUserByWalletAddress } from "models/Users";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const internalCall = req.headers.get("x-internal-call");
  
  let walletAddress: string;
  
  // Check if this is an internal server-to-server call
  if (internalCall === "true" && body.wallet_address) {
    // Server-to-server call - use wallet_address from body
    walletAddress = body.wallet_address;
  } else {
    // Regular user call - use session
    const session = await getServerSession(authOptions);
    if (!session?.user.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    walletAddress = session.user.walletAddress;
  }

  const creator = await getUserByWalletAddress(walletAddress);

  if (!creator) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const {
    name,
    nftCollectionAddress,
    creatorFee,
    poolType,
    buyPrice,
    sellPrice,
    totalContribution,
    chainId,
  } = body;
  console.log("🚀 ~ POST ~ chainId:", chainId);

  const creatorPrivateKey = decryptPrivateKeyAny(
    creator.managedWallets[0].encryptedPrivateKey
  );

  const poolService = new PoolService(null, creatorPrivateKey, chainId);

  const creatorFeeWei = creatorFee * 10 ** 16;
  const transaction = await poolService.createPool({
    nftCollectionAddress,
    creatorFee: creatorFeeWei.toString(),
    name: "PLS-POOL",
    symbol: "PLS-POOL",
  });
  console.log("🚀 ~ POST ~ transaction:", transaction);

  const event = await getEventFromTransaction({
    txHash: transaction.hash,
    eventName: "PoolCreated",
    contractType: "PoolFactory",
    chainId,
    provider: getProvider(chainId),
  });
  console.log("🚀 ~ POST ~ event:", event);

  if (!event)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const pool = await createPool({
    name,
    nftCollectionAddress,
    creatorFee: parseFloat(creatorFee),
    poolAddress: event.args.poolAddress as string,
    poolType,
    buyPrice: Number(ethers.parseEther(buyPrice.toString())),
    sellPrice: Number(ethers.parseEther(sellPrice.toString())),
    totalContribution,
    creatorId: creator.id,
  });

  return NextResponse.json(pool);
}
