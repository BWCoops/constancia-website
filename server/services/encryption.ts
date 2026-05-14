import * as crypto from "crypto";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("encryption");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

let encryptionKey: Buffer | null = null;
let keyWarningLogged = false;

function getEncryptionKey(): Buffer | null {
  if (encryptionKey) {
    return encryptionKey;
  }

  const keyEnv = process.env.PII_ENCRYPTION_KEY;
  
  if (!keyEnv) {
    if (!keyWarningLogged) {
      log.warn("PII_ENCRYPTION_KEY not set. Field encryption is disabled.");
      keyWarningLogged = true;
    }
    return null;
  }

  if (keyEnv.length === KEY_LENGTH * 2) {
    encryptionKey = Buffer.from(keyEnv, "hex");
  } else if (keyEnv.length === KEY_LENGTH) {
    encryptionKey = Buffer.from(keyEnv, "utf8");
  } else {
    log.error("PII_ENCRYPTION_KEY must be 32 bytes (64 hex chars or 32 raw chars)");
    return null;
  }

  if (encryptionKey.length !== KEY_LENGTH) {
    log.error("Invalid key length after parsing");
    encryptionKey = null;
    return null;
  }

  log.info("Field-level encryption initialized successfully");
  return encryptionKey;
}

export interface EncryptedField {
  iv: string;
  ciphertext: string;
  authTag: string;
}

export function encryptField(plaintext: string): string {
  const key = getEncryptionKey();
  
  if (!key) {
    if (process.env.NODE_ENV === "development") {
      return plaintext;
    }
    throw new Error("Encryption key not available");
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
    
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");
    
    const authTag = cipher.getAuthTag();

    const payload: EncryptedField = {
      iv: iv.toString("base64"),
      ciphertext: encrypted,
      authTag: authTag.toString("base64"),
    };

    return Buffer.from(JSON.stringify(payload)).toString("base64");
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to encrypt field");
    throw new Error("Encryption failed");
  }
}

export function decryptField(encryptedData: string): string {
  const key = getEncryptionKey();
  
  if (!key) {
    if (process.env.NODE_ENV === "development") {
      try {
        JSON.parse(Buffer.from(encryptedData, "base64").toString("utf8"));
      } catch {
        return encryptedData;
      }
    }
    throw new Error("Encryption key not available");
  }

  try {
    const payloadJson = Buffer.from(encryptedData, "base64").toString("utf8");
    const payload: EncryptedField = JSON.parse(payloadJson);

    const iv = Buffer.from(payload.iv, "base64");
    const authTag = Buffer.from(payload.authTag, "base64");
    const ciphertext = payload.ciphertext;

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error("Invalid authentication tag length");
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH }) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to decrypt field");
    throw new Error("Decryption failed");
  }
}

export function hashForLookup(value: string): string {
  const salt = process.env.PII_ENCRYPTION_KEY || "default-salt-for-dev";
  return crypto
    .createHmac("sha256", salt)
    .update(value.toLowerCase().trim())
    .digest("hex");
}

export function isEncrypted(value: string): boolean {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "iv" in parsed &&
      "ciphertext" in parsed &&
      "authTag" in parsed
    );
  } catch {
    return false;
  }
}

export function encryptFieldIfNotEncrypted(plaintext: string): string {
  if (isEncrypted(plaintext)) {
    return plaintext;
  }
  return encryptField(plaintext);
}

export function safeDecrypt(value: string): string {
  if (!isEncrypted(value)) {
    return value;
  }
  try {
    return decryptField(value);
  } catch {
    return value;
  }
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("hex");
}
