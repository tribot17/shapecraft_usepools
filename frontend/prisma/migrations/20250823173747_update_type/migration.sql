/*
  Warnings:

  - The values [BUY,SELL,HOLD,TRADE] on the enum `PoolType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PoolType_new" AS ENUM ('TOKEN', 'COLLECTION');
ALTER TABLE "public"."pools" ALTER COLUMN "poolType" TYPE "public"."PoolType_new" USING ("poolType"::text::"public"."PoolType_new");
ALTER TYPE "public"."PoolType" RENAME TO "PoolType_old";
ALTER TYPE "public"."PoolType_new" RENAME TO "PoolType";
DROP TYPE "public"."PoolType_old";
COMMIT;
