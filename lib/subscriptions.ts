/**
 * `import type` deliberately: this module's values are read by client components
 * (the sidebar and the shell), and a value import from `@prisma/client` would put
 * the Prisma runtime on the browser side of the boundary. The enum is only ever
 * used in type positions here, so the import is erased entirely.
 */
import type { SubscriptionTier } from "@prisma/client";

export type Tier = SubscriptionTier;

export interface OrgFeatures {
  tier: Tier;
  maxProperties: number;
  /**
   * Byte cap on stored receipts for the whole organization.
   *
   * `Infinity` on ENTERPRISE, which is why every comparison against it must be
   * `>`, never `>=` — and why the remaining-space arithmetic below is written to
   * stay meaningful when the limit is unbounded.
   */
  maxStorageBytes: number;
  hasAdvancedAnalytics: boolean;
  hasTeamRoles: boolean;
  hasApiAccess: boolean;
}

const TIER_LIMITS: Record<Tier, number> = {
  STARTER: 3,
  PRO: 15,
  ENTERPRISE: Infinity,
};

/**
 * Decimal gigabytes, not binary.
 *
 * A tier advertised as "5 GB" has to be the same 5 GB the cap enforces, and the
 * number a host reads in the error message has to be the number on the plan page.
 * Mixing 1000-based display with 1024-based limits turns "5 GB" into "4.7 GB used
 * of 5 GB" the moment the account is full, which reads like a billing bug.
 */
const GB = 1_000_000_000;

const TIER_STORAGE_BYTES: Record<Tier, number> = {
  STARTER: 1 * GB,
  PRO: 5 * GB,
  ENTERPRISE: Infinity,
};

const TIER_FEATURES: Record<Tier, Omit<OrgFeatures, "tier" | "maxProperties" | "maxStorageBytes">> = {
  STARTER: {
    hasAdvancedAnalytics: false,
    hasTeamRoles: false,
    hasApiAccess: false,
  },
  PRO: {
    hasAdvancedAnalytics: true,
    hasTeamRoles: true,
    hasApiAccess: true,
  },
  ENTERPRISE: {
    hasAdvancedAnalytics: true,
    hasTeamRoles: true,
    hasApiAccess: true,
  },
};

export function getOrgFeatures(
  tier: Tier,
  maxPropertiesOverride?: number | null,
  hasApiAccessOverride?: boolean | null
): OrgFeatures {
  const features = TIER_FEATURES[tier];
  return {
    tier,
    maxProperties: maxPropertiesOverride ?? TIER_LIMITS[tier],
    maxStorageBytes: TIER_STORAGE_BYTES[tier],
    ...features,
    /**
     * The override wins in both directions: a beta user granted API access on
     * STARTER gets it, and a negotiation that withholds it on PRO keeps it off.
     * An explicit `false` is a decision rather than an absence, so `??` is the
     * right operator here — `||` would let a deliberate `false` fall through.
     */
    hasApiAccess: hasApiAccessOverride ?? features.hasApiAccess,
  };
}

/** Bytes left under a cap, or `Infinity` when the tier has no cap. */
export function remainingStorageBytes(usedBytes: number, limitBytes: number): number {
  return limitBytes - usedBytes;
}

/**
 * A byte count as a short human string, in the same decimal units as the limits
 * above.
 *
 * Powers the over-quota message, where "4.7 GB of 5 GB" tells a host something
 * that "4,700,000,000 bytes" does not.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "unlimited";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  // Whole numbers below 100, one decimal above, so "1.5 GB" and "512 MB" both
  // read naturally and neither shows a misleading "5 GB" for 4,950,000,000.
  const shown = unit === 0 || value >= 100 ? Math.round(value) : Number(value.toFixed(1));
  return `${shown} ${units[unit]}`;
}

/**
 * Badge classes for a tier, tuned to the dashboard's dark palette. Callers apply
 * these over a `Badge`, whose `className` wins through `cn`'s conflict merging.
 */
const TIER_BADGE_COLORS: Record<Tier, string> = {
  STARTER: "border-white/10 bg-white/5 text-slate-300",
  PRO: "border-[#36BFAE]/25 bg-[#36BFAE]/10 text-[#36BFAE]",
  ENTERPRISE: "border-[#BA87FF]/25 bg-[#BA87FF]/10 text-[#BA87FF]",
};

export function getTierBadgeColor(tier: Tier): string {
  return TIER_BADGE_COLORS[tier];
}

export function getTierLabel(tier: Tier): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}