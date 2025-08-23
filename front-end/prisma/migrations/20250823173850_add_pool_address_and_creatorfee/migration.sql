/*
  Warnings:

  - Added the required column `poolAddress` to the `pools` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."pools" ADD COLUMN     "creatorFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "poolAddress" TEXT NOT NULL;
