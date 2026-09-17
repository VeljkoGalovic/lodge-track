import { randomUUID } from "crypto"
import { mkdir, readFile, unlink, writeFile } from "fs/promises"
import path from "path"
import { formatBytes } from "@/lib/subscriptions"

/**
 * Private storage for receipt images and PDFs.
 *
 * Receipts are stored *outside* the served tree. A file under `public/` is
 * readable by anyone who can reach the path — no session, no tenant check — and
 * the paths are guessable, so one leaked URL would expose another organization's
 * supplier and pricing. Instead each file is written to a directory nothing
 * serves directly, and `receiptPath` (the key stored on the expense) is only ever
 * resolved by /api/receipts/[id], which authenticates the caller and confirms the
 * expense belongs to their organization before reading a byte.
 *
 * Nothing about the upload is trusted:
 *   - the filename is generated here, never taken from the upload, so a name like
 *     `../../app/page.tsx` has nothing to traverse;
 *   - the content type is sniffed from the file's own leading bytes, because the
 *     browser's Content-Type is attacker-controlled and a mislabelled file would
 *     otherwise be handed back with a type of the uploader's choosing;
 *   - the size is capped, and the cap is also raised in next.config.ts so the
 *     request is rejected before the body is buffered.
 *
 * The filesystem calls below carry `turbopackIgnore`. They are reaching into a
 * directory the application writes at runtime — receipts are uploaded data, not
 * build input — and without the opt-out the bundler's file tracer sees a path it
 * cannot resolve statically and copies the entire project, `public/` included,
 * into the server output.
 */

/** Receipts are photographs and scans; 5 MB is generous for both. */
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024

/**
 * Kept beside the app rather than in `public/`, and overridable so a deployment
 * can point it at a mounted volume.
 */
const STORAGE_ROOT =
  process.env.RECEIPT_STORAGE_DIR ?? path.join(process.cwd(), ".data", "receipts")

export interface StoredReceipt {
  /** Storage key, relative to STORAGE_ROOT. This is what the expense row keeps. */
  path: string
  /** The uploader's filename, for the download prompt only. */
  name: string
  /** Sniffed from the file, never from the upload's own claim. */
  type: string
  size: number
}

export type SaveReceiptResult = { ok: true; receipt: StoredReceipt } | { ok: false; error: string }

/**
 * Allowed types, by magic bytes.
 *
 * `sniff` returns the type the bytes actually are, so a `.exe` renamed to `.pdf`
 * finds no signature and is refused. SVG is deliberately absent: it is a script
 * container, and serving one back under a same-origin URL would be stored XSS.
 */
const SIGNATURES: { type: string; extension: string; matches: (bytes: Buffer) => boolean }[] = [
  {
    type: "application/pdf",
    extension: "pdf",
    // "%PDF"
    matches: (bytes) => bytes.length > 4 && bytes.subarray(0, 4).toString("latin1") === "%PDF",
  },
  {
    type: "image/png",
    extension: "png",
    // 89 50 4E 47 0D 0A 1A 0A
    matches: (bytes) =>
      bytes.length > 8 && bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a",
  },
  {
    type: "image/jpeg",
    extension: "jpg",
    // FF D8 FF
    matches: (bytes) =>
      bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    type: "image/webp",
    extension: "webp",
    // "RIFF" .... "WEBP"
    matches: (bytes) =>
      bytes.length > 12 &&
      bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
      bytes.subarray(8, 12).toString("latin1") === "WEBP",
  },
]

/** The real type of these bytes, or null when it is not something we accept. */
export function sniffReceiptType(bytes: Buffer): { type: string; extension: string } | null {
  for (const signature of SIGNATURES) {
    if (signature.matches(bytes)) {
      return { type: signature.type, extension: signature.extension }
    }
  }
  return null
}

/** Strips anything that could confuse a path or a header out of a display name. */
export function safeDisplayName(raw: string): string {
  const base = path.basename(raw).replace(/[\r\n"\\/\0]/g, "").trim()
  return (base || "receipt").slice(0, 120)
}

/**
 * Writes an uploaded receipt under its organization's own directory.
 *
 * The organization's remaining quota is a required argument rather than
 * something this function looks up. Making it required is deliberate: a caller
 * cannot reach the write below without having stated how much room is left, so a
 * new upload path is a compile error rather than a quiet way around the cap.
 * `receiptQuota()` in lib/receipt-quota.ts is where that figure comes from.
 *
 * The check runs before the body is buffered, so a request that cannot be
 * accepted is refused on the strength of its `Content-Length` rather than after
 * holding several megabytes in memory.
 *
 * Refuses rather than substitutes on a bad type: silently storing a file as a
 * type it is not is how a mismatch reaches a Content-Type header later.
 */
export async function saveReceipt(
  file: File,
  orgId: string,
  quota: { usedBytes: number; limitBytes: number }
): Promise<SaveReceiptResult> {
  if (file.size === 0) return { ok: false, error: "That file is empty." }
  if (file.size > MAX_RECEIPT_BYTES) {
    return {
      ok: false,
      error: `Receipts must be under ${Math.round(MAX_RECEIPT_BYTES / (1024 * 1024))} MB.`,
    }
  }

  /**
   * The per-file cap is reported first, above, because "this file is too big" is
   * actionable on its own, whereas a quota message is only useful once the file
   * itself is known to be acceptable.
   *
   * Not transactional: two uploads submitted at the same instant can each see
   * room for one and both write. That is acceptable for what this cap is — a
   * guard against runaway disk usage, not a billing boundary — and closing it
   * would mean serializing every upload for an organization behind a lock to
   * protect against a few megabytes of overshoot.
   */
  if (quota.usedBytes + file.size > quota.limitBytes) {
    return { ok: false, error: overQuotaMessage(quota) }
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const sniffed = sniffReceiptType(bytes)
  if (!sniffed) {
    return { ok: false, error: "Receipts must be a PDF, PNG, JPEG or WebP file." }
  }

  // The organization directory is part of the key so a file can be found — and
  // swept — by tenant, but the key is still only ever resolved through storagePath().
  const directory = path.join(/*turbopackIgnore: true*/ STORAGE_ROOT, orgId)
  await mkdir(directory, { recursive: true })

  const key = `${orgId}/${randomUUID()}.${sniffed.extension}`
  await writeFile(path.join(/*turbopackIgnore: true*/ STORAGE_ROOT, key), bytes)

  return {
    ok: true,
    receipt: {
      path: key,
      name: safeDisplayName(file.name),
      type: sniffed.type,
      size: bytes.length,
    },
  }
}

/**
 * The refusal, as a sentence.
 *
 * Names both what is used and what is left, because the two call for different
 * responses: nearly full means "delete an old receipt", barely started means
 * "your plan is the problem". A bare "storage limit exceeded" forces a host to
 * go and work out which of those they are in.
 */
function overQuotaMessage(quota: { usedBytes: number; limitBytes: number }): string {
  const used = formatBytes(quota.usedBytes)
  const limit = formatBytes(quota.limitBytes)
  const free = formatBytes(Math.max(0, quota.limitBytes - quota.usedBytes))
  return `Your organization has used ${used} of its ${limit} receipt storage, leaving ${free}. Remove an old receipt or upgrade the plan to add this one.`
}

/**
 * The absolute path of a stored receipt.
 *
 * Rejects any key that escapes the storage root. Keys are generated by
 * `saveReceipt`, so this should be unreachable — which is precisely why it is
 * checked here as well, at the one place a key becomes a filesystem path.
 */
export function storagePath(key: string): string | null {
  const resolved = path.resolve(/*turbopackIgnore: true*/ STORAGE_ROOT, key)
  const root = path.resolve(/*turbopackIgnore: true*/ STORAGE_ROOT)
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null
  return resolved
}

/** Reads a stored receipt, or null when it is gone or the key is unusable. */
export async function readReceipt(key: string): Promise<Buffer | null> {
  const absolute = storagePath(key)
  if (!absolute) return null
  try {
    return await readFile(/*turbopackIgnore: true*/ absolute)
  } catch {
    return null
  }
}

/**
 * Best-effort removal. Called after the database row is already gone, so a
 * failure here leaks a file rather than breaking the request — logged, not thrown.
 */
export async function deleteReceipt(key: string): Promise<void> {
  const absolute = storagePath(key)
  if (!absolute) return
  try {
    await unlink(/*turbopackIgnore: true*/ absolute)
  } catch (error) {
    console.error("[storage] could not remove receipt", key, error)
  }
}
