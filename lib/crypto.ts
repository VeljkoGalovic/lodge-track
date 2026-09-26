import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto"

/**
 * Encryption for secrets that must be recovered verbatim rather than hashed —
 * today that is the TOTP second-factor secret, which has to be replayed to
 * verify a member's code.
 *
 * AES-256-GCM is authenticated: a ciphertext that has been tampered with fails
 * to decrypt instead of yielding plausible garbage.
 *
 * The key is derived from `AUTH_SECRET`. Rotating that value therefore makes
 * existing secrets unreadable — the consequence is that members re-enrol in 2FA,
 * which is why the derived key is versioned below rather than the raw secret
 * being used directly.
 */

/** Version tag on the ciphertext, so a future key or algorithm can be told apart. */
const VERSION = "v1"
/** Fixed salt — the derivation is for length, not for resisting a dictionary. */
const KEY_SALT = "lodgetrack.secret.v1"
const KEY_BYTES = 32
const IV_BYTES = 12

function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error("AUTH_SECRET must be set to encrypt or decrypt stored secrets.")
  }
  // `AUTH_SECRET` is an arbitrary-length string; scrypt stretches it to the
  // exact 32 bytes AES-256 requires.
  return scryptSync(secret, KEY_SALT, KEY_BYTES)
}

/** Returns `version:iv:ciphertext:authTag`, all base64. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])

  return [
    VERSION,
    iv.toString("base64"),
    ciphertext.toString("base64"),
    cipher.getAuthTag().toString("base64"),
  ].join(":")
}

/**
 * Returns `null` — never throws — when the value is malformed, tampered with, or
 * was written under a key that no longer exists. Callers on the sign-in path
 * treat that as "no usable secret" rather than crashing the request.
 */
export function decryptSecret(stored: string): string | null {
  const [version, iv, ciphertext, authTag] = stored.split(":")
  if (version !== VERSION || !iv || !ciphertext || !authTag) return null

  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"))
    decipher.setAuthTag(Buffer.from(authTag, "base64"))
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8")
  } catch {
    return null
  }
}

/** A URL-safe single-use token: 256 bits of entropy, so guessing is not a threat. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url")
}

/**
 * Generates a full API key with prefix and random suffix.
 * Format: lt_live_{random} or lt_test_{random}
 * Returns { rawKey, keyHash, keyPrefix }
 */
export function generateApiKey(isLive: boolean = true): { rawKey: string; keyHash: string; keyPrefix: string } {
  const prefix = isLive ? "lt_live_" : "lt_test_"
  const randomPart = randomBytes(24).toString("base64url") 
  const rawKey = `${prefix}${randomPart}`
  const keyHash = createHash("sha256").update(rawKey).digest("hex")
  
  // Fix: Include part of the random string so prefixes are unique (e.g., first 16 characters)
  const keyPrefix = rawKey.slice(0, 16) 
  
  return { rawKey, keyHash, keyPrefix }
}

/**
 * Verifies an API key against its hash.
 * Returns true if the key matches.
 */
export function verifyApiKey(rawKey: string, keyHash: string): boolean {
  const computedHash = createHash("sha256").update(rawKey).digest("hex")
  return computedHash === keyHash
}
