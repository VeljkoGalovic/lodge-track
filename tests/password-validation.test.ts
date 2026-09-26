import { describe, it, expect } from "vitest"
import { validatePassword, getPasswordStrength, getUnmetRequirements } from "@/lib/password-validation"

describe("validatePassword", () => {
  it("accepts a valid password with all requirements", () => {
    const result = validatePassword("Test123!")
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("accepts valid passwords with various special characters", () => {
    const specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    for (const char of specialChars) {
      const password = `Test123${char}`
      const result = validatePassword(password)
      expect(result.valid).toBe(true)
    }
  })

  it("rejects password shorter than 8 characters", () => {
    const result = validatePassword("Test1!")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("At least 8 characters")
  })

  it("rejects password missing uppercase letter", () => {
    const result = validatePassword("test123!")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("One uppercase letter")
  })

  it("rejects password missing lowercase letter", () => {
    const result = validatePassword("TEST123!")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("One lowercase letter")
  })

  it("rejects password missing number", () => {
    const result = validatePassword("TestTest!")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("One number")
  })

  it("rejects password missing special character", () => {
    const result = validatePassword("Test1234")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("One special character (!@#$%^&*)")
  })

  it("rejects empty password", () => {
    const result = validatePassword("")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("At least 8 characters")
    expect(result.errors).toContain("One uppercase letter")
    expect(result.errors).toContain("One lowercase letter")
    expect(result.errors).toContain("One number")
    expect(result.errors).toContain("One special character (!@#$%^&*)")
  })

  it("rejects password with only lowercase", () => {
    const result = validatePassword("password")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("One uppercase letter")
    expect(result.errors).toContain("One number")
    expect(result.errors).toContain("One special character (!@#$%^&*)")
  })

  it("rejects password with only numbers", () => {
    const result = validatePassword("12345678")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("One uppercase letter")
    expect(result.errors).toContain("One lowercase letter")
    expect(result.errors).toContain("One special character (!@#$%^&*)")
  })

  it("returns all errors when multiple requirements missing", () => {
    const result = validatePassword("test")
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })
})

describe("getPasswordStrength", () => {
  it("returns 0 for empty password", () => {
    expect(getPasswordStrength("")).toBe(0)
  })

  it("returns 1 for password with only length requirement met", () => {
    // Password with only length met (no lowercase, uppercase, number, special)
    // This would need to be 8+ chars with only one type, e.g., all special chars
    // But that's unrealistic. More practically, any 8+ char password will have at least 2.
    // Test with a short password that only has one requirement
    expect(getPasswordStrength("weak")).toBe(1) // only lowercase
    expect(getPasswordStrength("WEAK")).toBe(1) // only uppercase
    expect(getPasswordStrength("1234")).toBe(1) // only numbers
  })

  it("returns 2 for password with length and lowercase", () => {
    expect(getPasswordStrength("password")).toBe(2) // length + lowercase
  })

  it("returns 3 for password with length, lowercase, uppercase", () => {
    expect(getPasswordStrength("Password")).toBe(3) // length + lowercase + uppercase
  })

  it("returns 4 for password with length, lowercase, uppercase, number", () => {
    expect(getPasswordStrength("Password1")).toBe(4)
  })

  it("returns 5 for valid password meeting all requirements", () => {
    expect(getPasswordStrength("Password1!")).toBe(5)
  })

  it("returns 5 for very strong password", () => {
    expect(getPasswordStrength("MyStr0ng!Pass")).toBe(5)
  })
})

describe("getUnmetRequirements", () => {
  it("returns empty array for valid password", () => {
    expect(getUnmetRequirements("Valid123!")).toEqual([])
  })

  it("returns all requirements for empty password", () => {
    const errors = getUnmetRequirements("")
    expect(errors).toContain("At least 8 characters")
    expect(errors).toContain("One uppercase letter")
    expect(errors).toContain("One lowercase letter")
    expect(errors).toContain("One number")
    expect(errors).toContain("One special character (!@#$%^&*)")
  })

  it("returns specific unmet requirements", () => {
    const errors = getUnmetRequirements("weak")
    expect(errors).toContain("At least 8 characters")
    expect(errors).toContain("One uppercase letter")
    expect(errors).toContain("One number")
    expect(errors).toContain("One special character (!@#$%^&*)")
    expect(errors).not.toContain("One lowercase letter")
  })
})