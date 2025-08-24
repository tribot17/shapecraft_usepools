import { verifyMessage } from "viem";
import { useAccount, useWalletClient } from "wagmi";

export interface MessageComponents {
  walletAddress: string;
  timestamp: number;
  nonce: string;
  fullMessage: string;
}

export interface WalletOwnershipProof {
  walletAddress: string;
  signature: string;
  message: string;
  timestamp: number;
  nonce: string;
}

export interface SignatureData {
  message: string;
  signature: string;
  signer: string;
  timestamp: number;
}

export function generateOwnershipMessage(
  walletAddress: string,
  nonce?: string
): MessageComponents {
  const timestamp = Date.now();
  const messageNonce = nonce || Math.random().toString(36).substring(2, 15);

  const fullMessage = `I am the owner of wallet ${walletAddress}.\n\nTimestamp: ${timestamp}\nNonce: ${messageNonce}\n\nThis signature is used to verify wallet ownership for ShapeCraft UsePools.`;

  return {
    walletAddress,
    timestamp,
    nonce: messageNonce,
    fullMessage,
  };
}

export function useRequestSignature() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const signMessage = async (message: string): Promise<SignatureData> => {
    if (!address) throw new Error("No wallet connected");

    if (!walletClient) throw new Error("No wallet client available");

    try {
      const signature = await walletClient.signMessage({
        message,
        account: address,
      });

      return {
        message,
        signature,
        signer: address,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(
        `Failed to sign message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return { signMessage };
}

export async function verifySignature(
  signatureData: SignatureData
): Promise<boolean> {
  try {
    return await verifyMessage({
      address: signatureData.signer as `0x${string}`,
      message: signatureData.message,
      signature: signatureData.signature as `0x${string}`,
    });
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

export async function verifyWalletOwnershipProof(
  proof: WalletOwnershipProof
): Promise<boolean> {
  return await verifySignature({
    message: proof.message,
    signature: proof.signature,
    signer: proof.walletAddress,
    timestamp: proof.timestamp,
  });
}

export function useGenerateWalletOwnershipProof() {
  const { signMessage } = useRequestSignature();

  const generateProof = async (
    walletAddress: string
  ): Promise<WalletOwnershipProof> => {
    const messageComponents = generateOwnershipMessage(
      walletAddress.toLowerCase()
    );
    const signatureData = await signMessage(messageComponents.fullMessage);

    return {
      walletAddress,
      signature: signatureData.signature,
      message: signatureData.message,
      timestamp: messageComponents.timestamp,
      nonce: messageComponents.nonce,
    };
  };

  return { generateProof };
}
