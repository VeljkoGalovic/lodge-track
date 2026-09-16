/**
 * Asserts lib/totp.ts against the published test vectors, rather than against
 * itself. Run with:
 *
 *   node --experimental-strip-types scripts/totp-vectors.ts
 *
 * The values below come from RFC 6238 Appendix B (SHA-1 rows). That table prints
 * 8 digits; this implementation issues 6, so each vector is compared on its last
 * six digits — the truncation differs only in the final modulo.
 */
import {
  base32Decode,
  base32Encode,
  buildOtpAuthUri,
  generateCode,
  generateSecret,
  verifyCode,
} from "../lib/totp.ts"

let failures = 0

function check(label: string, actual: unknown, expected: unknown) {
  const ok = Object.is(actual, expected)
  if (!ok) failures++
  console.log(`${ok ? "  ok  " : "FAIL  "}${label}${ok ? "" : `\n        expected ${expected}\n        actual   ${actual}`}`)
}

// RFC 4226 Appendix D: the seed is the ASCII bytes of "12345678901234567890".
const RFC_SECRET_ASCII = "12345678901234567890"
const RFC_SECRET_BASE32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

console.log("\nbase32")
check("encodes the RFC seed to its published base32 form", base32Encode(Buffer.from(RFC_SECRET_ASCII, "ascii")), RFC_SECRET_BASE32)
check("decodes back to the exact seed bytes", base32Decode(RFC_SECRET_BASE32).toString("ascii"), RFC_SECRET_ASCII)
check("tolerates lowercase, spaces and padding", base32Decode("gezd gnbv gy3t qojq gezd gnbv gy3t qojq====").toString("ascii"), RFC_SECRET_ASCII)
check("round-trips arbitrary bytes", base32Encode(Buffer.from([0x00, 0xff, 0x10, 0x7f])), base32Encode(base32Decode(base32Encode(Buffer.from([0x00, 0xff, 0x10, 0x7f])))))

console.log("\nRFC 6238 Appendix B (SHA-1), last six digits")
const vectors: Array<[number, string]> = [
  [59, "287082"],
  [1111111109, "081804"],
  [1111111111, "050471"],
  [1234567890, "005924"],
  [2000000000, "279037"],
  [20000000000, "353130"],
]
for (const [seconds, expected] of vectors) {
  check(`T=${seconds}`, generateCode(RFC_SECRET_BASE32, seconds * 1000), expected)
}

// T=20000000000 above is the load-bearing case for the counter: it is past
// 2^31 seconds, where a 32-bit counter or a signed shift would wrap silently.

console.log("\nverification window")
const at = 1700000000 * 1000
const now = generateCode(RFC_SECRET_BASE32, at)
check("accepts the current code", verifyCode(RFC_SECRET_BASE32, now, at), true)
check("accepts one step earlier (clock drift)", verifyCode(RFC_SECRET_BASE32, generateCode(RFC_SECRET_BASE32, at - 30_000), at), true)
check("accepts one step later (clock drift)", verifyCode(RFC_SECRET_BASE32, generateCode(RFC_SECRET_BASE32, at + 30_000), at), true)
check("rejects two steps earlier", verifyCode(RFC_SECRET_BASE32, generateCode(RFC_SECRET_BASE32, at - 60_000), at), false)
check("rejects two steps later", verifyCode(RFC_SECRET_BASE32, generateCode(RFC_SECRET_BASE32, at + 90_000), at), false)
check("accepts a code typed with a space", verifyCode(RFC_SECRET_BASE32, `${now.slice(0, 3)} ${now.slice(3)}`, at), true)
check("rejects a wrong code of the right shape", verifyCode(RFC_SECRET_BASE32, "000000", at), false)
check("rejects a non-numeric token", verifyCode(RFC_SECRET_BASE32, "abcdef", at), false)
check("rejects a short token", verifyCode(RFC_SECRET_BASE32, "1234", at), false)

console.log("\nsecret generation")
const generated = generateSecret()
check("is 32 base32 characters (160 bits)", generated.length, 32)
check("is valid base32", /^[A-Z2-7]+$/.test(generated), true)
check("differs between calls", generated === generateSecret(), false)
check("verifies its own code", verifyCode(generated, generateCode(generated, at), at), true)

console.log("\notpauth URI")
const uri = buildOtpAuthUri({ secret: RFC_SECRET_BASE32, accountName: "ada@example.com", issuer: "LodgeTrack" })
check("uses the totp scheme", uri.startsWith("otpauth://totp/"), true)
check("percent-encodes the issuer:account label", uri.includes("LodgeTrack%3Aada%40example.com"), true)
check("carries the secret", new URL(uri).searchParams.get("secret"), RFC_SECRET_BASE32)
check("carries the issuer", new URL(uri).searchParams.get("issuer"), "LodgeTrack")
check("declares 6 digits / 30 seconds / SHA1", ["6", "30", "SHA1"].join() === [new URL(uri).searchParams.get("digits"), new URL(uri).searchParams.get("period"), new URL(uri).searchParams.get("algorithm")].join(), true)

console.log(failures === 0 ? "\nAll assertions passed.\n" : `\n${failures} assertion(s) failed.\n`)
process.exit(failures === 0 ? 0 : 1)
