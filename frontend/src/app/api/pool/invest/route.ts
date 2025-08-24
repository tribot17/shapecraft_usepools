import { authOptions } from "@/lib/auth";
import { decryptPrivateKeyAny } from "@/lib/crypto/encryption";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/web3/config";
import { getEventFromTransaction } from "@/lib/web3/events";
import { PoolService } from "@/services/Pool";
import { createSessionFromWallet, usePoolsClient } from "@/services/usepools";
import { ethers } from "ethers";
import { getPoolById } from "models/Pool";
import { getUserByWalletAddress } from "models/Users";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
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

    const user = await getUserByWalletAddress(walletAddress.toLowerCase());

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { poolId, amount } = body;

    const chainId = 11011;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid investment amount" },
        { status: 400 }
      );
    }

    let pool;
    if (poolId) {
      pool = await getPoolById(poolId);
    } else {
      return NextResponse.json(
        { error: "Pool ID  is required" },
        { status: 400 }
      );
    }

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    if (!user.managedWallets || user.managedWallets.length === 0) {
      return NextResponse.json(
        { error: "No managed wallet found" },
        { status: 400 }
      );
    }

    const managedWallet = user.managedWallets[0];
    const privateKey = decryptPrivateKeyAny(managedWallet.encryptedPrivateKey);

    const poolService = new PoolService(pool.poolAddress, privateKey, chainId);

    const amountInWEI = ethers.parseEther(amount.toString());

    console.log(
      `💰 Investing ${amount} ETH (${amountInWEI.toString()} WEI) in pool ${
        pool.name
      }`
    );

    const transaction = await poolService.invest(Number(amountInWEI));

    console.log(`✅ Investment transaction: ${transaction.hash}`);

    const event = await getEventFromTransaction({
      txHash: transaction.hash,
      eventName: "ParticipationUpdated",
      contractType: "Pool",
      chainId,
      provider: getProvider(chainId),
    });

    if (!event) {
      console.warn(
        "Investment event not found, but transaction was successful"
      );
    }

    const usepoolsSession = createSessionFromWallet(user.walletAddress);

    try {
      if (pool.usepools_id) {
        await usePoolsClient.joinPool(usepoolsSession, {
          poolId: pool.usepools_id,
          amountInWEI: Number(amountInWEI),
          transactionHash: transaction.hash,
        });
      }

      console.log("✅ UsePools API notified successfully");
    } catch (usepoolsError) {
      console.error("Failed to notify UsePools API:", usepoolsError);
    }

    const updatedPool = await prisma.pool.update({
      where: { id: pool.id },
      data: {
        totalContribution: pool.totalContribution + amount,
      },
    });

    const transactionRecord = await prisma.transaction.create({
      data: {
        txHash: transaction.hash,
        type: "DEPOSIT",
        amount: amount.toString(),
        tokenAddress: pool.poolAddress,
        chainId: chainId,
        status: "CONFIRMED",
        userId: user.id,
        managedWalletId: managedWallet.id,
        poolId: pool.id,
      },
    });

    return NextResponse.json({
      success: true,
      investment: {
        id: transactionRecord.id,
        amount: amount,
        amountETH: amount.toFixed(6),
        txHash: transaction.hash,
        status: "COMPLETED",
        poolId: pool.id,
        poolName: pool.name,
        poolAddress: pool.poolAddress,
        createdAt: transactionRecord.createdAt.toISOString(),
      },
      pool: {
        id: pool.id,
        name: pool.name,
        totalContribution: updatedPool.totalContribution,
        updatedAt: updatedPool.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error executing investment:", error);
    return NextResponse.json(
      { error: "Failed to execute investment" },
      { status: 500 }
    );
  }
}
