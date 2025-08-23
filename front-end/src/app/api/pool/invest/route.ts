import { authOptions } from "@/lib/auth";
import { decryptPrivateKey } from "@/lib/crypto/encryption";
import { PoolService } from "@/lib/web3/pool";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { getPoolById } from "models/Pool";
import { createTransaction } from "models/Transaction";
import { getUserByWalletAddress } from "models/Users";
import { getManagedWalletByWalletId } from "models/Wallets";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user.walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { poolId, amount } = await req.json();

  const user = await getUserByWalletAddress(session.user.walletAddress);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const pool = await getPoolById(poolId);

  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  const managedWallet = await getManagedWalletByWalletId(
    user.managedWallets[0].id
  );

  if (!managedWallet) {
    return NextResponse.json(
      { error: "Managed wallet not found" },
      { status: 404 }
    );
  }

  const privateKey = decryptPrivateKey(
    user.managedWallets[0].encryptedPrivateKey
  );

  if (!privateKey) {
    return NextResponse.json(
      { error: "Private key not found" },
      { status: 404 }
    );
  }

  const poolService = new PoolService(
    pool.poolAddress,
    privateKey,
    pool.chainId
  );

  const transaction = await poolService.invest(amount);

  await createTransaction({
    txHash: transaction.hash,
    type: TransactionType.DEPOSIT,
    amount: amount.toString(),
    tokenAddress: pool.poolAddress,
    chainId: pool.chainId,
    status: TransactionStatus.CONFIRMED,
    userId: user.id,
    managedWalletId: managedWallet.id,
    poolId: pool.id,
  });

  return NextResponse.json({ transaction });
}
