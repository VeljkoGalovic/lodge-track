import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { serializable } from "@/lib/transaction"
import {
  statusForProviderStatus,
  tierForVariantId,
  verifyWebhookSignature,
  type WebhookPayload,
} from "@/lib/billing"

/**
 * Lemon Squeezy webhook receiver.
 *
 * The only writer of subscription state. Nothing is trusted from the request
 * beyond the signature: the body must verify against the shared secret before a
 * single field is read, because this endpoint is public by necessity and the
 * payload decides who is on which plan.
 */
export async function POST(request: Request) {
  // The raw text is what was signed. Parsing first and re-serialising would
  // change key order and whitespace, and the digest would never match.
  const rawBody = await request.text()

  if (!verifyWebhookSignature(rawBody, request.headers.get("x-signature"))) {
    // 401 rather than 400: the provider should retry nothing, and this is the
    // signal that the secret on one side is wrong.
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody) as WebhookPayload
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  if (!validPayload(payload)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 })
  }
  const eventName = payload.meta!.event_name!
  // Resource IDs identify subscriptions, not deliveries. Only the body is
  // signed; an unsigned header must not control deduplication. Identical retries
  // hash alike, while lifecycle updates on the same subscription remain distinct.
  const eventId = `lemonsqueezy:${createHash("sha256").update(rawBody).digest("hex")}`
  try {
    await serializable(async (tx) => {
      try {
        await tx.webhookEvent.create({ data: { id: eventId, provider: "lemonsqueezy", type: eventName } })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new DuplicateDelivery()
        }
        throw error
      }
      // Both writes commit together. A failed application rolls back the ledger,
      // so the provider's retry can apply the event rather than lose it forever.
      await applyEvent(tx, eventName, payload)
    })
  } catch (error) {
    if (error instanceof DuplicateDelivery) return NextResponse.json({ received: true, duplicate: true })
    console.error("[billing] failed to apply webhook", eventId, eventName, error)
    return NextResponse.json({ received: false }, { status: 503 })
  }
  return NextResponse.json({ received: true, applied: true })
}

/**
 * Only subscription lifecycle events are acted on. Order events, licence keys
 * and the rest are recorded and acknowledged so they are not retried — but they
 * do not touch a plan.
 */
class DuplicateDelivery extends Error {}

function validPayload(value: unknown): value is WebhookPayload {
  if (!value || typeof value !== "object") return false
  const { meta, data } = value as WebhookPayload
  if (typeof meta?.event_name !== "string" || !meta.event_name ||
      typeof data?.id !== "string" || !data.id || typeof data.type !== "string") return false
  if (meta.custom_data?.org_id != null && typeof meta.custom_data.org_id !== "string") return false
  const attrs = data.attributes
  if (!attrs || typeof attrs !== "object" || Array.isArray(attrs)) return false
  for (const key of ["status", "ends_at", "renews_at"] as const) {
    if (attrs[key] != null && typeof attrs[key] !== "string") return false
  }
  for (const key of ["subscription_id", "variant_id"] as const) {
    if (attrs[key] != null && (!Number.isSafeInteger(attrs[key]) || attrs[key]! <= 0)) return false
  }
  return [attrs.ends_at, attrs.renews_at].every(date => date == null || Number.isFinite(Date.parse(date)))
}

export async function applyEvent(tx: Prisma.TransactionClient, eventName: string, payload: WebhookPayload): Promise<void> {
  const data = payload.data
  if (!data || !eventName.startsWith("subscription_")) return

  const attributes = data.attributes ?? {}
  const providerStatus = attributes.status
  const status = providerStatus ? statusForProviderStatus(providerStatus) : null

  // An unrecognised status is left alone rather than guessed at: writing the
  // wrong one could suspend a paying customer, and the log records the value.
  if (!status) {
    console.warn("[billing] unrecognised subscription status", eventName, providerStatus)
    return
  }

  const orgId = payload.meta?.custom_data?.org_id
  const providerSubscriptionId = attributes.subscription_id
    ? String(attributes.subscription_id)
    : data.id
  // Store customer ID for subscription validation (used to detect completed checkout)
  const providerCustomerId = attributes.customer_id ? String(attributes.customer_id) : null

  // `ends_at` is set when a subscription is cancelled but still running, so it
  // is a better end date than `renews_at` whenever it is present.
  const periodEnd = attributes.ends_at ?? attributes.renews_at
  const tier = tierForVariantId(attributes.variant_id ? String(attributes.variant_id) : null)

  const subscription = await findSubscription(tx, orgId, providerSubscriptionId)

  // A subscription event for an organization this deployment does not know
  // about cannot be applied, and inventing a tenant from a webhook would be
  // worse than dropping it.
  if (!subscription) {
    console.warn("[billing] no matching subscription for webhook", eventName, orgId, providerSubscriptionId)
    return
  }

  await tx.subscription.update({
    where: { id: subscription.id },
    data: {
      status,
      // Left as it is when the variant is unrecognised, so an unconfigured
      // variant id cannot silently downgrade a paying organization.
      ...(tier ? { tier } : {}),
      billingSubscriptionId: providerSubscriptionId,
      ...(providerCustomerId ? { billingCustomerId: providerCustomerId } : {}),
      currentPeriodEnd: periodEnd ? new Date(periodEnd) : null,
    },
  })
}

/** The subscription this event belongs to, matched by organization before provider id. */
async function findSubscription(tx: Prisma.TransactionClient, orgId: string | undefined, providerSubscriptionId: string) {
  if (orgId) {
    const byOrg = await tx.subscription.findUnique({
      where: { orgId },
      select: { id: true },
    })
    if (byOrg) return byOrg
  }

  // Second chance for an event that predates the org id being carried through
  // checkout — the provider id was still stored on the first successful event.
  return tx.subscription.findFirst({
    where: { billingSubscriptionId: providerSubscriptionId },
    select: { id: true },
  })
}
