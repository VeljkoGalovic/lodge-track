import { NextResponse } from "next/server"
import { currentMembership } from "@/lib/authorization"
import { attachmentQuota } from "@/lib/attachment-quota"
import { formatBytes } from "@/lib/subscriptions"

export async function GET() {
  const membership = await currentMembership()
  if (!membership) {
    return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 })
  }

  const quota = await attachmentQuota(membership.organization.id)
  if (!quota) {
    return NextResponse.json({ error: "Your organization could not be found." }, { status: 404 })
  }

  const used = formatBytes(quota.usedBytes)
  const limit = quota.limitBytes === Infinity ? "Unlimited" : formatBytes(quota.limitBytes)
  const free = quota.limitBytes === Infinity ? "Unlimited" : formatBytes(Math.max(0, quota.limitBytes - quota.usedBytes))

  return NextResponse.json({
    usedBytes: quota.usedBytes,
    limitBytes: quota.limitBytes,
    used,
    limit,
    free,
    percentUsed: quota.limitBytes === Infinity ? 0 : Math.round((quota.usedBytes / quota.limitBytes) * 100),
  })
}