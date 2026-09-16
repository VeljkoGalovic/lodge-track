import type { Role } from "@prisma/client"

/**
 * How a role is presented. Shared so the team list, the invite form and any
 * future member picker all say "Manager" rather than "MANAGER".
 */
export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  MAINTENANCE: "Maintenance",
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Full access, including billing and organization settings",
  MANAGER: "Can add and edit properties, bookings and team members",
  MAINTENANCE: "Read-only access to properties and bookings",
}

export const ROLE_BADGE_VARIANTS: Record<Role, "default" | "secondary" | "warning"> = {
  OWNER: "default",
  MANAGER: "secondary",
  MAINTENANCE: "warning",
}

/** Roles an inviter may hand out, in descending order of privilege. */
export const INVITABLE_ROLES: Role[] = ["MANAGER", "MAINTENANCE", "OWNER"]
