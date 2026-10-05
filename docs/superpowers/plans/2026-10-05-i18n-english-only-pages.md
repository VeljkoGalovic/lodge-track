# i18n English-Only Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce strict English-only language on landing page, sign-in page, and registration page (initial load), while keeping the registration flow's language selection functional for subsequent steps.

**Architecture:** The current implementation uses a cookie-based locale system with `LocaleProvider` context. Landing page is already English-only but uses Footer which reads locale. Sign-in and registration pages read locale from cookie via `currentLocale()`. The fix removes locale resolution from sign-in/registration page servers, hardcodes English for those pages, and ensures registration form defaults to English while preserving the language selection step.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, next-auth, Prisma

**Spec:** Based on user requirements in pasted_content

## Global Constraints

- Dashboard must remain unchanged - uses `currentLocale(user.locale)` with user preference from database
- Landing page: strictly English only - no dynamic locale routing
- Sign-in page: strictly English only - no locale from cookie
- Registration page: defaults to English on initial load; Step 1 (LanguageStep) allows selection and applies chosen language for remainder of flow
- No middleware changes required (no locale-based routing exists)
- `Footer` component used on landing page must render in English

## Review Focus

1. **Footer on landing page** - Must render in English despite using `currentLocale()` internally
2. **Sign-in form** - Must show English strings even if user has Serbian cookie
3. **Registration initial load** - Must show English Step 1 even if user has Serbian cookie
4. **Registration language selection** - Step 1 selection must update LocaleProvider context for Steps 2-5
5. **Dashboard unaffected** - Must still use user's stored locale preference

---

### Task 1: Make Footer English-only for landing page usage

**Files:**
- Modify: `components/Footer.tsx`
- Test: None (visual verification)

**Interfaces:**
- Consumes: None
- Produces: English-only Footer component

- [ ] **Step 1: Modify Footer to accept optional locale prop defaulting to "en"**

```tsx
// components/Footer.tsx
// Change getFooterData to accept optional locale parameter
async function getFooterData(locale: "en" | "sr" = "en") {
  const t = getDictionary(locale).footer;
  // ... rest unchanged
}

// Change Footer component to accept locale prop
export async function Footer({ locale = "en" }: { locale?: "en" | "sr" } = {}) {
  const { t, columns, socials } = await getFooterData(locale);
  // ... rest unchanged
}
```

- [ ] **Step 2: Verify landing page still works (Footer used without locale prop defaults to English)**

Run: `npm run dev` and visit `/`
Expected: Footer renders in English

- [ ] **Step 3: Commit**

```bash
git add components/Footer.tsx
git commit -m "fix(i18n): make Footer default to English for landing page"
```

---

### Task 2: Make sign-in page strictly English-only

**Files:**
- Modify: `app/signin/page.tsx`
- Test: None (visual verification)

**Interfaces:**
- Consumes: `SignInForm` component (already uses `useI18n`)
- Produces: English-only sign-in page

- [ ] **Step 1: Remove LocaleProvider import and currentLocale call**

```tsx
// app/signin/page.tsx
// Remove:
// import { LocaleProvider } from "@/components/i18n/LocaleProvider"
// import { currentLocale } from "@/lib/i18n/server"

// Change component to:
export default async function SignInPage() {
  return <SignInForm />
}
```

- [ ] **Step 2: Verify SignInForm works without LocaleProvider wrapper**

Note: `SignInForm` uses `useI18n()` which requires `LocaleProvider`. We need to either:
a) Add a minimal LocaleProvider with hardcoded "en" locale, OR
b) Modify SignInForm to not require LocaleProvider

Option (a) is cleaner - wrap SignInForm with LocaleProvider locale="en"

- [ ] **Step 3: Add LocaleProvider with hardcoded English locale**

```tsx
// app/signin/page.tsx
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { SignInForm } from "./SignInForm"

export const metadata = { title: "Sign in · LodgeTrack" }

export default function SignInPage() {
  return (
    <LocaleProvider locale="en">
      <SignInForm />
    </LocaleProvider>
  )
}
```

- [ ] **Step 4: Verify sign-in page renders in English**

Run: `npm run dev` and visit `/signin`
Expected: All text in English, even with Serbian cookie

- [ ] **Step 5: Commit**

```bash
git add app/signin/page.tsx
git commit -m "fix(i18n): make sign-in page strictly English-only"
```

---

### Task 3: Make registration page default to English on initial load

**Files:**
- Modify: `app/register/page.tsx`
- Test: None (visual verification)

**Interfaces:**
- Consumes: `RegisterForm` component, `LocaleProvider`
- Produces: Registration page defaulting to English

- [ ] **Step 1: Remove currentLocale call, hardcode English locale**

```tsx
// app/register/page.tsx
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { RegisterForm } from "./RegisterForm"

export const metadata = { title: "Create your account · LodgeTrack" }

/** Server shell - locale defaults to English; user selects language in Step 1 */
export default function RegisterPage() {
  return (
    <LocaleProvider locale="en">
      <RegisterForm />
    </LocaleProvider>
  )
}
```

- [ ] **Step 2: Verify registration page loads in English**

Run: `npm run dev` and visit `/register`
Expected: Step 1 (Language) shows in English, even with Serbian cookie

- [ ] **Step 3: Verify language selection in Step 1 still works**

1. Load `/register` - should show English
2. Select "Srpski" in Step 1
3. Click "Next" to Step 2
4. Verify Step 2 (Theme) renders in Serbian

- [ ] **Step 4: Commit**

```bash
git add app/register/page.tsx
git commit -m "fix(i18n): make registration page default to English on initial load"
```

---

### Task 4: Verify language selection persists through registration flow

**Files:**
- Verify: `app/register/RegisterForm.tsx` (no changes needed)
- Verify: `app/register/steps/LanguageStep.tsx` (no changes needed)

**Interfaces:**
- Consumes: `LocaleProvider` context, `setLocale` function
- Produces: Working language selection in registration flow

- [ ] **Step 1: Verify RegisterForm's handleLocaleChange updates LocaleProvider context**

In `RegisterForm.tsx`, `handleLocaleChange` calls `setLocale(locale)` which updates the `LocaleProvider` context - this is already implemented correctly.

- [ ] **Step 2: Test complete registration flow with language change**

1. Visit `/register` - loads in English
2. Step 1: Select "Srpski" (Serbian)
3. Step 2: Verify Theme step shows Serbian labels
4. Step 3: Verify Currency step shows Serbian labels
5. Step 4: Verify Plan step shows Serbian labels
6. Step 5: Verify Account step shows Serbian labels
7. Submit form - verify locale is saved to user record

- [ ] **Step 3: Verify form submission includes selected locale**

In `RegisterForm.tsx` handleSubmit, `formDataToSubmit.set("locale", formData.locale)` - already implemented.

- [ ] **Step 4: Commit (no changes if verification passes)**

```bash
# If all verified, no commit needed
```

---

### Task 5: Verify dashboard remains unaffected

**Files:**
- Verify: `app/dashboard/layout.tsx` (no changes needed)

**Interfaces:**
- Consumes: `currentLocale(user.locale)` with user preference
- Produces: Dashboard in user's preferred language

- [ ] **Step 1: Verify dashboard still uses user's locale preference**

Run: `npm run dev`, sign in as user with Serbian preference
Visit `/dashboard`
Expected: Dashboard renders in Serbian

- [ ] **Step 2: Verify cookie fallback works for new devices**

1. Clear cookies
2. Sign in as user with Serbian preference in database
3. Visit `/dashboard`
4. Expected: Dashboard renders in Serbian (falls back to user.locale)

- [ ] **Step 3: Commit (no changes if verification passes)**

```bash
# If all verified, no commit needed
```

---

### Task 6: Clean up unused imports and verify no regressions

**Files:**
- Check: `app/signin/page.tsx` - verify no unused imports
- Check: `app/register/page.tsx` - verify no unused imports
- Check: `components/Footer.tsx` - verify no unused imports

**Interfaces:**
- None

- [ ] **Step 1: Remove unused imports from sign-in page**

```bash
# Verify currentLocale import removed
# Verify any other unused imports removed
```

- [ ] **Step 2: Remove unused imports from registration page**

```bash
# Verify currentLocale import removed
```

- [ ] **Step 3: Run type check**

Run: `npm run type-check` or `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore(i18n): clean up unused imports after English-only enforcement"
```

---

### Task 7: Full integration test

**Files:**
- Test: Manual verification of all pages

- [ ] **Step 1: Test landing page (`/`)**
  - Hero, Features, Pricing, About in English
  - Footer in English
  - Navbar links work

- [ ] **Step 2: Test sign-in page (`/signin`)**
  - All text in English
  - Sign in with credentials works
  - 2FA flow in English
  - "No account? Sign up" link works

- [ ] **Step 3: Test registration page (`/register`)**
  - Loads in English by default
  - Step 1: Language selection works (English → Serbian)
  - Steps 2-5: Render in selected language
  - Form submission works with selected locale

- [ ] **Step 4: Test dashboard (`/dashboard`)**
  - Renders in user's preferred language (from database)
  - Cookie fallback works

- [ ] **Step 5: Test edge cases**
  - Visit `/register` with Serbian cookie - loads in English
  - Visit `/signin` with Serbian cookie - loads in English
  - Language selection persists through registration steps
  - After registration, dashboard uses selected locale

- [ ] **Step 6: Commit final changes**

```bash
git commit -m "feat(i18n): enforce English-only on landing, sign-in, and registration initial load"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `components/Footer.tsx` | Add optional `locale` prop defaulting to `"en"` |
| `app/signin/page.tsx` | Remove `currentLocale()`, wrap `SignInForm` in `LocaleProvider locale="en"` |
| `app/register/page.tsx` | Remove `currentLocale()`, wrap `RegisterForm` in `LocaleProvider locale="en"` |
| `app/register/RegisterForm.tsx` | No changes (already handles language selection) |
| `app/register/steps/LanguageStep.tsx` | No changes (already handles locale change) |
| `app/dashboard/layout.tsx` | No changes (must remain unchanged) |

All changes are minimal and focused. The registration flow's language selection (Step 1) continues to work because `RegisterForm` calls `setLocale()` on the `LocaleProvider` context when user selects a language, which then affects Steps 2-5.