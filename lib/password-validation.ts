/**
 * Password validation utility - shared between client and server
 * Rules: min 8 chars, uppercase, lowercase, number, special character
 */

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

const MIN_LENGTH = 8
// Dash must be at the end or escaped to avoid being interpreted as range operator
const SPECIAL_CHARS = "!@#$%^&*()_+=[]{}|;:,.<>?-"

/**
 * Validates a password against the policy requirements
 * Returns an object with valid boolean and array of error messages
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < MIN_LENGTH) {
    errors.push(`At least ${MIN_LENGTH} characters`)
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("One uppercase letter")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("One lowercase letter")
  }

  if (!/[0-9]/.test(password)) {
    errors.push("One number")
  }

  if (!new RegExp(`[${SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`).test(password)) {
    errors.push("One special character (!@#$%^&*)")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Checks if password meets minimum requirements (for real-time feedback)
 * Returns the number of satisfied requirements (0-5)
 */
export function getPasswordStrength(password: string): number {
  let strength = 0
  if (password.length >= MIN_LENGTH) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (new RegExp(`[${SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`).test(password)) strength++
  return strength
}

/**
 * Gets the list of unmet requirements for display
 */
export function getUnmetRequirements(password: string): string[] {
  const { errors } = validatePassword(password)
  return errors
}