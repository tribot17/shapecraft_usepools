import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits

function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, "sha512");
}

/**
 * Encrypt a private key using AES-256-CBC
 */
export function encryptPrivateKey(privateKey: string): string {
  const masterKey = process.env.WALLET_ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error("WALLET_ENCRYPTION_KEY environment variable is required");
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  const key = deriveKey(masterKey, salt);

  // Utiliser l'API moderne pour AES-256-CBC
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(privateKey, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Combiner salt + iv + données chiffrées
  const result = Buffer.concat([salt, iv, encrypted]);

  return result.toString("base64");
}

/**
 * Decrypt a private key using AES-256-CBC
 */
export function decryptPrivateKey(encryptedData: string): string {
  const masterKey = process.env.WALLET_ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error("WALLET_ENCRYPTION_KEY environment variable is required");
  }

  // Parse the encrypted data
  const data = Buffer.from(encryptedData, "base64");

  // Extract components (pas de tag avec CBC)
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH);

  // Derive key from master key and salt
  const key = deriveKey(masterKey, salt);

  // Utiliser l'API moderne pour AES-256-CBC
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  // Decrypt the data
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Generate a secure random encryption key (for initial setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
