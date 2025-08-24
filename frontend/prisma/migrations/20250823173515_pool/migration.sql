/*
  Warnings:

  - The values [ACTIVE] on the enum `PoolStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `description` on the `pools` table. All the data in the column will be lost.
  - You are about to drop the column `managedWalletId` on the `pools` table. All the data in the column will be lost.
  - You are about to drop the column `totalValue` on the `pools` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `pools` table. All the data in the column will be lost.
  - You are about to drop the column `nftTokenId` on the `transactions` table. All the data in the column will be lost.
  - Made the column `encryptedPrivateKey` on table `managed_wallets` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `buyPrice` to the `pools` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `pools` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellPrice` to the `pools` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PoolStatus_new" AS ENUM ('FUNDING', 'OFFER', 'LISTING', 'SOLD', 'PAUSED', 'CLOSED');
ALTER TABLE "public"."pools" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."pools" ALTER COLUMN "status" TYPE "public"."PoolStatus_new" USING ("status"::text::"public"."PoolStatus_new");
ALTER TYPE "public"."PoolStatus" RENAME TO "PoolStatus_old";
ALTER TYPE "public"."PoolStatus_new" RENAME TO "PoolStatus";
DROP TYPE "public"."PoolStatus_old";
ALTER TABLE "public"."pools" ALTER COLUMN "status" SET DEFAULT 'FUNDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."pools" DROP CONSTRAINT "pools_managedWalletId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pools" DROP CONSTRAINT "pools_userId_fkey";

-- AlterTable
ALTER TABLE "public"."managed_wallets" ALTER COLUMN "encryptedPrivateKey" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."pools" DROP COLUMN "description",
DROP COLUMN "managedWalletId",
DROP COLUMN "totalValue",
DROP COLUMN "userId",
ADD COLUMN     "buyPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "creatorId" TEXT NOT NULL,
ADD COLUMN     "sellPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalContribution" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'FUNDING';

-- AlterTable
ALTER TABLE "public"."transactions" DROP COLUMN "nftTokenId";

-- CreateTable
CREATE TABLE "public"."pool_participants" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contribution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pool_participants_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."pools" ADD CONSTRAINT "pools_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pool_participants" ADD CONSTRAINT "pool_participants_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "public"."pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pool_participants" ADD CONSTRAINT "pool_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
