# LodgeTrack: File Upload & Attachment Implementation Audit

**Date:** 2026-09-23  
**Auditor:** Automated Codebase Review

---

## Executive Summary

LodgeTrack implements **receipt attachments for expenses** using a **local filesystem storage** approach (not Supabase Storage, S3, or database BLOBs). The system is well-architected with strong security boundaries, tenant isolation, and tier-based quota enforcement.

**Key Finding:** No general "file upload" feature exists — only **expense receipts** (PDF, PNG, JPEG, WebP) up to **5 MB per file**, with organization-level storage quotas tied to subscription tiers.

---

## 1. Where File Uploads Are Handled

### Frontend (Client Components)
| File | Purpose |
|------|---------|
| `components/expenses/ExpenseForm.tsx` | File input with drag-and-drop styling, accept filter (`.pdf,.png,.jpg,.jpeg,.webp`), filename preview |
| `app/dashboard/expenses/new/page.tsx` | Create expense page with form |
| `app/dashboard/expenses/[id]/edit/page.tsx` | Edit expense page with form |
| `components/expenses/DeleteExpenseButton.tsx` | Delete confirmation (mentions receipt removal) |

### Backend (Server Actions)
| File | Purpose |
|------|---------|
| `app/actions/expenses.ts` | `createExpense`, `updateExpense`, `deleteExpense` — orchestrate upload, validation, quota checks, DB writes |
| `lib/storage.ts` | Core storage layer: `saveReceipt`, `readReceipt`, `deleteReceipt`, `sniffReceiptType` |
| `lib/receipt-quota.ts` | Quota accounting: `receiptBytesUsed`, `receiptQuota` |
| `lib/subscriptions.ts` | Tier limits: STARTER=1 GB, PRO=5 GB, BUSINESS=unlimited |

### API Route (Serving Files)
| File | Purpose |
|------|---------|
| `app/api/receipts/[id]/route.ts` | Authenticated file delivery — only way receipts leave the server |

---

## 2. Storage Destination

**Local Filesystem** — `process.env.RECEIPT_STORAGE_DIR` or `.data/receipts/`

```
.data/receipts/
└── {orgId}/
    └── {uuid}.{extension}  (e.g., org_abc123/550e8400-e29b.pdf)
```

**Key design decisions:**
- Files stored **outside** `public/` — never directly accessible via URL
- Organization-scoped directories enable tenant-level cleanup
- UUID filenames prevent traversal attacks (`../../etc/passwd` impossible)
- `storagePath()` validates path never escapes `STORAGE_ROOT`

**No cloud storage** (Supabase, S3, Cloudflare R2) is used.

---

## 3. Database Schema (Prisma)

### `Expense` Model (`prisma/schema.prisma:443-472`)

```prisma
model Expense {
  id          String          @id @default(cuid())
  amount      Int
  category    ExpenseCategory @default(OTHER)
  date        DateTime
  description String
  
  propertyId  String
  property    Property        @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  
  orgId       String          // denormalized for scoped queries
  organization Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  
  // Receipt fields — ALL optional (receipt is optional)
  receiptPath String?         // storage key: "orgId/uuid.ext"
  receiptName String?         // original filename (display only)
  receiptType String?         // sniffed MIME type (not browser-supplied)
  receiptSize Int?            // bytes, for quota accounting
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([orgId, date])
  @@index([propertyId, date])
  @@index([orgId, receiptSize])  // index-only scan for quota sums
}
```

**No separate `Attachment` or `File` table** — receipt metadata lives directly on `Expense`.

---

## 4. Upload Flow (Create Expense with Receipt)

```
User submits form (multipart/form-data, ≤6 MB per next.config.ts)
        │
        ▼
app/actions/expenses.ts:createExpense()
        │
        ├─► currentMembership() — auth + org lookup
        ├─► canManage(role) — OWNER/MANAGER only
        ├─► validate(input) — required fields, category enum
        ├─► parseMoneyField() — amount parsing with currency
        └─► receiptFile(formData) — extracts File or null
        │
        ▼
serializable transaction (Prisma isolationLevel: "Serializable")
        │
        ├─► property.findFirst({ orgId }) — confirms property ownership
        │
        ├─► saveReceipt(file, orgId, tx)
        │       ├─► file.size > 0 && ≤ 5 MB (MAX_RECEIPT_BYTES)
        │       ├─► receiptQuota(tx, orgId) — atomic quota check
        │       │       ├─► receiptBytesUsed(tx, orgId) — SUM(receiptSize) index-only
        │       │       └─► getOrgFeatures(tier).maxStorageBytes
        │       │           STARTER = 1 GB, PRO = 5 GB, BUSINESS = Infinity
        │       ├─► Buffer.from(await file.arrayBuffer())
        │       ├─► sniffReceiptType(bytes) — magic byte validation
        │       │       PDF: "%PDF" | PNG: 89504E470D0A1A0A | JPEG: FFD8FF | WebP: RIFF....WEBP
        │       ├─► mkdir(.data/receipts/orgId, recursive)
        │       └─► writeFile(.data/receipts/orgId/uuid.ext, bytes)
        │
        └─► expense.create({ receiptPath, receiptName, receiptType, receiptSize, ... })
        │
        ▼
revalidatePath() — cache invalidation
```

---

## 5. Validation Rules & Limits

| Rule | Value | Location |
|------|-------|----------|
| **Max file size** | 5 MB (5,242,880 bytes) | `lib/storage.ts:37` `MAX_RECEIPT_BYTES` |
| **Request body limit** | 6 MB | `next.config.ts:14` `bodySizeLimit` |
| **Allowed types** | PDF, PNG, JPEG, WebP | `lib/storage.ts:65-95` `SIGNATURES` |
| **Type detection** | Magic bytes (not MIME) | `lib/storage.ts:98-105` `sniffReceiptType()` |
| **Empty file** | Rejected | `lib/storage.ts:152` |
| **Filename sanitization** | `safeDisplayName()` strips path chars | `lib/storage.ts:108-111` |
| **Storage path traversal** | Blocked by UUID names + `storagePath()` | `lib/storage.ts:227-232` |

**SVG explicitly excluded** — script container risk (stored XSS if served same-origin).

---

## 6. Tier-Based Paywall / Quota Enforcement

### Subscription Tiers (`lib/subscriptions.ts:43-47`)

| Tier | Storage Limit | Properties | Advanced Analytics | Team Roles | API Access |
|------|--------------|------------|-------------------|------------|------------|
| **STARTER** | **1 GB** | 3 | ❌ | ❌ | ❌ |
| **PRO** | **5 GB** | 15 | ✅ | ✅ | ✅ |
| **BUSINESS** | **Unlimited** | ∞ | ✅ | ✅ | ✅ |

### Quota Check Flow

1. **Before buffering** — `next.config.ts` 6 MB body limit rejects oversized requests early
2. **Per-file cap** — 5 MB checked in `saveReceipt()` before quota
3. **Org quota** — `receiptQuota()` sums `Expense.receiptSize` via `@@index([orgId, receiptSize])` (index-only scan)
4. **Atomic in transaction** — `serializable` isolation prevents race conditions
5. **Conservative on replace** — old receipt still counts during replacement (prevents TOCTOU)

### Quota Error Message (User-Facing)
```
"Your organization has used 4.7 GB of its 5 GB receipt storage, leaving 300 MB. 
Remove an old receipt or upgrade the plan to add this one."
```

---

## 7. File Serving (Download/View)

**Endpoint:** `GET /api/receipts/[id]`

**Security Checks (all required):**
1. Valid session (`currentMembership()`)
2. Expense found by `{ id, orgId }` — tenant isolation at query level
3. `receiptPath` exists on expense
4. `storagePath(key)` validates path within `STORAGE_ROOT`
5. File exists on disk

**Response Headers:**
```
Content-Type: <sniffed type from DB>
Content-Length: <bytes>
Content-Disposition: inline; filename="<original name>"
X-Content-Type-Options: nosniff
Cache-Control: private, no-store
```

---

## 8. Identified Gaps & Concerns

### 🔴 Critical Gaps

| # | Issue | Impact |
|---|-------|--------|
| **1** | **No backup/redundancy** — Local filesystem only. Single server failure = data loss. | Data durability risk |
| **2** | **No horizontal scaling** — File paths tied to local disk. Cannot run multiple app instances. | Deployment limitation |
| **3** | **No virus/malware scanning** — Uploaded files written directly to disk. | Security risk if exploited |
| **4** | **No CDN/edge delivery** — All downloads go through Next.js server. | Performance at scale |

### 🟡 Medium Gaps

| # | Issue | Impact |
|---|-------|--------|
| **5** | **No audit log** — Who uploaded/deleted what, when. | Compliance/traceability |
| **6** | **No image optimization** — Originals served as-is (no thumbnails, WebP conversion). | Bandwidth/storage waste |
| **7** | **Delete is best-effort** — `deleteReceipt()` logs error but doesn't fail request. Orphaned files possible. | Storage leak over time |
| **8** | **No usage dashboard** — Users can't see current storage consumption. | Poor UX for quota management |

### 🟢 Minor Gaps

| # | Issue | Impact |
|---|-------|--------|
| **9** | **Magic bytes only** — No secondary validation (e.g., `pdfinfo`, `identify`). | Sophisticated polyglots could pass |
| **10** | **No EXIF stripping** — JPEG metadata (GPS, camera) preserved. | Privacy leak |
| **11** | **Hardcoded 5 MB** — Frontend constant mirrors backend (`ExpenseForm.tsx:20`). Drift risk. | Maintenance burden |
| **12** | **No resume/chunked upload** — Large files on slow connections fail. | UX limitation |

---

## 9. What's NOT Implemented

| Feature | Status |
|---------|--------|
| General file attachments (not receipts) | ❌ Not implemented |
| Booking document attachments | ❌ Not implemented |
| Property/unit photo uploads | ❌ Not implemented |
| User avatar uploads | ❌ Not implemented |
| Supabase Storage integration | ❌ Not present |
| S3/R2/Cloudflare R2 integration | ❌ Not present |
| Database BLOB storage | ❌ Not used |
| Multi-file upload per expense | ❌ Single receipt only |
| Receipt preview/thumbnails | ❌ Not generated |
| OCR/text extraction from receipts | ❌ Not implemented |

---

## 10. Recommendations

### Priority 1: Production Readiness
1. **Migrate to object storage** (S3/R2/Supabase) for durability + horizontal scaling
2. **Add ClamAV or similar** malware scanning on upload
3. **Implement audit logging** for all receipt operations

### Priority 2: Operational Excellence
4. **Add storage usage UI** in organization settings
5. **Scheduled orphaned file cleanup** job (cron)
6. **EXIF stripping** for JPEGs using `sharp` or `exiftool`

### Priority 3: Enhanced UX
7. **Generate thumbnails** for images (WebP, 400px max)
8. **OCR integration** (Tesseract/AWS Textract) for expense auto-fill
9. **Chunked/resumable upload** for reliability

### Priority 4: Code Quality
10. **Centralize `MAX_RECEIPT_MB`** — single source of truth (env var or shared constant)
11. **Add secondary validation** (file-type npm package)
12. **Make delete transactional** — fail request if file removal fails

---

## 11. File Inventory

```
lib/storage.ts                    # Core storage engine (257 lines)
lib/receipt-quota.ts              # Quota accounting (80 lines)
lib/subscriptions.ts              # Tier limits (131 lines)
app/actions/expenses.ts           # Server actions (255 lines)
app/api/receipts/[id]/route.ts    # File serving (55 lines)
components/expenses/ExpenseForm.tsx  # Upload UI (201 lines)
prisma/schema.prisma              # Expense model + indexes
next.config.ts                    # 6 MB body limit
tests/receipt-quota-race.test.ts  # Race condition tests
```

---

## Conclusion

The receipt attachment system is **secure, well-scoped, and correctly implements tenant isolation with tier-based quotas**. The local-filesystem approach is appropriate for a single-instance deployment but **must be migrated to object storage** before any production scaling. The race-condition protection via serializable transactions is a notable strength.

**Overall Grade: B+** — Strong implementation for current scope; architectural migration needed for scale.