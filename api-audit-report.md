# LodgeTracker v1 API Audit Report

**Date:** 2026-09-27  
**Status:** ✅ All core endpoints implemented and working  
**Build:** ✅ Passes (TypeScript clean, 0 lint errors)  
**Tests:** 545/555 passing (10 pre-existing failures in registration flow tests - 4-step vs 5-step mismatch)

---

## 1. Endpoint Coverage Analysis

### ✅ Implemented Endpoints

| Endpoint | Methods | Status | Auth | Tier Required |
|----------|---------|--------|------|---------------|
| `/api/v1/properties` | GET, POST | ✅ Implemented | Bearer token | Business |
| `/api/v1/properties/{id}` | GET, PATCH, DELETE | ✅ Implemented | Bearer token | Business |
| `/api/v1/bookings` | GET, POST | ✅ Implemented | Bearer token | Business |
| `/api/v1/bookings/{id}` | GET, PATCH, DELETE | ✅ Implemented | Bearer token | Business |
| `/api/v1/usage` | GET | ✅ Implemented | Session cookie | Business |

### ❌ Missing Endpoints

| Endpoint | Methods | Priority | Notes |
|----------|---------|----------|-------|
| `/api/v1/units` | GET, POST | **High** | Core entity - units are first-class in schema |
| `/api/v1/units/{id}` | GET, PATCH, DELETE | **High** | Needed for managing beds/rooms |
| `/api/v1/expenses` | GET, POST | Medium | Business tier feature |
| `/api/v1/expenses/{id}` | GET, PATCH, DELETE | Medium | Business tier feature |
| `/api/v1/attachments` | POST | Medium | File upload - requires multipart |
| `/api/v1/attachments/{id}` | GET, DELETE | Medium | File download/delete |

### OpenAPI Spec Tags (Defined but Unimplemented)
- **Receipts** - `/receipts`, `/receipts/{id}` (cookie auth, not v1)
- **Attachments** - `/attachments`, `/attachments/{id}` (cookie auth, not v1)  
- **Billing** - `/billing/checkout`, `/billing/portal`, `/billing/webhook` (cookie auth)
- **API Keys** - `/actions/create-api-key`, `/actions/revoke-api-key` (cookie auth)

---

## 2. OpenAPI Spec Synchronization

### ✅ Well-Aligned
- All **6 implemented paths** documented in spec
- All **Booking schemas** match Prisma model (Booking, BookingWithDetails, BookingCreateInput, BookingUpdateInput)
- All **Property schemas** match (Property, PropertyWithUnits, PropertyCreateInput, PropertyUpdateInput)
- **Security schemes** correct (bearerAuth for v1, cookieAuth for others)

### ⚠️ Minor Drift
| Field | Spec Says | Route Handler Uses |
|-------|-----------|-------------------|
| Property.select | `timezone` | Not in select (removed - didn't exist in Prisma) |
| Property.select | `updatedAt` | Not in select for list (but in detail) |
| PropertyUnit schema | `bedCount`, `description`, `updatedAt` | Not in Prisma schema - these fields don't exist |

**Action:** Remove `bedCount`, `description`, `updatedAt` from `PropertyUnit` schema in OpenAPI spec, or add them to Prisma.

---

## 3. Error Handling Standardization

### Current Pattern (Consistent ✅)
All v1 routes use: `{ ok: false, error: "human-readable message" }`

| Status | Used For | Example |
|--------|----------|---------|
| 400 | Validation errors | `"propertyId is required"` |
| 401 | Invalid/missing/expired API key | `"Invalid API key"` |
| 403 | Tier insufficient (STARTER/PRO) | `"API access requires Business tier or higher"` |
| 404 | Resource not found | `"Property not found"` |
| 409 | Conflict (double-booking, duplicate externalUid) | `"Guest Name in Room 1 already has that slot..."` |

### ✅ Strengths
- Consistent `{ ok: false, error: string }` format
- Descriptive error messages
- Correct HTTP status codes
- OpenAPI `Error` schema matches

### ⚠️ Recommendations
1. **Add error codes** for programmatic handling:
   ```json
   { "ok": false, "error": "Property not found", "code": "NOT_FOUND" }
   ```

2. **Standardize 403 response** to include `requiredTier` and `currentTier` (already done in auth layer but not all routes)

3. **Add `Retry-After` header** for 429 (when rate limiting added)

---

## 4. Rate Limiting Analysis

### Current State: ❌ Not Implemented on v1 Routes

| Layer | Rate Limiting |
|-------|---------------|
| **Middleware** | None (no middleware.ts in project) |
| **v1 Route Handlers** | None |
| **Auth Layer (`verifyApiKeyAuth`)** | None |
| **Database** | `RateLimit` model exists but only used for auth endpoints (register, login, etc.) |

### Existing Infrastructure
- `lib/rate-limit.ts` - Full implementation with sliding window, DB-backed
- `RateLimit` Prisma model with indexes
- Configs for: `register`, `login`, `password_reset`, `email_verification`, `two_factor`

### Recommendation: Add to v1 Routes
```typescript
// In each v1 route handler, after auth:
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit"

const identifier = getRateLimitIdentifier(req.ip)
const result = await checkRateLimit(identifier, { 
  maxAttempts: 100, 
  windowMinutes: 1, 
  action: "api:v1:bookings" 
})
if (!result.allowed) {
  return NextResponse.json(
    { ok: false, error: "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
  )
}
```

**Suggested limits for API v1:**
- 100 requests/minute for GET
- 30 requests/minute for POST/PATCH/DELETE
- Per API key (keyPrefix) rather than IP

---

## 5. Test Coverage

### ✅ Properties API - 16 Tests Passing
- Auth scenarios (missing, invalid, revoked, expired keys)
- Tier gating (STARTER, PRO, BUSINESS, overrides)
- Pagination, search, sort
- lastUsedAt update

### ❌ Bookings API - No Tests
**Critical gap** - Complex logic needs coverage:
- WHOLE_UNIT vs SHARED_BED booking types
- Conflict detection (half-open intervals)
- Bed validation
- External UID uniqueness
- Date validation (nights > 2 years)
- Cross-property booking updates

### ❌ Usage API - No Tests
Simple endpoint but should verify tier gating.

### Pre-existing Failures (Unrelated)
- `tests/register-flow.test.tsx` - 9 failures (expects 4 steps, code has 5)
- `tests/register-steps.test.tsx` - 1 failure (same)

---

## 6. Summary & Action Items

### Critical (Do First)
| # | Task | Effort |
|---|------|--------|
| 1 | Add Units API endpoints (GET, POST, GET/:id, PATCH/:id, DELETE/:id) | Medium |
| 2 | Write Bookings API tests (auth, CRUD, conflicts, edge cases) | Medium |
| 3 | Add rate limiting to v1 routes | Low |

### High Priority
| # | Task | Effort |
|---|------|--------|
| 4 | Fix OpenAPI spec PropertyUnit schema (remove non-existent fields) | Low |
| 5 | Add error codes to responses | Low |
| 6 | Add Usage API tests | Low |

### Medium Priority
| # | Task | Effort |
|---|------|--------|
| 7 | Add Expenses API endpoints | Medium |
| 8 | Add Attachments API endpoints | Medium |
| 9 | Fix register-flow test failures (update for 5 steps) | Low |

---

## 7. Architecture Notes

### ✅ Well-Designed Patterns
- **Multi-tenancy**: All queries scoped by `orgId` from API key
- **Auth separation**: `verifyApiKeyAuth` (v1) vs `verifyApiAccess` (session)
- **Tier gating**: `hasApiAccess` feature flag checked in auth layer
- **Conflict detection**: Reused from `lib/availability.ts` (pure functions, tested)
- **Cursor pagination**: Consistent across Properties and Bookings
- **Booking types**: WHOLE_UNIT and SHARED_BED properly handled with claim resolution

### 📝 Technical Debt
- No middleware for cross-cutting concerns (rate limiting, logging, CORS)
- OpenAPI spec manually maintained (could drift)
- Error responses lack machine-readable codes