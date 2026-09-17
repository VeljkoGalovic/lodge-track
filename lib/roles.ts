import type { Role } from "@prisma/client"

/**
 * How a role is presented. Shared so the team list, the invite form and any
 * future member picker all colour the same role the same way.
 *
 * The *names* live in the dictionary under `roles.labels`, not here: a role is a
 * closed set that every language has to name, and keeping the English words in
 * this module would put them out of reach of the translation.
 */
export const ROLE_BADGE_VARIANTS: Record<Role, "default" | "secondary" | "warning"> = {
  OWNER: "default",
  MANAGER: "secondary",
  MAINTENANCE: "warning",
}

/** Roles an inviter may hand out, in descending order of privilege. */
export const INVITABLE_ROLES: Role[] = ["MANAGER", "MAINTENANCE", "OWNER"]
