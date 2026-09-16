import { createHmac, timingSafeEqual } from "crypto"
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client"

/**
 * Lemon Squeezy billing backend.
 *
 * Only the parts a running app needs: start a checkout, and turn a webhook into
 * a row. Everything the provider owns — the hosted checkout page, card storage,
 * dunning, invoices — stays on Lemon Squeezy's side, so there is no SDK here and
 * no card data in this database. Requests go through `fetch` against the REST
 * API, which keeps the dependency list short.
 *
 * Configuration comes from the environment (see .env.example). When it is
 * missing, `billingStatus()` reports exactly which pieces are absent and the
 * billing page says so, rather than offering a checkout that would 500.
 */

const API_BASE = "https://api.lemonsqueezy.com/v1"

/** Env var holding the Lemon Squeezy variant id for each paid tier. STARTER is
 *  the free tier created at registration and is never purchased. */
const VARIANT_ENV: Record<Exclude<SubscriptionTier, "STARTER">, string> = {
  PRO: "LEMON_SQUEEZY_VARIANT_ID_PRO",
  ENTERPRISE: "LEMON_SQUEEZY_VARIANT_ID_ENTERPRISE",
}

export interface BillingConfig {
  apiKey: string
  storeId: string
  webhookSecret: string
  variants: Partial<Record<SubscriptionTier, string>>
}

function readConfig(): BillingConfig {
  const variants: Partial<Record<SubscriptionTier, string>> = {}
  for (const [tier, envName] of Object.entries(VARIANT_ENV)) {
    const value = process.env[envName]
    if (value) variants[tier as SubscriptionTier] = value
  }

  return {
    apiKey: process.env.LEMON_SQUEEZY_API_KEY ?? "",
    storeId: process.env.LEMON_SQUEEZY_STORE_ID ?? "",
    webhookSecret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET ?? "",
    variants,
  }
}

export interface BillingStatus {
  /** True only when a checkout can actually be opened end to end. */
  canCheckout: boolean
  canReceiveWebhooks: boolean
  /** Human-readable names of the env vars that still need setting. */
  missing: string[]
}

/**
 * What is and isn't wired up, so the UI can be specific. Naming the missing
 * variables is the difference between "billing is broken" and a two-minute fix.
 */
export function billingStatus(): BillingStatus {
  const config = readConfig()
  const missing: string[] = []

  if (!config.apiKey) missing.push("LEMON_SQUEEZY_API_KEY")
  if (!config.storeId) missing.push("LEMON_SQUEEZY_STORE_ID")
  if (!config.webhookSecret) missing.push("LEMON_SQUEEZY_WEBHOOK_SECRET")
  if (Object.keys(config.variants).length === 0) {
    missing.push("LEMON_SQUEEZY_VARIANT_ID_PRO")
  }

  return {
    canCheckout: Boolean(config.apiKey && config.storeId && Object.keys(config.variants).length > 0),
    canReceiveWebhooks: Boolean(config.webhookSecret),
    missing,
  }
}

export function variantIdForTier(tier: SubscriptionTier): string | null {
  return readConfig().variants[tier] ?? null
}

export function tierForVariantId(variantId: string | null | undefined): SubscriptionTier | null {
  if (!variantId) return null
  const variants = readConfig().variants
  const match = Object.entries(variants).find(([, id]) => id === variantId)
  return match ? (match[0] as SubscriptionTier) : null
}

export interface CheckoutRequest {
  tier: SubscriptionTier
  email: string
  /** Carried through the webhook so a payment can be tied back to a tenant. */
  orgId: string
  redirectUrl: string
}

/**
 * Creates a hosted checkout and returns its URL, or `null` when the tier has no
 * configured variant or the API rejected the request. Throwing is reserved for
 * the webhook, where a failure must be visible to the provider as a non-2xx.
 */
export async function createCheckoutUrl(request: CheckoutRequest): Promise<string | null> {
  const config = readConfig()
  const variantId = config.variants[request.tier]
  if (!config.apiKey || !config.storeId || !variantId) return null

  const response = await fetch(`${API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          // `custom` is echoed back on the webhook's `meta.custom_data`, which is
          // how the subscription event finds its organization.
          checkout_data: { email: request.email, custom: { org_id: request.orgId } },
          product_options: { redirect_url: request.redirectUrl, enabled_variants: [] },
          checkout_options: { media: false, logo: true },
        },
        relationships: {
          store: { data: { type: "stores", id: config.storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    }),
  })

  if (!response.ok) {
    console.error("[billing] checkout creation failed", response.status, await response.text())
    return null
  }

  const payload = (await response.json()) as { data?: { attributes?: { url?: string } } }
  return payload.data?.attributes?.url ?? null
}

/**
 * Lemon Squeezy signs the raw request body with HMAC-SHA256 and sends the hex
 * digest in `X-Signature`. The comparison is timing-safe and length-guarded,
 * because `timingSafeEqual` throws on mismatched buffer lengths.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const config = readConfig()
  if (!config.webhookSecret || !signature) return false

  const expected = Buffer.from(
    createHmac("sha256", config.webhookSecret).update(rawBody, "utf8").digest("hex")
  )
  const received = Buffer.from(signature.trim().toLowerCase())

  return expected.length === received.length && timingSafeEqual(expected, received)
}

/**
 * The provider's lifecycle vocabulary mapped onto ours. `unpaid` folds into
 * PAST_DUE because both mean "access is at risk, chase the card"; `paused` keeps
 * its own state since the subscription is intact and can resume.
 */
const STATUS_MAP: Record<string, SubscriptionStatus> = {
  on_trial: "TRIALING",
  active: "ACTIVE",
  paused: "PAUSED",
  past_due: "PAST_DUE",
  unpaid: "PAST_DUE",
  cancelled: "CANCELED",
  expired: "CANCELED",
}

export function statusForProviderStatus(status: string): SubscriptionStatus | null {
  return STATUS_MAP[status] ?? null
}

/** The subscription object inside a Lemon Squeezy webhook payload. */
export interface SubscriptionWebhookData {
  type: string
  id: string
  attributes: {
    customer_id?: number | null
    subscription_id?: number | null
    variant_id?: number | null
    user_email?: string | null
    status?: string | null
    renews_at?: string | null
    ends_at?: string | null
  }
}

export interface WebhookPayload {
  meta?: { event_name?: string; custom_data?: { org_id?: string } }
  data?: SubscriptionWebhookData
}
