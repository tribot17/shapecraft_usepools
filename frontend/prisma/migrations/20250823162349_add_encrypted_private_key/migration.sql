/*
  Warnings:

  - You are about to drop the column `email` on the `users` table. All the data in the column will be lost.
  - Added the required column `encryptedPrivateKey` to the `managed_wallets` table without a default value. This is not possible if the table is not empty.

*/

-- DropIndex
DROP INDEX "public"."users_email_key";

-- AlterTable - Add columns with default values first
ALTER TABLE "public"."managed_wallets" 
ADD COLUMN     "encryptedPrivateKey" TEXT DEFAULT 'MIGRATION_PLACEHOLDER',
ADD COLUMN     "lastBalance" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3);

-- Remove default value to make it required for new records
ALTER TABLE "public"."managed_wallets" ALTER COLUMN "encryptedPrivateKey" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "email";

-- Warning: Les wallets existants auront 'MIGRATION_PLACEHOLDER' comme clé chiffrée
-- Vous devrez soit:
-- 1. Supprimer ces wallets et les recréer
-- 2. Ou migrer manuellement vers le nouveau système
