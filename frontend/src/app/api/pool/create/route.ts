import { authOptions } from "@/lib/auth";
import { decryptPrivateKey } from "@/lib/crypto/encryption";
import { getProvider } from "@/lib/web3/config";
import { getEventFromTransaction } from "@/lib/web3/events";
import { PoolService } from "@/services/Pool";
import { createSessionFromWallet, usePoolsClient } from "@/services/usepools";
import { ethers } from "ethers";
import { createPool } from "models/Pool";
import { getUserByWalletAddress } from "models/Users";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user.walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creator = await getUserByWalletAddress(session.user.walletAddress);

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
    chainId,
    collection_slug,
  } = await req.json();

  const creatorPrivateKey = decryptPrivateKey(
    creator.managedWallets[0].encryptedPrivateKey
  );

  const poolService = new PoolService(null, creatorPrivateKey, chainId);

  const creatorFeeWei = creatorFee * 10 ** 16;
  const buyPriceWei = buyPrice * 10 ** 18;
  const sellPriceWei = sellPrice * 10 ** 18;
  const buyPriceWithfee = buyPriceWei + buyPriceWei * (0.001 / 100);
  const transaction = await poolService.createPool({
    nftCollectionAddress,
    creatorFee: creatorFeeWei.toString(),
    name: "PLS-POOL",
    symbol: "PLS-POOL",
  });

  const event = await getEventFromTransaction({
    txHash: transaction.hash,
    eventName: "PoolCreated",
    contractType: "PoolFactory",
    chainId,
    provider: getProvider(chainId),
  });

  if (!event)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const pool = await createPool({
    name,
    nftCollectionAddress,
    creatorFee: parseFloat(creatorFee),
    poolAddress: event.args.poolAddress as string,
    poolType,
    buyPrice: Number(buyPriceWithfee),
    sellPrice: Number(ethers.parseEther(sellPrice.toString())),
    totalContribution: 0,
    creatorId: creator.id,
  });

  const usepoolsSession = createSessionFromWallet(creator.walletAddress);

  const usepoolsPool = await usePoolsClient.createPool(usepoolsSession, {
    poolName: name,
    escrowAddress: event.args.poolAddress as string,
    poolDescription: "Pool description",
    poolAddress: event.args.poolAddress as string,
    poolPhilosophy: "Pool philosophy",
    poolImage: "Pool image",
    collectionName: "Collection name",
    collectionSlug: collection_slug,
    creator: creator.managedWallets[0].address,
    creatorFee: creatorFeeWei.toString(),
    collectionAddress: nftCollectionAddress,
    targetType: "collection",
    tokenId: "0",
    buyPrice: buyPriceWithfee.toString(),
    buyPriceWithFeeEthers: buyPriceWithfee.toString(),
    sellPrice: sellPriceWei.toString(),
    marketType: "opensea",
    isERC721: true,
    chainId,
    deadline: "1000000000000000000",
    contractVersion: "1.7",
  });
  console.log("🚀 ~ POST ~ usepoolsPool:", usepoolsPool);

  return NextResponse.json(pool);
}
