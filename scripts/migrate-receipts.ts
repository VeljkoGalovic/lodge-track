#!/usr/bin/env tsx
/**
 * Migration script: Upload existing local receipts to Supabase Storage
 * and create Attachment records in the database.
 *
 * Run with: npx tsx scripts/migrate-receipts.ts
 */

import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { promises as fs } from "fs"
import { randomUUID } from "crypto"
import { createHash } from "crypto"
import path from "path"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})
const supabase = createSupabaseServerClient()

const STORAGE_ROOT = process.env.RECEIPT_STORAGE_DIR || ".data/receipts"
const BUCKET_NAME = "attachments"

interface LocalReceipt {
  expenseId: string
  orgId: string
  receiptPath: string
  receiptName: string | null
  receiptType: string | null
  receiptSize: number | null
}

/**
 * Sniffs file type from magic bytes (copied from lib/storage.ts)
 */
function sniffType(bytes: Buffer): { type: string; extension: string } | null {
  // PDF
  if (bytes.length > 4 && bytes.subarray(0, 4).toString("latin1") === "%PDF") {
    return { type: "application/pdf", extension: "pdf" }
  }
  // PNG
  if (bytes.length > 8 && bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    return { type: "image/png", extension: "png" }
  }
  // JPEG
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { type: "image/jpeg", extension: "jpg" }
  }
  // WebP
  if (
    bytes.length > 12 &&
    bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
    bytes.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return { type: "image/webp", extension: "webp" }
  }
  return null
}

function safeDisplayName(raw: string): string {
  const base = raw.replace(/[\r\n"\\/\0]/g, "").trim()
  return (base || "attachment").slice(0, 120)
}

function computeChecksum(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex")
}

async function migrate() {
  console.log("[migrate] Starting receipt migration...")

  // Find all expenses with receipts
  const expenses = await prisma.expense.findMany({
    where: {
      receiptPath: { not: null },
    },
    select: {
      id: true,
      orgId: true,
      receiptPath: true,
      receiptName: true,
      receiptType: true,
      receiptSize: true,
    },
  })

  console.log(`[migrate] Found ${expenses.length} expenses with receipts`)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const expense of expenses) {
    if (!expense.receiptPath) continue

    const localPath = path.join(STORAGE_ROOT, expense.receiptPath)

    try {
      // Check if file exists
      await fs.access(localPath)
    } catch {
      console.warn(`[migrate] File not found: ${localPath} (expense: ${expense.id})`)
      skipped++
      continue
    }

    try {
      // Read file
      const bytes = await fs.readFile(localPath)

      // Sniff type from content
      const sniffed = sniffType(bytes)
      if (!sniffed) {
        console.warn(`[migrate] Unknown file type: ${localPath} (expense: ${expense.id})`)
        skipped++
        continue
      }

      // Generate new object path in Supabase
      const objectPath = `${expense.orgId}/expenses/${randomUUID()}.${sniffed.extension}`
      const checksum = computeChecksum(bytes)
      const fileName = safeDisplayName(expense.receiptName || `receipt.${sniffed.extension}`)

      console.log(`[migrate] Uploading ${expense.receiptPath} -> ${objectPath}`)

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(objectPath, bytes, {
          contentType: sniffed.type,
          upsert: false,
        })

      if (uploadError) {
        console.error(`[migrate] Upload failed for ${expense.id}:`, uploadError.message)
        errors++
        continue
      }

      // Create Attachment record
      await prisma.attachment.create({
        data: {
          module: "EXPENSE",
          moduleId: expense.id,
          orgId: expense.orgId,
          bucket: BUCKET_NAME,
          objectPath,
          supabaseId: uploadData.id,
          fileName,
          mimeType: sniffed.type,
          fileSize: bytes.length,
          checksum,
          uploadedById: expense.id, // We don't have the uploader ID, use expense ID as fallback
        },
      })

      migrated++
      console.log(`[migrate] ✓ Migrated expense ${expense.id}`)
    } catch (err) {
      console.error(`[migrate] Error migrating expense ${expense.id}:`, err)
      errors++
    }
  }

  console.log("\n[migrate] Migration complete:")
  console.log(`  Migrated: ${migrated}`)
  console.log(`  Skipped:  ${skipped}`)
  console.log(`  Errors:   ${errors}`)

  await prisma.$disconnect()
}

migrate().catch((err) => {
  console.error("[migrate] Fatal error:", err)
  process.exit(1)
})