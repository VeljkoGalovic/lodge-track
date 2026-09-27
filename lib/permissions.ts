import type { Tier } from "@/lib/subscriptions"

export interface EnterpriseFeatureFlags {
  canManageRoles: boolean
  canConfigureSSO: boolean
  canAccessEnterpriseSettings: boolean
}

/**
 * Returns feature flags for business-tier functionality.
 * These features are only available on the ENTERPRISE subscription tier.
 * STARTER and PRO tiers cannot access RBAC/SSO configurations.
 */
export function getEnterpriseFeatures(tier: Tier): EnterpriseFeatureFlags {
  const isEnterprise = tier === "ENTERPRISE"

  return {
    canManageRoles: isEnterprise,
    canConfigureSSO: isEnterprise,
    canAccessEnterpriseSettings: isEnterprise,
  }
}

/**
 * Checks if a tier has access to role management (RBAC).
 * Only ENTERPRISE tier can modify roles beyond the default hierarchy.
 */
export function canManageRoles(tier: Tier): boolean {
  return tier === "ENTERPRISE"
}

/**
 * Checks if a tier has access to SSO configuration.
 * Only ENTERPRISE tier can configure custom SSO providers.
 */
export function canConfigureSSO(tier: Tier): boolean {
  return tier === "ENTERPRISE"
}

/**
 * Checks if a tier has access to enterprise settings (account manager, etc.).
 * Only ENTERPRISE tier gets dedicated account manager contact.
 */
export function canAccessEnterpriseSettings(tier: Tier): boolean {
  return tier === "ENTERPRISE"
}

/**
 * Gets the dedicated account manager email for Business tier organizations.
 * Returns veljko@lodgetrack.com for ENTERPRISE tier, null for other tiers.
 */
export function getAccountManagerEmail(tier: Tier): string | null {
  return tier === "ENTERPRISE" ? "veljko@lodgetrack.com" : null
}