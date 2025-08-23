import { hashMessage, verifyMessage } from "viem";
import { useAccount, useWalletClient } from "wagmi";

export interface SignatureData {
  message: string;
  signature: string;
  signer: string;
  timestamp: number;
}

export interface WalletOwnershipProof {
  walletAddress: string;
  signature: string;
  message: string;
  timestamp: number;
  nonce: string;
}

export interface MessageComponents {
  walletAddress: string;
  timestamp: number;
  nonce: string;
  fullMessage: string;
}

/**
 * Génère un message à signer pour prouver la propriété du wallet
 */
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

/**
 * Parse un message signé pour extraire les composants
 */
export function parseOwnershipMessage(
  message: string
): MessageComponents | null {
  try {
    // Regex pour extraire les composants du message
    const walletMatch = message.match(/wallet (0x[a-fA-F0-9]{40})/);
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    const nonceMatch = message.match(/Nonce: ([a-zA-Z0-9]+)/);

    if (!walletMatch || !timestampMatch || !nonceMatch) {
      return null;
    }

    return {
      walletAddress: walletMatch[1],
      timestamp: parseInt(timestampMatch[1]),
      nonce: nonceMatch[1],
      fullMessage: message,
    };
  } catch (error) {
    console.error("Failed to parse ownership message:", error);
    return null;
  }
}

/**
 * Valide les composants d'un message (côté client)
 */
export function validateMessageComponents(
  components: MessageComponents,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes par défaut
): { isValid: boolean; error?: string } {
  const now = Date.now();
  const age = now - components.timestamp;

  if (age > maxAgeMs) {
    return {
      isValid: false,
      error: `Message too old. Age: ${age}ms, Max: ${maxAgeMs}ms`,
    };
  }

  if (!components.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return {
      isValid: false,
      error: "Invalid wallet address format",
    };
  }

  if (!components.nonce || components.nonce.length < 8) {
    return {
      isValid: false,
      error: "Invalid nonce",
    };
  }

  return { isValid: true };
}

export async function requestSignature(
  message: string
): Promise<SignatureData> {
  // Cette fonction doit être utilisée dans un composant React avec les hooks Wagmi
  throw new Error(
    "requestSignature must be used within a React component with Wagmi hooks"
  );
}

/**
 * Hook pour signer un message
 */
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

export function hashMessageForTransaction(message: string): string {
  return hashMessage(message);
}
