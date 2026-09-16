import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
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

  const eventName = payload.meta?.event_name
  const eventId = request.headers.get("x-event-id") ?? payload.data?.id
  if (!eventName || !eventId) {
    return NextResponse.json({ error: "missing event identity" }, { status: 400 })
  }

  // Lemon Squeezy retries until it sees a 2xx, so the same event can arrive more
  // than once. The id is the primary key of WebhookEvent, which makes this
  // check-and-insert atomic: a duplicate loses the race and is acknowledged
  // without being applied twice.
  //
  // Recorded before the work rather than after, so a handler that crashes
  // half-way is not retried into a partial second application. The trade is that
  // a genuinely failed update is not retried either, which is why the log line
  // below exists.
  try {
    await prisma.webhookEvent.create({ data: { id: eventId, provider: "lemonsqueezy", type: eventName } })
  } catch {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    await applyEvent(eventName, payload)
  } catch (error) {
    // Still a 2xx: the event is recorded, so a retry would be rejected as a
    // duplicate and the failure would be invisible either way. The log is the
    // honest record of it.
    console.error("[billing] failed to apply webhook", eventId, eventName, error)
    return NextResponse.json({ received: true, applied: false })
  }

  return NextResponse.json({ received: true, applied: true })
}

/**
 * Only subscription lifecycle events are acted on. Order events, licence keys
 * and the rest are recorded and acknowledged so they are not retried — but they
 * do not touch a plan.
 */
async function applyEvent(eventName: string, payload: WebhookPayload): Promise<void> {
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

  // `ends_at` is set when a subscription is cancelled but still running, so it
  // is a better end date than `renews_at` whenever it is present.
  const periodEnd = attributes.ends_at ?? attributes.renews_at
  const tier = tierForVariantId(attributes.variant_id ? String(attributes.variant_id) : null)

  const subscription = await findSubscription(orgId, providerSubscriptionId)

  // A subscription event for an organization this deployment does not know
  // about cannot be applied, and inventing a tenant from a webhook would be
  // worse than dropping it.
  if (!subscription) {
    console.warn("[billing] no matching subscription for webhook", eventName, orgId, providerSubscriptionId)
    return
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status,
      // Left as it is when the variant is unrecognised, so an unconfigured
      // variant id cannot silently downgrade a paying organization.
      ...(tier ? { tier } : {}),
      billingSubscriptionId: providerSubscriptionId,
      currentPeriodEnd: periodEnd ? new Date(periodEnd) : null,
    },
  })
}

/** The subscription this event belongs to, matched by organization before provider id. */
async function findSubscription(orgId: string | undefined, providerSubscriptionId: string) {
  if (orgId) {
    const byOrg = await prisma.subscription.findUnique({
      where: { orgId },
      select: { id: true },
    })
    if (byOrg) return byOrg
  }

  // Second chance for an event that predates the org id being carried through
  // checkout — the provider id was still stored on the first successful event.
  return prisma.subscription.findFirst({
    where: { billingSubscriptionId: providerSubscriptionId },
    select: { id: true },
  })
}
