import { verifyWalletOwnershipProof } from "@/lib/web3/signature";
import { createUser } from "models/Users";
import { v4 as uuidv4 } from "uuid";

interface CreateUserParams {
  walletAddress: string;
  signature: string;
  timestamp: string;
  nonce: string;
}

export async function createUserWithWallet({
  walletAddress,
  signature,
  timestamp,
  nonce,
}: CreateUserParams) {
  const fullMessage = `I am the owner of wallet ${walletAddress}.\n\nTimestamp: ${timestamp}\nNonce: ${nonce}\n\nThis signature is used to verify wallet ownership for ShapeCraft UsePools.`;

  const isSignatureValid = await verifyWalletOwnershipProof({
    walletAddress,
    signature,
    message: fullMessage,
    timestamp: Number(timestamp),
    nonce,
  });

  if (!isSignatureValid) {
    throw new Error("Invalid signature");
  }

  const userId = uuidv4();
  const user = await createUser(walletAddress, userId, userId);

  return user;
}
