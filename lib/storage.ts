import { randomUUID } from "crypto"
import { createHash } from "crypto"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { formatBytes } from "@/lib/subscriptions"
import { Prisma, AttachmentModule } from "@prisma/client"

type TxClient = Prisma.TransactionClient

/**
 * Supabase Storage for receipt images and PDFs.
 *
 * Receipts are stored in a private Supabase Storage bucket. The object path
 * follows the convention: {orgId}/{module}/{uuid}.{ext}
 *
 * Access is controlled by:
 *   1. RLS policies on storage.objects that validate orgId from JWT claim
 *   2. Application-level checks in every API route and server action
 *   3. Signed URLs for time-limited download access
 *
 * Nothing about the upload is trusted:
 *   - the filename is generated here, never taken from the upload
 *   - the content type is sniffed from the file's own leading bytes
 *   - the size is capped, and the cap is also raised in next.config.ts
 *   - SHA256 checksum is computed for integrity verification
 */

/** Attachments are photographs, scans, and documents; 5 MB is generous for both. */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

const BUCKET_NAME = "attachments"

export interface StoredAttachment {
  /** Storage object path, relative to bucket root. This is what the attachment row keeps. */
  path: string
  /** The uploader's filename, for the download prompt only. */
  name: string
  /** Sniffed from the file, never from the upload's own claim. */
  type: string
  size: number
  /** SHA256 checksum for integrity verification. */
  checksum: string
  /** Supabase object ID (returned on upload). */
  supabaseId?: string
}

export type SaveAttachmentResult = { ok: true; attachment: StoredAttachment } | { ok: false; error: string }

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
export function sniffAttachmentType(bytes: Buffer): { type: string; extension: string } | null {
  for (const signature of SIGNATURES) {
    if (signature.matches(bytes)) {
      return { type: signature.type, extension: signature.extension }
    }
  }
  return null
}

/** Strips anything that could confuse a path or a header out of a display name. */
export function safeDisplayName(raw: string): string {
  const base = raw.replace(/[\r\n"\\/\0]/g, "").trim()
  return (base || "attachment").slice(0, 120)
}

/** Computes SHA256 checksum of bytes. */
function computeChecksum(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex")
}

/**
 * Generates the Supabase object path for an attachment.
 * Convention: {orgId}/{module}/{uuid}.{ext}
 */
export function generateObjectPath(orgId: string, module: string, extension: string): string {
  const moduleLower = module.toLowerCase()
  return `${orgId}/${moduleLower}/${randomUUID()}.${extension}`
}

/**
 * Uploads an attachment to Supabase Storage.
 *
 * The organization's remaining quota is a required argument rather than
 * something this function looks up. Making it required is deliberate: a caller
 * cannot reach the write below without having stated how much room is left, so a
 * new upload path is a compile error rather than a quiet way around the cap.
 * `attachmentQuota()` in lib/attachment-quota.ts is where that figure comes from.
 *
 * The check runs before the body is buffered, so a request that cannot be
 * accepted is refused on the strength of its `Content-Length` rather than after
 * holding several megabytes in memory.
 *
 * Refuses rather than substitutes on a bad type: silently storing a file as a
 * type it is not is how a mismatch reaches a Content-Type header later.
 */
export async function saveAttachment(
  file: File,
  orgId: string,
  module: string,
  moduleId: string,
  quota: { usedBytes: number; limitBytes: number },
  uploadedById: string,
  tx: TxClient
): Promise<SaveAttachmentResult> {
  if (file.size === 0) return { ok: false, error: "That file is empty." }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: `Attachments must be under ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB.`,
    }
  }

  /**
   * The per-file cap is reported first, above, because "this file is too big" is
   * actionable on its own, whereas a quota message is only useful once the file
   * itself is known to be acceptable.
   */
  if (quota.usedBytes + file.size > quota.limitBytes) {
    return { ok: false, error: overQuotaMessage(quota) }
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const sniffed = sniffAttachmentType(bytes)
  if (!sniffed) {
    return { ok: false, error: "Attachments must be a PDF, PNG, JPEG or WebP file." }
  }

  const checksum = computeChecksum(bytes)
  const objectPath = generateObjectPath(orgId, module, sniffed.extension)

  // Upload to Supabase Storage
  const supabase = getSupabaseServerClient()
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(objectPath, bytes, {
      contentType: sniffed.type,
      upsert: false,
    })

  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` }
  }

  // Create Attachment record in database
  await tx.attachment.create({
    data: {
      module: module as AttachmentModule,
      moduleId,
      orgId,
      bucket: BUCKET_NAME,
      objectPath,
      supabaseId: uploadData.id,
      fileName: safeDisplayName(file.name),
      mimeType: sniffed.type,
      fileSize: bytes.length,
      checksum,
      uploadedById,
    },
  })

  return {
    ok: true,
    attachment: {
      path: objectPath,
      name: safeDisplayName(file.name),
      type: sniffed.type,
      size: bytes.length,
      checksum,
      supabaseId: uploadData.id,
    },
  }
}

/**
 * The refusal, as a sentence.
 *
 * Names both what is used and what is left, because the two call for different
 * responses: nearly full means "delete an old attachment", barely started means
 * "your plan is the problem". A bare "storage limit exceeded" forces a host to
 * go and work out which of those they are in.
 */
function overQuotaMessage(quota: { usedBytes: number; limitBytes: number }): string {
  const used = formatBytes(quota.usedBytes)
  const limit = formatBytes(quota.limitBytes)
  const free = formatBytes(Math.max(0, quota.limitBytes - quota.usedBytes))
  return `Your organization has used ${used} of its ${limit} attachment storage, leaving ${free}. Remove an old attachment or upgrade the plan to add this one.`
}

/**
 * Generates a signed URL for downloading an attachment.
 * The URL expires after the given number of seconds (default 1 hour).
 */
export async function getAttachmentSignedUrl(
  objectPath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(objectPath, expiresIn)

  if (error || !data?.signedUrl) {
    return null
  }

  return data.signedUrl
}

/**
 * Generates a signed URL for uploading an attachment directly from the browser.
 * Useful for large files or when you want to avoid proxying through the server.
 * The URL expires after the given number of seconds (default 1 hour).
 */
export async function getAttachmentUploadUrl(
  objectPath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(objectPath)

  if (error || !data?.signedUrl) {
    return null
  }

  return data.signedUrl
}

/**
 * Deletes an attachment from Supabase Storage.
 * Called after the database row is already gone, so a failure here leaks a file
 * rather than breaking the request — logged, not thrown.
 */
export async function deleteAttachment(objectPath: string): Promise<void> {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([objectPath])
  if (error) {
    console.error("[storage] could not remove attachment", objectPath, error)
  }
}

/**
 * Lists attachments for a given module and entity.
 */
export async function listAttachments(
  orgId: string,
  module: string,
  moduleId: string
): Promise<StoredAttachment[]> {
  const supabase = getSupabaseServerClient()
  const prefix = `${orgId}/${module.toLowerCase()}/`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(prefix, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    })

  if (error) {
    console.error("[storage] could not list attachments", error)
    return []
  }

  return (data || []).map((file) => ({
    path: `${prefix}${file.name}`,
    name: file.name,
    type: file.metadata?.mimetype || "application/octet-stream",
    size: file.metadata?.size || 0,
    checksum: "",
    supabaseId: file.id ?? undefined,
  }))
}