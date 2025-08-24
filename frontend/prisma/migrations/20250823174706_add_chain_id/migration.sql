/*
  Warnings:

  - You are about to drop the column `lastBalance` on the `managed_wallets` table. All the data in the column will be lost.
  - You are about to drop the column `lastSyncedAt` on the `managed_wallets` table. All the data in the column will be lost.
  - Added the required column `chainId` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."managed_wallets" DROP COLUMN "lastBalance",
DROP COLUMN "lastSyncedAt";

-- AlterTable
ALTER TABLE "public"."pools" ADD COLUMN     "chainId" INTEGER NOT NULL DEFAULT 360;

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "chainId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."wallet_balances" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "balance" TEXT NOT NULL DEFAULT '0',
    "balanceETH" TEXT NOT NULL DEFAULT '0',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_balances_walletId_chainId_key" ON "public"."wallet_balances"("walletId", "chainId");

-- AddForeignKey
ALTER TABLE "public"."wallet_balances" ADD CONSTRAINT "wallet_balances_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."managed_wallets"("walletId") ON DELETE CASCADE ON UPDATE CASCADE;
