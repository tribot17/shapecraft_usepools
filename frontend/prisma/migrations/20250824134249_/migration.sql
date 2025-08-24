/*
  Warnings:

  - A unique constraint covering the columns `[usepools_id]` on the table `pools` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."AutoInvestmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."managed_wallets" ADD COLUMN     "usepools_id" TEXT;

-- AlterTable
ALTER TABLE "public"."pools" ADD COLUMN     "usepools_id" TEXT;

-- CreateTable
CREATE TABLE "public"."auto_investment_rules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxBuyPrice" DOUBLE PRECISION,
    "minSellPrice" DOUBLE PRECISION,
    "maxCreatorFee" DOUBLE PRECISION,
    "allowedCollections" TEXT[],
    "poolTypes" "public"."PoolType"[],
    "chains" INTEGER[],
    "investmentAmount" DOUBLE PRECISION NOT NULL,
    "maxInvestmentPerDay" DOUBLE PRECISION,
    "walletId" TEXT NOT NULL,
    "minPoolAge" INTEGER,
    "requireVerifiedCreator" BOOLEAN NOT NULL DEFAULT false,
    "totalInvested" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInvestments" INTEGER NOT NULL DEFAULT 0,
    "lastTriggered" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_investment_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auto_investments" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "txHash" TEXT,
    "status" "public"."AutoInvestmentStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_investments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auto_investments_ruleId_poolId_key" ON "public"."auto_investments"("ruleId", "poolId");

-- CreateIndex
CREATE UNIQUE INDEX "pools_usepools_id_key" ON "public"."pools"("usepools_id");

-- AddForeignKey
ALTER TABLE "public"."auto_investment_rules" ADD CONSTRAINT "auto_investment_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auto_investment_rules" ADD CONSTRAINT "auto_investment_rules_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."managed_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auto_investments" ADD CONSTRAINT "auto_investments_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."auto_investment_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auto_investments" ADD CONSTRAINT "auto_investments_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "public"."pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auto_investments" ADD CONSTRAINT "auto_investments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
