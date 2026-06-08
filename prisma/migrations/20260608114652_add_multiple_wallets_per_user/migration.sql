-- Drop the unique constraint on userId, allowing multiple wallets per user
ALTER TABLE "Wallet" DROP CONSTRAINT IF EXISTS "Wallet_userId_key";

-- Add optional label column
ALTER TABLE "Wallet" ADD COLUMN IF NOT EXISTS "label" TEXT;

-- Add composite unique constraint on (userId, publicKey) to prevent duplicate entries
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_publicKey_key" UNIQUE ("userId", "publicKey");
