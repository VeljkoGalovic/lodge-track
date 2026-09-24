import { describe, expect, it } from "vitest"
import { en, getDictionary, format, type Dictionary } from "@/lib/i18n/dictionaries"

const sr = getDictionary("sr")

/**
 * These tests verify that all billing-related i18n keys exist in both English and Serbian dictionaries.
 * They ensure no keys are accidentally removed when cleaning up storage references.
 */

describe("i18n billing keys - English", () => {
  const t = en

  it("has billing section", () => {
    expect(t.pages.billing).toBeDefined()
  })

  // Tier taglines
  it("has starterTagline", () => {
    expect(t.pages.billing.starterTagline).toBe("For a first property or two")
  })
  it("has proTagline", () => {
    expect(t.pages.billing.proTagline).toBe("For a growing portfolio")
  })
  it("has enterpriseTagline", () => {
    expect(t.pages.billing.enterpriseTagline).toBe("For large or multi-site operators")
  })

  // Feature labels
  it("has propertyManagement", () => {
    expect(t.pages.billing.propertyManagement).toBe("Property and booking management")
  })
  it("has calendar", () => {
    expect(t.pages.billing.calendar).toBe("Availability calendar")
  })
  it("has notifications", () => {
    expect(t.pages.billing.notifications).toBe("Activity feed and notifications")
  })
  it("has members", () => {
    expect(t.pages.billing.members).toBe("Team members with roles")
  })

  // Property limits
  it("has unlimitedProperties", () => {
    expect(t.pages.billing.unlimitedProperties).toBe("Unlimited properties")
  })
  it("has propertyAllowance", () => {
    expect(t.pages.billing.propertyAllowance).toBe("Property limit: {count}")
  })

  // Analytics
  it("has analytics", () => {
    expect(t.pages.billing.analytics).toBe("Advanced financial analytics")
  })
  it("has noAnalytics", () => {
    expect(t.pages.billing.noAnalytics).toBe("No advanced analytics")
  })

  // Permissions
  it("has permissions", () => {
    expect(t.pages.billing.permissions).toBe("Role-based permissions")
  })
  it("has noPermissions", () => {
    expect(t.pages.billing.noPermissions).toBe("No role-based permissions")
  })

  // API
  it("has noApi", () => {
    expect(t.pages.billing.noApi).toBe("No API access")
  })

  // Comparison table features
  it("has bookingManagement", () => {
    expect(t.pages.billing.bookingManagement).toBe("Booking management")
  })
  it("has activity", () => {
    expect(t.pages.billing.activity).toBe("Activity feed")
  })
  it("has financialAnalytics", () => {
    expect(t.pages.billing.financialAnalytics).toBe("Financial analytics")
  })

  // Error messages
  it("has errorNotConfigured", () => {
    expect(t.pages.billing.errorNotConfigured).toBeDefined()
  })
  it("has errorUnknownTier", () => {
    expect(t.pages.billing.errorUnknownTier).toBe("That plan is not one we sell.")
  })
  it("has errorNotOwner", () => {
    expect(t.pages.billing.errorNotOwner).toBe("Only an owner of this organization can change its plan.")
  })
  it("has checkoutComplete", () => {
    expect(t.pages.billing.checkoutComplete).toBeDefined()
  })

  // Current plan card
  it("has currentPlan", () => {
    expect(t.pages.billing.currentPlan).toBe("Current plan")
  })
  it("has currentPlanHelp", () => {
    expect(t.pages.billing.currentPlanHelp).toBe("Your current subscription tier")
  })
  it("has planPrice", () => {
    expect(t.pages.billing.planPrice).toBe("Plan price")
  })
  it("has free", () => {
    expect(t.pages.billing.free).toBe("Free")
  })
  it("has monthlyPrice", () => {
    expect(t.pages.billing.monthlyPrice).toBe("{amount}/mo")
  })
  it("has perMonth", () => {
    expect(t.pages.billing.perMonth).toBe("/month")
  })
  it("has propertiesUsed", () => {
    expect(t.pages.billing.propertiesUsed).toBe("Properties used")
  })
  it("has providerSubscription", () => {
    expect(t.pages.billing.providerSubscription).toBe("Lemon Squeezy subscription")
  })
  it("has periodEnds", () => {
    expect(t.pages.billing.periodEnds).toBe("Current period ends {date}.")
  })
  it("has lifetimeHelp", () => {
    expect(t.pages.billing.lifetimeHelp).toBeDefined()
  })
  it("has portalHelp", () => {
    expect(t.pages.billing.portalHelp).toBeDefined()
  })

  // Plan selection
  it("has choosePlan", () => {
    expect(t.pages.billing.choosePlan).toBe("Choose your plan")
  })
  it("has popular", () => {
    expect(t.pages.billing.popular).toBe("Most popular")
  })
  it("has choose", () => {
    expect(t.pages.billing.choose).toBe("Choose {plan}")
  })
  it("has ownerOnlyHint", () => {
    expect(t.pages.billing.ownerOnlyHint).toBe("Only an owner can change this organization’s plan")
  })
  it("has unavailableHint", () => {
    expect(t.pages.billing.unavailableHint).toBe("Checkout is not configured on this deployment")
  })
  it("has unavailable", () => {
    expect(t.pages.billing.unavailable).toBe("Checkout unavailable")
  })
  it("has ownerOnly", () => {
    expect(t.pages.billing.ownerOnly).toBe("Owner only")
  })

  // Disclaimer and comparison
  it("has priceDisclaimer", () => {
    expect(t.pages.billing.priceDisclaimer).toBeDefined()
  })
  it("has comparison", () => {
    expect(t.pages.billing.comparison).toBe("Feature comparison")
  })
  it("has comparisonHelp", () => {
    expect(t.pages.billing.comparisonHelp).toBeDefined()
  })
  it("has feature", () => {
    expect(t.pages.billing.feature).toBe("Feature")
  })

  // Billing history
  it("has history", () => {
    expect(t.pages.billing.history).toBe("Billing history")
  })
  it("has historyHelp", () => {
    expect(t.pages.billing.historyHelp).toBe("Invoices are issued by Lemon Squeezy")
  })
  it("has noInvoices", () => {
    expect(t.pages.billing.noInvoices).toBeDefined()
  })

  // Configuration warnings
  it("has notConfigured", () => {
    expect(t.pages.billing.notConfigured).toBe("Billing is not configured on this deployment")
  })
  it("has configurationHelp", () => {
    expect(t.pages.billing.configurationHelp).toBeDefined()
  })
  it("has webhooksReady", () => {
    expect(t.pages.billing.webhooksReady).toBeDefined()
  })
  it("has webhooksUnavailable", () => {
    expect(t.pages.billing.webhooksUnavailable).toBeDefined()
  })

  // Statuses
  it("has statuses object", () => {
    expect(t.pages.billing.statuses).toBeDefined()
    expect(t.pages.billing.statuses.ACTIVE).toBe("Active")
    expect(t.pages.billing.statuses.PAST_DUE).toBe("Past due")
    expect(t.pages.billing.statuses.CANCELED).toBe("Canceled")
    expect(t.pages.billing.statuses.TRIALING).toBe("Trial")
    expect(t.pages.billing.statuses.PAUSED).toBe("Paused")
  })

  // Title and description
  it("has title", () => {
    expect(t.pages.billing.title).toBe("Billing & Subscription")
  })
  it("has description", () => {
    expect(t.pages.billing.description).toBe("Manage your plan and billing details.")
  })

  // Critical: verify storage keys are REMOVED
  it("does NOT have unlimitedStorage key", () => {
    expect("unlimitedStorage" in t.pages.billing).toBe(false)
  })
  it("does NOT have storageAllowance key", () => {
    expect("storageAllowance" in t.pages.billing).toBe(false)
  })
})

describe("i18n billing keys - Serbian", () => {
  const t = sr

  it("has billing section", () => {
    expect(t.pages.billing).toBeDefined()
  })

  // Tier taglines
  it("has starterTagline", () => {
    expect(t.pages.billing.starterTagline).toBe("Za prvi objekat ili dva")
  })
  it("has proTagline", () => {
    expect(t.pages.billing.proTagline).toBe("Za rastući portfolio")
  })
  it("has enterpriseTagline", () => {
    expect(t.pages.billing.enterpriseTagline).toBe("Za velike operatere ili više lokacija")
  })

  // Feature labels
  it("has propertyManagement", () => {
    expect(t.pages.billing.propertyManagement).toBe("Upravljanje objektima i rezervacijama")
  })
  it("has calendar", () => {
    expect(t.pages.billing.calendar).toBe("Kalendar zauzetosti")
  })
  it("has notifications", () => {
    expect(t.pages.billing.notifications).toBe("Pregled aktivnosti i obaveštenja")
  })
  it("has members", () => {
    expect(t.pages.billing.members).toBe("Članovi tima sa ulogama")
  })

  // Property limits
  it("has unlimitedProperties", () => {
    expect(t.pages.billing.unlimitedProperties).toBe("Neograničen broj objekata")
  })
  it("has propertyAllowance", () => {
    expect(t.pages.billing.propertyAllowance).toBe("Ograničenje broja objekata: {count}")
  })

  // Analytics
  it("has analytics", () => {
    expect(t.pages.billing.analytics).toBe("Napredna finansijska analitika")
  })
  it("has noAnalytics", () => {
    expect(t.pages.billing.noAnalytics).toBe("Bez napredne analitike")
  })

  // Permissions
  it("has permissions", () => {
    expect(t.pages.billing.permissions).toBe("Dozvole zasnovane na ulogama")
  })
  it("has noPermissions", () => {
    expect(t.pages.billing.noPermissions).toBe("Bez dozvola zasnovanih na ulogama")
  })

  // API
  it("has noApi", () => {
    expect(t.pages.billing.noApi).toBe("Bez API pristupa")
  })

  // Comparison table features
  it("has bookingManagement", () => {
    expect(t.pages.billing.bookingManagement).toBe("Upravljanje rezervacijama")
  })
  it("has activity", () => {
    expect(t.pages.billing.activity).toBe("Pregled aktivnosti")
  })
  it("has financialAnalytics", () => {
    expect(t.pages.billing.financialAnalytics).toBe("Finansijska analitika")
  })

  // Error messages
  it("has errorNotConfigured", () => {
    expect(t.pages.billing.errorNotConfigured).toBeDefined()
  })
  it("has errorUnknownTier", () => {
    expect(t.pages.billing.errorUnknownTier).toBe("Taj plan nije u ponudi.")
  })
  it("has errorNotOwner", () => {
    expect(t.pages.billing.errorNotOwner).toBe("Samo vlasnik ove organizacije može da promeni plan.")
  })
  it("has checkoutComplete", () => {
    expect(t.pages.billing.checkoutComplete).toBeDefined()
  })

  // Current plan card
  it("has currentPlan", () => {
    expect(t.pages.billing.currentPlan).toBe("Trenutni plan")
  })
  it("has currentPlanHelp", () => {
    expect(t.pages.billing.currentPlanHelp).toBe("Vaš trenutni nivo pretplate")
  })
  it("has planPrice", () => {
    expect(t.pages.billing.planPrice).toBe("Cena plana")
  })
  it("has free", () => {
    expect(t.pages.billing.free).toBe("Besplatno")
  })
  it("has monthlyPrice", () => {
    expect(t.pages.billing.monthlyPrice).toBe("{amount}/mes.")
  })
  it("has perMonth", () => {
    expect(t.pages.billing.perMonth).toBe("/mesec")
  })
  it("has propertiesUsed", () => {
    expect(t.pages.billing.propertiesUsed).toBe("Broj objekata")
  })
  it("has providerSubscription", () => {
    expect(t.pages.billing.providerSubscription).toBe("Lemon Squeezy pretplata")
  })
  it("has periodEnds", () => {
    expect(t.pages.billing.periodEnds).toBe("Trenutni period se završava {date}.")
  })
  it("has lifetimeHelp", () => {
    expect(t.pages.billing.lifetimeHelp).toBeDefined()
  })
  it("has portalHelp", () => {
    expect(t.pages.billing.portalHelp).toBeDefined()
  })

  // Plan selection
  it("has choosePlan", () => {
    expect(t.pages.billing.choosePlan).toBe("Izaberite plan")
  })
  it("has popular", () => {
    expect(t.pages.billing.popular).toBe("Najpopularniji")
  })
  it("has choose", () => {
    expect(t.pages.billing.choose).toBe("Izaberi {plan}")
  })
  it("has ownerOnlyHint", () => {
    expect(t.pages.billing.ownerOnlyHint).toBe("Samo vlasnik može da promeni plan ove organizacije")
  })
  it("has unavailableHint", () => {
    expect(t.pages.billing.unavailableHint).toBe("Plaćanje nije podešeno u ovoj instalaciji")
  })
  it("has unavailable", () => {
    expect(t.pages.billing.unavailable).toBe("Plaćanje nije dostupno")
  })
  it("has ownerOnly", () => {
    expect(t.pages.billing.ownerOnly).toBe("Samo vlasnik")
  })

  // Disclaimer and comparison
  it("has priceDisclaimer", () => {
    expect(t.pages.billing.priceDisclaimer).toBeDefined()
  })
  it("has comparison", () => {
    expect(t.pages.billing.comparison).toBe("Poređenje funkcija")
  })
  it("has comparisonHelp", () => {
    expect(t.pages.billing.comparisonHelp).toBeDefined()
  })
  it("has feature", () => {
    expect(t.pages.billing.feature).toBe("Funkcija")
  })

  // Billing history
  it("has history", () => {
    expect(t.pages.billing.history).toBe("Istorija naplate")
  })
  it("has historyHelp", () => {
    expect(t.pages.billing.historyHelp).toBe("Račune izdaje Lemon Squeezy")
  })
  it("has noInvoices", () => {
    expect(t.pages.billing.noInvoices).toBeDefined()
  })

  // Configuration warnings
  it("has notConfigured", () => {
    expect(t.pages.billing.notConfigured).toBe("Naplata nije podešena u ovoj instalaciji")
  })
  it("has configurationHelp", () => {
    expect(t.pages.billing.configurationHelp).toBeDefined()
  })
  it("has webhooksReady", () => {
    expect(t.pages.billing.webhooksReady).toBeDefined()
  })
  it("has webhooksUnavailable", () => {
    expect(t.pages.billing.webhooksUnavailable).toBeDefined()
  })

  // Statuses
  it("has statuses object", () => {
    expect(t.pages.billing.statuses).toBeDefined()
    expect(t.pages.billing.statuses.ACTIVE).toBe("Aktivna")
    expect(t.pages.billing.statuses.PAST_DUE).toBe("Dospela")
    expect(t.pages.billing.statuses.CANCELED).toBe("Otkazana")
    expect(t.pages.billing.statuses.TRIALING).toBe("Probna")
    expect(t.pages.billing.statuses.PAUSED).toBe("Pauzirana")
  })

  // Title and description
  it("has title", () => {
    expect(t.pages.billing.title).toBe("Naplata i pretplata")
  })
  it("has description", () => {
    expect(t.pages.billing.description).toBe("Upravljajte planom i podacima za naplatu.")
  })

  // Critical: verify storage keys are REMOVED
  it("does NOT have unlimitedStorage key", () => {
    expect("unlimitedStorage" in t.pages.billing).toBe(false)
  })
  it("does NOT have storageAllowance key", () => {
    expect("storageAllowance" in t.pages.billing).toBe(false)
  })
})

describe("format helper works with billing keys", () => {
  it("formats propertyAllowance with count", () => {
    expect(format(en.pages.billing.propertyAllowance, { count: "3" })).toBe("Property limit: 3")
    expect(format(sr.pages.billing.propertyAllowance, { count: "3" })).toBe("Ograničenje broja objekata: 3")
  })

  it("formats monthlyPrice with amount", () => {
    expect(format(en.pages.billing.monthlyPrice, { amount: "$19.99" })).toBe("$19.99/mo")
    expect(format(sr.pages.billing.monthlyPrice, { amount: "$19.99" })).toBe("$19.99/mes.")
  })

  it("formats choose with plan name", () => {
    expect(format(en.pages.billing.choose, { plan: "Pro" })).toBe("Choose Pro")
    expect(format(sr.pages.billing.choose, { plan: "Pro" })).toBe("Izaberi Pro")
  })

  it("formats periodEnds with date", () => {
    expect(format(en.pages.billing.periodEnds, { date: "Sep 30, 2026" })).toBe("Current period ends Sep 30, 2026.")
    expect(format(sr.pages.billing.periodEnds, { date: "30. sep 2026." })).toBe("Trenutni period se završava 30. sep 2026..")
  })
})

describe("Dictionary type consistency", () => {
  it("Serbian dictionary satisfies Dictionary type (compile-time check)", () => {
    // en is typed as the source-of-truth shape; getDictionary returns Dictionary.
    // We verify both are valid Dictionary objects at runtime.
    const _enCheck: Dictionary = en
    const _srCheck: Dictionary = getDictionary("sr")
    expect(_enCheck).toBeDefined()
    expect(_srCheck).toBeDefined()
  })
})