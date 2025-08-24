import { authOptions } from "@/lib/auth";
import { decryptPrivateKeyAny } from "@/lib/crypto/encryption";
import { getProvider } from "@/lib/web3/config";
import { getEventFromTransaction } from "@/lib/web3/events";
import { OpenSeaClient } from "@/services/opensea/client";
import { PoolService } from "@/services/Pool";
import { createSessionFromWallet, usePoolsClient } from "@/services/usepools";
import { ethers } from "ethers";
import { addUsePoolsId, createPool } from "models/Pool";
import { getUserByWalletAddress } from "models/Users";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const internalCall = req.headers.get("x-internal-call");

  let walletAddress: string;

  if (internalCall === "true" && body.wallet_address) {
    walletAddress = body.wallet_address;
  } else {
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
    buyPrice,
    sellPrice,
    chainId,
    collection_slug,
  } = body;
  console.log("🚀 ~ POST ~ collection_slug:", collection_slug);

  const creatorPrivateKey = decryptPrivateKeyAny(
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
    buyPrice: Number(buyPriceWithfee),
    sellPrice: Number(ethers.parseEther(sellPrice.toString())),
    totalContribution: 0,
    creatorId: creator.id,
  });

  const openseaCollection = await OpenSeaClient.getInstance().getCollection(
    collection_slug
  );
  console.log("🚀 ~ POST ~ openseaCollection:", openseaCollection);

  const usepoolsSession = createSessionFromWallet(creator.walletAddress);

  const usepoolsPool = await usePoolsClient.createPool(usepoolsSession, {
    poolName: name,
    escrowAddress: event.args.poolAddress as string,
    poolDescription: "Pool description",
    poolAddress: event.args.poolAddress as string,
    poolPhilosophy: "Pool philosophy",
    poolImage: openseaCollection.image_url,
    collectionName: openseaCollection.name,
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

  await addUsePoolsId(pool.id, usepoolsPool.pool.id);

  return NextResponse.json(pool);
}
