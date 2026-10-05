# Post-Checkout Handshake & Registration Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Lemon Squeezy post-checkout handshake gaps (Phase 1) and refactor registration from 5-step wizard to single-screen form (Phase 2).

**Architecture:** Phase 1 adds a polling endpoint (`GET /api/billing/status`) and client-side polling on billing page to handle webhook race conditions. Dashboard redirect loop is prevented by checking subscription state before creating checkout. Phase 2 consolidates registration into one form with language selector at top, removes plan selection step, and auto-logs in after email verification with checkout redirect.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Prisma, Lemon Squeezy, next-auth

**Spec:** Based on user requirements for Requirement 5 fixes + registration refactor

---

## Global Constraints

- All tiers (STARTER, PRO, BUSINESS) are paid with 30-day trials
- Dashboard must not enter infinite redirect loop on checkout creation failure
- Billing page must handle `checkout=complete` param (already present)
- Registration form must auto-login after email verification and redirect to checkout for paid tier
- Language selector must remain functional at top of registration form
- Clean up deprecated wizard components (PlanStep, multi-step logic)

---

## Review Focus

1. **Webhook race condition** — User returns to billing page before webhook processes; polling must surface subscription status
2. **Redirect loop** — Dashboard creates checkout when identifiers missing; must handle failed checkout creation gracefully
3. **Parameter alignment** — Checkout redirect uses `checkout=complete`; billing page already checks this
4. **Single-screen registration** — All fields on one page, no step navigation, language selector at top
5. **Auto-login flow** — Email verification completes, signs user in, redirects to checkout for their tier
6. **Cleanup** — Deprecated wizard components removed, no dead code

---

### Phase 1: Post-Checkout Handshake Fixes

---

### Task 1: Create GET /api/billing/status endpoint

**Files:**
- Create: `app/api/billing/status/route.ts`
- Test: Manual/API testing

**Interfaces:**
- Consumes: `prisma`, `hasValidAccess`, `tierForVariantId`, `billingStatus` from `lib/billing`
- Produces: JSON response with subscription status, tier, hasAccess, billing identifiers

- [ ] **Step 1: Create the status endpoint**

```typescript
// app/api/billing/status/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { hasValidAccess, tierForVariantId } from "@/lib/billing"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: { include: { subscription: true } } },
  })

  if (!user?.organization?.subscription) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 })
  }

  const sub = user.organization.subscription
  const hasAccess = hasValidAccess(sub.status, sub.trialEndsAt)

  return NextResponse.json({
    tier: sub.tier,
    status: sub.status,
    hasAccess,
    billingSubscriptionId: sub.billingSubscriptionId,
    billingCustomerId: sub.billingCustomerId,
    currentPeriodEnd: sub.currentPeriodEnd,
    trialEndsAt: sub.trialEndsAt,
  })
}
```

- [ ] **Step 2: Test endpoint**

Run: `npm run dev` and call `GET /api/billing/status` with authenticated session
Expected: JSON with subscription data

- [ ] **Step 3: Commit**

```bash
git add app/api/billing/status/route.ts
git commit -m "feat(billing): add GET /api/billing/status endpoint for polling"
```

---

### Task 2: Implement client-side polling on billing page

**Files:**
- Modify: `app/dashboard/billing/page.tsx`
- Test: Manual verification

**Interfaces:**
- Consumes: New status endpoint, existing `params.checkout === "complete"`
- Produces: Polling logic that updates UI when subscription activates

- [ ] **Step 1: Add polling state and effect to BillingPage**

```tsx
// In BillingPage component, add after params destructuring:
const [polling, setPolling] = useState(false)
const [pollResult, setPollResult] = useState<{
  hasAccess: boolean
  billingSubscriptionId: string | null
} | null>(null)

useEffect(() => {
  if (params.checkout === "complete") {
    setPolling(true)
    let attempts = 0
    const maxAttempts = 30 // 30 seconds max
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/billing/status")
        if (res.ok) {
          const data = await res.json()
          setPollResult({ hasAccess: data.hasAccess, billingSubscriptionId: data.billingSubscriptionId })
          if (data.hasAccess && data.billingSubscriptionId) {
            clearInterval(interval)
            setPolling(false)
            // Refresh page to show updated subscription
            window.location.reload()
          }
        }
      } catch {}
      attempts++
      if (attempts >= maxAttempts) {
        clearInterval(interval)
        setPolling(false)
      }
    }, 1000)
    return () => clearInterval(interval)
  }
}, [params.checkout])
```

- [ ] **Step 2: Show polling indicator**

```tsx
// Add after the checkout complete message:
{polling && (
  <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
    <span className="animate-spin">⟳</span>
    {t.pages.billing.pollingCheckout}
  </div>
)}
```

- [ ] **Step 3: Add translation key**

Add to dictionaries for `pollingCheckout`: "Verifying your subscription..." / "Proveravam vašu pretplatu..."

- [ ] **Step 4: Test polling**

Run: `npm run dev`, complete a checkout, verify polling activates and reloads on success

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/billing/page.tsx
git commit -m "feat(billing): add client-side polling for webhook race condition"
```

---

### Task 3: Prevent infinite redirect loop in dashboard layout

**Files:**
- Modify: `app/dashboard/layout.tsx`
- Test: Manual verification

**Interfaces:**
- Consumes: `createCheckoutUrl`, `hasValidAccess`
- Produces: Guarded checkout creation that doesn't loop on failure

- [ ] **Step 1: Add redirect loop prevention**

```typescript
// In app/dashboard/layout.tsx, before checkout creation:
const redirectCount = Number((await cookies()).get("checkout_redirects")?.value ?? "0")
if (redirectCount > 2) {
  redirect("/dashboard/billing?reason=checkout_loop")
}
// Increment counter
const cookieStore = await cookies()
cookieStore.set("checkout_redirects", String(redirectCount + 1), { maxAge: 60 })
```

- [ ] **Step 2: Clear counter on successful checkout**

Add to billing page when `checkout=complete` and polling succeeds:
```typescript
cookieStore.delete("checkout_redirects")
```

- [ ] **Step 3: Test redirect loop prevention**

Run: `npm run dev`, simulate failed checkout creation, verify redirect stops after 2 attempts

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/layout.tsx app/dashboard/billing/page.tsx
git commit -m "fix(billing): prevent infinite redirect loop on checkout failure"
```

---

### Task 4: Verify parameter alignment (checkout=complete)

**Files:**
- Verify: `app/api/billing/checkout/route.ts` line 48
- Verify: `app/dashboard/billing/page.tsx` line 160
- Verify: `app/verify-email/page.tsx` line 47

**Interfaces:**
- Consumes: Checkout redirect URLs
- Produces: Consistent parameter naming

- [ ] **Step 1: Confirm all use `checkout=complete`**

Check:
- `app/api/billing/checkout/route.ts:48` → `redirectUrl: absoluteUrl("/dashboard/billing?checkout=complete", request)`
- `app/verify-email/page.tsx:47` → `redirectUrl: \`${origin}/dashboard/billing?checkout=complete\``
- `app/dashboard/billing/page.tsx:160` → `params.checkout === "complete"`

- [ ] **Step 2: Commit (no changes if aligned)**

```bash
# If all aligned, no commit needed
```

---

### Phase 2: Registration Flow Refactor

---

### Task 5: Create single-screen registration form component (NO tier selection)

**Files:**
- Create: `app/register/RegisterFormSingle.tsx`
- Modify: `app/register/page.tsx` (to use new form)
- Modify: `app/actions/auth.ts` (remove selectedTier from registerUser)
- Test: Manual verification

**Interfaces:**
- Consumes: `registerUser` action, `useI18n`, `LocaleProvider`
- Produces: Single form with settings (Language, Theme, Currency) and credentials (Name, Email, Password, Org Name), NO tier selection

- [ ] **Step 0: Update registerUser action to remove selectedTier**

```typescript
// app/actions/auth.ts - registerUser function
// Remove selectedTier from formData parsing (line 26)
// Remove validatedTier logic (line 50)
// Default tier to "STARTER" in subscription creation (line 128)
```

- [ ] **Step 1: Create RegisterFormSingle (WITHOUT tier selection)**

```tsx
// app/register/RegisterFormSingle.tsx
"use client"

import { useActionState, startTransition } from "react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { registerUser } from "@/app/actions/auth"
import Link from "next/link"
import { type Locale } from "@/lib/i18n/locales"
import { type ThemePreference } from "@/lib/theme"
import { normalizeCurrency } from "@/lib/currency"
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales"
import { THEME_OPTIONS, THEME_LABELS } from "@/lib/theme"
import { SUPPORTED_CURRENCIES, CURRENCY_LABELS } from "@/lib/currency"

export function RegisterFormSingle() {
  const { t, setLocale } = useI18n()
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registerUser, { error: "", success: "" })
  const [formData, setFormData] = useState({
    locale: "en" as Locale,
    theme: "SYSTEM" as ThemePreference,
    currency: "USD",
    // No selectedTier - tier selection happens on Lemon Squeezy checkout after email verification
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
    isOver18: false,
  })
  const [localError, setLocalError] = useState<string | null>(null)

  const handleChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (localError) setLocalError(null)
    if (state?.error) setLocalError(null) // Clear server error on typing
  }

  const handleLocaleChange = (locale: Locale) => {
    handleChange("locale", locale)
    setLocale(locale)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    // Client-side validation
    if (!formData.email || !formData.password) {
      setLocalError(t.auth.emailPasswordRequired || "Email and password are required.")
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setLocalError(t.auth.passwordsDontMatch || "Passwords do not match.")
      return
    }
    if (formData.password.length < 8) {
      setLocalError(t.auth.passwordTooShort || "Password must be at least 8 characters.")
      return
    }
    if (!formData.termsAccepted) {
      setLocalError(t.auth.mustAcceptTerms || "You must accept the Terms of Service.")
      return
    }
    if (!formData.isOver18) {
      setLocalError(t.auth.mustBeOver18 || "You must confirm you are over 18.")
      return
    }

    const formDataToSubmit = new FormData()
    formDataToSubmit.set("name", formData.name)
    formDataToSubmit.set("email", formData.email)
    formDataToSubmit.set("password", formData.password)
    formDataToSubmit.set("confirmPassword", formData.confirmPassword)
    formDataToSubmit.set("termsAccepted", formData.termsAccepted ? "on" : "")
    formDataToSubmit.set("isOver18", formData.isOver18 ? "on" : "")
    formDataToSubmit.set("locale", formData.locale)
    formDataToSubmit.set("theme", formData.theme)
    formDataToSubmit.set("currency", formData.currency)
    // NO selectedTier - default to STARTER server-side, user picks tier on Lemon Squeezy checkout

    startTransition(() => {
      formAction(formDataToSubmit)
    })
  }

  return (
    <section className="dark relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      {/* Aurora Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#36bfae]/25 to-[#ba87ff]/20 blur-[120px] animate-aurora" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#ba87ff]/20 to-[#36bfae]/25 blur-[100px] animate-aurora [animation-delay:3s]" />
      </div>

      <div className="glass-card w-full max-w-2xl p-8 relative z-10">
        {/* Language Selector at Top */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-white/70 mb-3">
            {t.onboarding?.step1Title || "Language"} / {t.onboarding?.step1Title || "Jezik"}
          </label>
          <div className="flex flex-wrap items-center justify-center gap-3" role="radiogroup">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={formData.locale === l}
                onClick={() => handleLocaleChange(l)}
                className={`relative px-5 py-3 rounded-lg border-2 transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  formData.locale === l
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-white/20 bg-white/5 text-white/70 hover:border-white/30"
                }`}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        {/* Organization Name */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            {t.auth.orgName || "Organization name"}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t.auth.orgNamePlaceholder || "Acme Inc."}
          />
        </div>

        <h1 className="text-2xl font-bold text-white mb-6 text-center">{t.auth.registerTitle}</h1>

        {(state?.error || localError) && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {localError || state?.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Account Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                {t.auth.name || "Name"}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t.auth.namePlaceholder || "John Doe"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                {t.auth.email || "Email"}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t.auth.emailPlaceholder || "you@example.com"}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                {t.auth.password || "Password"}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t.auth.passwordPlaceholder || "••••••••"}
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                {t.auth.confirmPassword || "Confirm Password"}
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t.auth.confirmPasswordPlaceholder || "••••••••"}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Preferences: Theme & Currency */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                {t.onboarding?.step2Title || "Theme"}
              </label>
              <select
                value={formData.theme}
                onChange={(e) => handleChange("theme", e.target.value as ThemePreference)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {THEME_OPTIONS.map((theme) => (
                  <option key={theme} value={theme}>{THEME_LABELS[theme]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                {t.onboarding?.step3Title || "Currency"}
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleChange("currency", normalizeCurrency(e.target.value))}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>{CURRENCY_LABELS[curr]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Legal checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.termsAccepted}
                onChange={(e) => handleChange("termsAccepted", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
              />
              <span className="text-sm text-white/80">
                {t.auth.termsText || 'I accept the '}
                <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#36bfae] hover:underline">
                  {t.auth.termsOfService || "Terms of Service"}
                </Link>
                {t.auth.andText || ' and '}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#36bfae] hover:underline">
                  {t.auth.privacyPolicy || "Privacy Policy"}
                </Link>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isOver18}
                onChange={(e) => handleChange("isOver18", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
              />
              <span className="text-sm text-white/80">
                {t.auth.over18Text || "I confirm I am over 18 years old"}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#36bfae] to-[#ba87ff] text-[#07090E] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending
              ? t.auth.creatingAccount || "Creating account..."
              : t.auth.createAccount || "Create account"}
          </button>
        </form>

        {state?.success && (
          <div className="mt-4 p-3 rounded-xl bg-[#36bfae]/10 border border-[#36bfae]/20 text-[#36bfae] text-sm text-center">
            {state.success}
          </div>
        )}

        <p className="text-sm text-white/50 text-center mt-6">
          {t.auth.alreadyHaveAccount}{" "}
          <Link href="/signin" className="text-[#36bfae] hover:underline">
            {t.auth.signIn}
          </Link>
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Update register page to use new form**

```tsx
// app/register/page.tsx
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { RegisterFormSingle } from "./RegisterFormSingle"

export const metadata = { title: "Create your account · LodgeTrack" }

export default function RegisterPage() {
  return (
    <LocaleProvider locale="en">
      <RegisterFormSingle />
    </LocaleProvider>
  )
}
```

- [ ] **Step 3: Test single-screen registration**

Run: `npm run dev`, visit `/register`, verify all fields work, language selector changes locale, form submits

- [ ] **Step 4: Commit**

```bash
git add app/register/RegisterFormSingle.tsx app/register/page.tsx
git commit -m "feat(register): replace wizard with single-screen registration form"
```

---

### Task 6: Auto-login after email verification with checkout redirect (STARTER tier)

**Files:**
- Modify: `app/verify-email/page.tsx`
- Modify: `app/signin/page.tsx` (add verified callback handling)
- Test: Manual verification

**Interfaces:**
- Consumes: `auth()`, `createCheckoutUrl`, next-auth signIn
- Produces: Auto-login after verification, redirect to Lemon Squeezy checkout for STARTER tier (user can upgrade on checkout page)

- [ ] **Step 1: Update verify-email to auto-login and redirect to checkout**

```tsx
// app/verify-email/page.tsx
// After successful token verification (around line 64), add:
import { signIn } from "next-auth/react"
import { createCheckoutUrl } from "@/lib/billing"
import { requestOrigin } from "@/lib/origin"

// In the verification success block:
if (!verificationResult) {
  verificationResult = {
    success: true,
    message: locale === "sr"
      ? "Vaš email je uspešno verifikovan! Preusmeravam..."
      : "Your email has been verified successfully! Redirecting...",
  }

  // Get user to find their organization and create checkout for STARTER tier
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: { include: { subscription: true } } },
  })

  if (user?.organization) {
    const origin = await requestOrigin()
    // Default to STARTER tier - user can upgrade on Lemon Squeezy checkout
    const checkoutUrl = await createCheckoutUrl({
      tier: "STARTER",
      email: user.email,
      orgId: user.orgId,
      redirectUrl: `${origin}/dashboard/billing?checkout=complete`,
    })

    if (checkoutUrl) {
      // Redirect to signin with verified flag and checkout URL as callback
      // The signin page will handle auto-sign-in and redirect to checkout
      redirect(`/signin?verified=true&checkoutUrl=${encodeURIComponent(checkoutUrl)}`)
    }
  }
}
```

- [ ] **Step 2: Update signin page to handle verified callback and redirect to checkout**

```tsx
// app/signin/page.tsx
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { SignInForm } from "./SignInForm"
import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { currentLocale } from "@/lib/i18n/server"

export const metadata = { title: "Sign in · LodgeTrack" }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; checkoutUrl?: string }>
}) {
  const params = await searchParams
  const locale = await currentLocale()
  const t = getDictionary(locale)

  // Handle auto-sign-in after email verification
  if (params.verified === "true" && params.checkoutUrl) {
    // This will be handled client-side by SignInForm
    return (
      <LocaleProvider locale="en">
        <SignInForm verified={true} checkoutUrl={params.checkoutUrl} />
      </LocaleProvider>
    )
  }

  return (
    <LocaleProvider locale="en">
      <SignInForm />
    </LocaleProvider>
  )
}
```

- [ ] **Step 3: Update SignInForm to handle verified prop and redirect**

```tsx
// app/signin/SignInForm.tsx - add logic to auto-sign-in when verified=true
// Use signIn from next-auth/react with callbackUrl to checkout
// After successful sign in, redirect to checkoutUrl
```

- [ ] **Step 4: Test auto-login flow**

Run: `npm run dev`, register, check email, click verify link, verify auto-login and redirect to Lemon Squeezy checkout for STARTER

- [ ] **Step 5: Commit**

```bash
git add app/verify-email/page.tsx app/signin/page.tsx app/signin/SignInForm.tsx
git commit -m "feat(auth): auto-login after email verification with checkout redirect"
```

---

### Task 7: Clean up deprecated wizard components

**Files:**
- Delete: `app/register/steps/PlanStep.tsx`
- Delete: `app/register/steps/ThemeStep.tsx` (if not used elsewhere)
- Delete: `app/register/steps/CurrencyStep.tsx` (if not used elsewhere)
- Delete: `app/register/steps/AccountStep.tsx`
- Delete: `app/register/steps/LanguageStep.tsx` (if not used elsewhere)
- Modify: `lib/onboarding/types.ts` (remove OnboardingStep, remove selectedTier)
- Test: Build verification

**Interfaces:**
- Consumes: None (cleanup)
- Produces: Cleaner codebase without wizard components

- [ ] **Step 1: Delete wizard step components**

```bash
rm app/register/steps/PlanStep.tsx
rm app/register/steps/ThemeStep.tsx
rm app/register/steps/CurrencyStep.tsx
rm app/register/steps/AccountStep.tsx
rm app/register/steps/LanguageStep.tsx
```

- [ ] **Step 2: Simplify onboarding types (remove selectedTier)**

```typescript
// lib/onboarding/types.ts
import type { Locale } from "@/lib/i18n/locales"
import type { ThemePreference } from "@/lib/theme"

export interface OnboardingData {
  locale: Locale
  theme: ThemePreference
  currency: string
  name: string
  email: string
  password: string
  confirmPassword: string
  termsAccepted: boolean
  isOver18: boolean
}

export const initialOnboardingData: OnboardingData = {
  locale: "en",
  theme: "SYSTEM",
  currency: "USD",
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
  isOver18: false,
}
```

- [ ] **Step 3: Remove unused RegisterForm (old wizard)**

```bash
rm app/register/RegisterForm.tsx
```

- [ ] **Step 4: Run type check and build**

```bash
npm run type-check
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore(register): remove deprecated wizard components"
```

---

### Task 8: Full integration test

**Files:**
- Test: Manual verification of all flows

- [ ] **Step 1: Test billing page polling**

1. Start checkout from billing page
2. Complete payment on Lemon Squeezy (test mode)
3. Return to billing page with `checkout=complete`
4. Verify polling activates and reloads when webhook processes

- [ ] **Step 2: Test redirect loop prevention**

1. Simulate failed checkout creation (remove env vars temporarily)
2. Access dashboard with paid tier but no billing identifiers
3. Verify redirects to billing with error after 2 attempts, not infinite loop

- [ ] **Step 3: Test single-screen registration**

1. Visit `/register` - loads in English
2. Language selector at top works (English/Serbian)
3. All fields on one page: tier, name, email, password, theme, currency, checkboxes
4. Form submits, sends verification email
5. Selected locale saved to user record

- [ ] **Step 4: Test auto-login after verification**

1. Complete registration
2. Click verification link in email
3. Verify auto-login and redirect to checkout for selected tier
4. Complete checkout, return to billing page
5. Verify subscription active

- [ ] **Step 5: Test dashboard access**

1. After successful checkout, access dashboard
2. Verify no redirect loop
3. Verify subscription shows correctly

- [ ] **Step 6: Run tests and lint**

```bash
npm run type-check
npm run lint
npm test
```

- [ ] **Step 7: Commit final changes**

```bash
git commit -m "feat: complete post-checkout handshake and registration refactor"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `app/api/billing/status/route.ts` | New: GET endpoint for subscription status polling |
| `app/dashboard/billing/page.tsx` | Add client-side polling when `checkout=complete`, polling indicator |
| `app/dashboard/layout.tsx` | Add redirect loop prevention (cookie counter) |
| `app/verify-email/page.tsx` | Auto-login after verification, redirect to checkout |
| `app/signin/page.tsx` | Handle verified callback, auto-sign-in |
| `app/actions/auth.ts` | Remove selectedTier from registerUser, default to STARTER |
| `app/register/RegisterFormSingle.tsx` | New: Single-screen registration form (NO tier selection) |
| `app/register/page.tsx` | Use new single-screen form |
| `app/register/steps/*.tsx` | Deleted: PlanStep, ThemeStep, CurrencyStep, AccountStep, LanguageStep |
| `app/register/RegisterForm.tsx` | Deleted: Old wizard form |
| `lib/onboarding/types.ts` | Simplified: removed OnboardingStep type, removed selectedTier |

---

## Translation Keys to Add

**English:**
- `pollingCheckout`: "Verifying your subscription..."
- `orgName`: "Organization name"
- `orgNamePlaceholder`: "Acme Inc."
- `emailPasswordRequired`: "Email and password are required."
- `passwordsDontMatch`: "Passwords do not match."
- `passwordTooShort`: "Password must be at least 8 characters."
- `mustAcceptTerms`: "You must accept the Terms of Service."
- `mustBeOver18`: "You must confirm you are over 18."
- `creatingAccount`: "Creating account..."
- `createAccount`: "Create account"

**Serbian:**
- `pollingCheckout`: "Proveravam vašu pretplatu..."
- `orgName`: "Naziv organizacije"
- `orgNamePlaceholder`: "Acme Inc."
- `emailPasswordRequired`: "Email i lozinka su obavezni."
- `passwordsDontMatch`: "Lozinke se ne poklapaju."
- `passwordTooShort`: "Lozinka mora imati najmanje 8 karaktera."
- `mustAcceptTerms`: "Morate prihvatiti Uslove korišćenja."
- `mustBeOver18`: "Morate potvrditi da ste punoletni."
- `creatingAccount`: "Kreiram nalog..."
- `createAccount`: "Kreiraj nalog"