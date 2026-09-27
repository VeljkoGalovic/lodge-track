import type { Tier } from "@/lib/subscriptions"

export interface BusinessFeatureFlags {
  canManageRoles: boolean
  canConfigureSSO: boolean
  canAccessBusinessSettings: boolean
}

/**
 * Returns feature flags for business-tier functionality.
 * These features are only available on the BUSINESS subscription tier.
 * STARTER and PRO tiers cannot access RBAC/SSO configurations.
 */
export function getBusinessFeatures(tier: Tier): BusinessFeatureFlags {
  const isBusiness = tier === "BUSINESS"

  return {
    canManageRoles: isBusiness,
    canConfigureSSO: isBusiness,
    canAccessBusinessSettings: isBusiness,
  }
}

/**
 * Checks if a tier has access to role management (RBAC).
 * Only BUSINESS tier can modify roles beyond the default hierarchy.
 */
export function canManageRoles(tier: Tier): boolean {
  return tier === "BUSINESS"
}

/**
 * Checks if a tier has access to SSO configuration.
 * Only BUSINESS tier can configure custom SSO providers.
 */
export function canConfigureSSO(tier: Tier): boolean {
  return tier === "BUSINESS"
}

/**
 * Checks if a tier has access to business settings (account manager, etc.).
 * Only BUSINESS tier gets dedicated account manager contact.
 */
export function canAccessBusinessSettings(tier: Tier): boolean {
  return tier === "BUSINESS"
}

/**
 * Gets the dedicated account manager email for Business tier organizations.
 * Returns veljko@lodgetrack.com for BUSINESS tier, null for other tiers.
 */
export function getAccountManagerEmail(tier: Tier): string | null {
  return tier === "BUSINESS" ? "veljko@lodgetrack.com" : null
}