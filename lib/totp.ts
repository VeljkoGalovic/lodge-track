import { createHmac, randomBytes, timingSafeEqual } from "crypto"

/**
 * RFC 6238 TOTP — the algorithm behind Google Authenticator, 1Password, Authy
 * and friends.
 *
 * Written out here rather than pulled from a dependency: it is HMAC over a
 * counter plus a truncation step, small enough to audit in one sitting, and the
 * RFC publishes test vectors. `scripts/totp-vectors.mjs` asserts this file
 * against all six of them.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
const DIGITS = 6
const PERIOD_SECONDS = 30

/**
 * One step either side of now, so a code is accepted for up to 90 seconds
 * around the moment it was generated. That absorbs clock drift and a slow
 * typist without widening the guessing window in any way that matters — an
 * attacker still gets 3 tries out of 10^6 rather than 1.
 */
const DRIFT_STEPS = 1

export const TOTP_DIGITS = DIGITS
export const TOTP_PERIOD_SECONDS = PERIOD_SECONDS

export function base32Encode(bytes: Buffer): string {
  let bits = 0
  let value = 0
  let output = ""

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

/** Tolerates lowercase, spaces and `=` padding, as typed from an authenticator app. */
export function base32Decode(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/[\s=]/g, "")
  let bits = 0
  let value = 0
  const bytes: number[] = []

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character)
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${character}`)
    }
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** 160 bits, the size RFC 4226 §4 recommends for HMAC-SHA1. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20))
}

function counterFor(timeMs: number): Buffer {
  const counter = Math.floor(timeMs / 1000 / PERIOD_SECONDS)
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(BigInt(counter))
  return buffer
}

export function generateCode(secret: string, timeMs: number = Date.now()): string {
  const digest = createHmac("sha1", base32Decode(secret)).update(counterFor(timeMs)).digest()

  /**
   * Dynamic truncation, RFC 4226 §5.3: the low nibble of the final byte selects
   * a 4-byte window, and its top bit is masked off so the result is positive.
   * The nibble is at most 15, so the window always fits inside the 20-byte digest.
   */
  const offset = digest[digest.length - 1] & 0x0f
  const binary = digest.readUInt32BE(offset) & 0x7fffffff

  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, "0")
}

/** Whether `token` is the code for `secret` at `timeMs`, allowing `DRIFT_STEPS` either way. */
export function verifyCode(secret: string, token: string, timeMs: number = Date.now()): boolean {
  const candidate = token.replace(/[\s-]/g, "")
  if (!/^\d{6}$/.test(candidate)) return false

  let candidateBuffer: Buffer
  try {
    candidateBuffer = Buffer.from(candidate)
  } catch {
    return false
  }

  for (let step = -DRIFT_STEPS; step <= DRIFT_STEPS; step++) {
    const expected = Buffer.from(generateCode(secret, timeMs + step * PERIOD_SECONDS * 1000))
    if (timingSafeEqual(expected, candidateBuffer)) return true
  }
  return false
}

/** The `otpauth://` URI an authenticator app reads from a QR code. */
export function buildOtpAuthUri(options: {
  secret: string
  accountName: string
  issuer: string
}): string {
  const { secret, accountName, issuer } = options
  const label = encodeURIComponent(`${issuer}:${accountName}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}
