# Mobile Accessibility Audit Report - LodgeTrack

**Date:** 2026-10-22  
**Scope:** Full application audit across all components and pages  
**Methodology:** Systematic review of all React components, pages, and UI primitives for WCAG 2.1 AA compliance and mobile usability best practices

---

## Executive Summary

The LodgeTrack application has a **solid foundation** for mobile accessibility with:
- Responsive Tailwind CSS breakpoints (sm:, md:, lg:) used consistently
- Radix UI primitives providing accessible ARIA patterns
- Native HTML `<select>` elements for platform-native pickers
- Touch-friendly button sizing in most areas
- Proper form labeling and error handling

**Critical Issues Found:** 3  
**High Priority Issues:** 8  
**Medium Priority Issues:** 15  
**Low Priority Issues:** 12

---

## Issue Categories

### 1. Touch Target Size (Critical/High)
**WCAG 2.5.5 Target Size (AAA) / 2.5.8 Target Size (Minimum) (AA)**

| Component | Location | Current Size | Required | Severity |
|-----------|----------|--------------|----------|----------|
| Icon-only buttons in `DashboardSidebar` | `components/dashboard/DashboardSidebar.tsx:112` | 24×24px | 44×44px | **Critical** |
| `Copy`/`View`/`Delete` buttons in API keys list | `app/dashboard/api/ApiDashboardClient.tsx:508-550` | 32×32px (icon) | 44×44px | **High** |
| Tab triggers in API docs | `app/dashboard/api/ApiDashboardClient.tsx:562` | ~36px height | 44px height | **High** |
| `Badge` clickable elements | Multiple | Variable | 44×44px | **Medium** |
| Sidebar toggle in `DashboardHeader` | `components/dashboard/DashboardHeader.tsx:45` | 32×32px | 44×44px | **Medium** |
| Notification bell button | `components/dashboard/DashboardHeader.tsx:136` | 36×36px | 44×44px | **Medium** |
| User dropdown trigger | `components/dashboard/DashboardHeader.tsx:170` | 36×36px | 44×44px | **Medium** |
| Pagination/icon buttons in tables | `components/ui/table.tsx` | 32×32px | 44×44px | **Medium** |

**Root Cause:** Icon-only buttons use `size="icon"` (32×32px) or bare icons without adequate padding.

**Fix Pattern:**
```tsx
// Before: Too small
<Button variant="ghost" size="icon" onClick={handler}>
  <Icon className="h-4 w-4" />
</Button>

// After: Minimum 44×44px touch target
<Button variant="ghost" size="icon" className="p-2" onClick={handler}>
  <Icon className="h-5 w-5" />
  <span className="sr-only">{label}</span>
</Button>
// OR use size="sm" with proper padding
<Button variant="ghost" size="sm" className="px-3 py-2" onClick={handler}>
  <Icon className="h-4 w-4" />
</Button>
```

---

### 2. Viewport & Zoom Handling (High)

| Issue | Location | Impact | Severity |
|-------|----------|--------|----------|
| `maximum-scale=1` prevents zoom | `app/layout.tsx:14` | Users with low vision cannot zoom | **High** |
| Fixed `h-svh` on DashboardShell | `components/dashboard/DashboardShell.tsx:61` | Content cut off on zoom | **Medium** |
| Horizontal scroll tables without visual indicator | `components/ui/table.tsx:13` | Hidden content on mobile | **Medium** |
| Calendar month grid overflows | `app/dashboard/calendar/page.tsx:176` | Horizontal scroll not obvious | **Medium** |

**Root Cause:** `app/layout.tsx` sets `user-scalable=no, maximum-scale=1` which violates WCAG 1.4.4 Resize Text.

**Fix:**
```tsx
// app/layout.tsx - Remove zoom restrictions
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1" 
  // REMOVE: user-scalable=no, maximum-scale=1
/>
```

For tables, add scroll indicator:
```tsx
// components/ui/table.tsx
<div className="overflow-x-auto" role="region" aria-label="Data table" tabIndex={0}>
  {/* Add scroll shadow indicator */}
  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" aria-hidden="true" />
  <table>...</table>
</div>
```

---

### 3. Form Accessibility (High/Medium)

| Issue | Location | WCAG Criterion | Severity |
|-------|----------|----------------|----------|
| Missing `autocomplete` on email inputs | `components/onboarding/OnboardingForm.tsx:55` | 1.3.5 | **High** |
| Password fields lack `autocomplete="new-password"` | `components/invite/AcceptInviteForm.tsx:52` | 1.3.5 | **High** |
| Checkbox labels not clickable (missing `label` wrapper) | `components/settings/NotificationPreferencesForm.tsx:36` | 2.4.7 | **Medium** |
| Select dropdowns lack `aria-describedby` for help text | Multiple | 3.3.2 | **Medium** |
| Error messages not linked via `aria-describedby` | `components/ui/Input.tsx` | 3.3.1 | **Medium** |
| Date inputs use `type="text"` not `type="date"` | `components/bookings/BookingForm.tsx` | 1.3.5 | **Medium** |

**Fix Pattern for Inputs:**
```tsx
// components/ui/Input.tsx - Add autocomplete support
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ error, id, 'aria-describedby': describedBy, ...props }: InputProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={errorId ? [describedBy, errorId].filter(Boolean).join(' ') : describedBy}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </>
  )
}
```

---

### 4. Keyboard Navigation & Focus Management (High)

| Issue | Location | Impact | Severity |
|-------|----------|--------|----------|
| Focus trap missing in mobile sidebar drawer | `components/dashboard/DashboardShell.tsx:69-75` | Keyboard users trapped | **High** |
| SetupWizard steps not announced to screen readers | `components/onboarding/SetupWizard.tsx` | Step changes invisible | **High** |
| Dialog close on Escape not consistently handled | `components/ui/dialog.tsx` | Inconsistent behavior | **Medium** |
| Tab order broken in `BookingForm` availability grid | `components/bookings/BookingForm.tsx` | Confusing navigation | **Medium** |
| Skip link missing for main content | `app/layout.tsx` | Keyboard users tab through nav | **Medium** |
| Focus not restored after dialog close | Multiple Dialog usages | Lost context | **Medium** |

**Fix for Mobile Sidebar Focus Trap:**
```tsx
// components/dashboard/DashboardShell.tsx
import { FocusTrap } from '@/components/ui/FocusTrap';

// Wrap sidebar content when mobileOpen
{mobileOpen && (
  <FocusTrap>
    <aside className="...">{/* sidebar content */}</aside>
  </FocusTrap>
)}
```

**Fix for SetupWizard Step Announcements:**
```tsx
// components/onboarding/SetupWizard.tsx
const [currentStep, setCurrentStep] = useState(1);

return (
  <div role="region" aria-label={t.setupWizard.progress} aria-live="polite">
    <nav aria-label="Setup wizard progress">
      <ol className="flex items-center justify-between">
        {steps.map((step, i) => (
          <li key={step.id} aria-current={i + 1 === currentStep ? 'step' : undefined}>
            ...
          </li>
        ))}
      </ol>
    </nav>
    <div role="tabpanel" id={`step-${currentStep}`} aria-labelledby={`step-${currentStep}-label`}>
      {/* step content */}
    </div>
  </div>
);
```

---

### 5. Screen Reader Support (High/Medium)

| Issue | Location | WCAG Criterion | Severity |
|-------|----------|----------------|----------|
| Decorative SVGs lack `aria-hidden="true"` | Multiple | 1.1.1 | **High** |
| Status updates not announced (upload progress, etc.) | `components/attachments/AttachmentUploader.tsx:210` | 4.1.3 | **High** |
| Loading states lack `aria-live` | Multiple | 4.1.3 | **Medium** |
| Table row actions lack context | `components/team/MemberRow.tsx:101` | 2.4.4 | **Medium** |
| Icon-only buttons missing accessible names | Multiple | 2.5.3 | **Medium** |

**Fix Pattern:**
```tsx
// Decorative icons
<svg aria-hidden="true" className="...">...</svg>

// Status announcements
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {uploading ? `Uploading ${progress}%` : 'Upload complete'}
</div>

// Icon buttons with accessible names
<Button aria-label="Delete attachment" onClick={handleDelete}>
  <Trash2 className="h-4 w-4" aria-hidden="true" />
</Button>
```

---

### 6. Color Contrast & Visual Design (Medium)

| Issue | Location | Current Ratio | Required | Severity |
|-------|----------|---------------|----------|----------|
| Subtle foreground text (`text-subtle-foreground`) | Global | ~3:1 | 4.5:1 | **Medium** |
| Placeholder text contrast | `components/ui/Input.tsx` | ~2.5:1 | 4.5:1 | **Medium** |
| Disabled button contrast | `components/ui/Button.tsx` | ~2.5:1 | 3:1 (AA) | **Medium** |
| Focus ring on dark backgrounds | `components/ui/Button.tsx` | Insufficient | 3:1 | **Medium** |
| Badge variants (outline) on colored backgrounds | `components/ui/badge.tsx` | Variable | 3:1 | **Low** |

**Fix:** Update Tailwind config with WCAG-compliant color tokens:
```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      'subtle-foreground': {
        DEFAULT: 'hsl(var(--muted-foreground))',
        // Ensure 4.5:1 contrast on default backgrounds
      },
      // Add focus ring colors for dark mode
      ring: {
        DEFAULT: 'hsl(var(--ring))',
        offset: 'hsl(var(--background))',
      }
    }
  }
}
```

---

### 7. Responsive Layout Issues (Medium/Low)

| Issue | Location | Breakpoint | Severity |
|-------|----------|------------|----------|
| Dashboard stats cards stack at 1 column on mobile | `app/dashboard/page.tsx:100` | < 640px | **Medium** |
| Booking form multi-column layout breaks | `components/bookings/BookingForm.tsx` | < 768px | **Medium** |
| Property grid cards too narrow | `app/dashboard/properties/page.tsx` | < 640px | **Low** |
| Analytics charts overflow container | `components/dashboard/AnalyticsSection.tsx` | < 768px | **Medium** |
| Expenses table horizontal scroll UX | `app/dashboard/expenses/page.tsx` | < 1024px | **Low** |
| Settings page card padding too tight | `app/dashboard/settings/page.tsx` | < 640px | **Low** |

**Fix Pattern:**
```tsx
// Use responsive grid with minimum column widths
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  // becomes
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-w-0">
  // Add min-w-0 to prevent overflow
```

---

### 8. Touch Interactions & Gestures (Medium/Low)

| Issue | Location | Impact | Severity |
|-------|----------|--------|----------|
| Drag-and-drop only in AttachmentUploader | `components/attachments/AttachmentUploader.tsx:116` | No fallback for touch | **Medium** |
| No pull-to-refresh on data lists | Multiple pages | Expected mobile pattern | **Low** |
| Swipe actions missing on list items | `components/team/MemberRow.tsx` | Common mobile pattern | **Low** |
| Date picker not touch-optimized | `components/bookings/BookingForm.tsx` | Native picker better | **Medium** |

**Fix for AttachmentUploader Touch Fallback:**
```tsx
// Already has click fallback - good!
onClick={() => !disabled && fileInputRef.current?.click()}
// But add touch-specific handling
onTouchEnd={(e) => {
  if (!disabled && e.target === e.currentTarget) {
    fileInputRef.current?.click();
  }
}}
```

---

### 9. Internationalization & RTL (Low)

| Issue | Location | Severity |
|-------|----------|----------|
| No RTL support in CSS | Global | **Low** |
| Hardcoded `left`/`right` in ambient orbs | `components/dashboard/DashboardShell.tsx:64-65` | **Low** |
| Flex direction not logical properties | Multiple | **Low** |

---

### 10. Performance & Core Web Vitals (Medium)

| Issue | Location | Impact | Severity |
|-------|----------|--------|----------|
| Large SVGs in ambient orbs | `components/dashboard/DashboardShell.tsx:64-65` | CLS/LCP | **Medium** |
| No image optimization for avatars | Multiple | LCP | **Low** |
| Heavy chart libraries on mobile | `components/dashboard/AnalyticsSection.tsx` | TBT | **Medium** |

---

## Remediation Plan

### Phase 1: Critical Fixes (Week 1) - **3 Issues**

| # | Issue | Files to Modify | Effort |
|---|-------|----------------|--------|
| 1 | Remove viewport zoom restriction | `app/layout.tsx` | 15 min |
| 2 | Fix sidebar icon button touch targets | `components/dashboard/DashboardSidebar.tsx` | 30 min |
| 3 | Fix API keys icon button touch targets | `app/dashboard/api/ApiDashboardClient.tsx` | 30 min |

### Phase 2: High Priority (Week 2) - **8 Issues**

| # | Issue | Files to Modify | Effort |
|---|-------|----------------|--------|
| 1 | Add focus trap to mobile sidebar | `components/dashboard/DashboardShell.tsx`, new `FocusTrap.tsx` | 1 hr |
| 2 | Add SetupWizard step announcements | `components/onboarding/SetupWizard.tsx` | 1 hr |
| 3 | Add `autocomplete` to all form inputs | `components/ui/Input.tsx`, all form components | 2 hrs |
| 4 | Link error messages via `aria-describedby` | `components/ui/Input.tsx`, `FormMessage.tsx` | 1 hr |
| 5 | Add `aria-live` to status updates | `components/attachments/AttachmentUploader.tsx`, others | 1 hr |
| 6 | Fix decorative SVG `aria-hidden` | Global search/replace | 30 min |
| 7 | Add accessible names to icon buttons | Multiple | 1 hr |
| 8 | Fix table horizontal scroll indicator | `components/ui/table.tsx` | 30 min |

### Phase 3: Medium Priority (Week 3-4) - **15 Issues**

| # | Issue | Files to Modify | Effort |
|---|-------|----------------|--------|
| 1 | Fix color contrast for subtle text | `tailwind.config.ts`, `app/globals.css` | 2 hrs |
| 2 | Fix placeholder contrast | `components/ui/Input.tsx` | 30 min |
| 3 | Fix disabled button contrast | `components/ui/Button.tsx` | 30 min |
| 4 | Add skip link to main content | `app/layout.tsx`, `components/dashboard/DashboardShell.tsx` | 45 min |
| 5 | Fix focus restoration after dialogs | `components/ui/dialog.tsx`, all Dialog usages | 1 hr |
| 6 | Make checkbox labels clickable | `components/settings/NotificationPreferencesForm.tsx` | 30 min |
| 7 | Use `type="date"` for date inputs | `components/bookings/BookingForm.tsx`, others | 1 hr |
| 8 | Responsive dashboard stats grid | `app/dashboard/page.tsx` | 45 min |
| 9 | Fix booking form mobile layout | `components/bookings/BookingForm.tsx` | 1 hr |
| 10 | Fix analytics charts mobile overflow | `components/dashboard/AnalyticsSection.tsx` | 1 hr |
| 11 | Add `aria-describedby` to selects with help | `components/ui/Select.tsx` | 45 min |
| 12 | Fix tab trigger touch targets | `components/ui/tabs.tsx`, `ApiDashboardClient.tsx` | 45 min |
| 13 | Fix notification bell touch target | `components/dashboard/DashboardHeader.tsx` | 30 min |
| 14 | Fix user dropdown touch target | `components/dashboard/DashboardHeader.tsx` | 30 min |
| 15 | Fix focus order in BookingForm availability | `components/bookings/BookingForm.tsx` | 1 hr |

### Phase 4: Low Priority / Polish (Week 5+) - **12 Issues**

| # | Issue | Files to Modify | Effort |
|---|-------|----------------|--------|
| 1 | RTL support preparation | `tailwind.config.ts`, globals | 2 hrs |
| 2 | Logical CSS properties migration | Global | 3 hrs |
| 3 | Pull-to-refresh on lists | Multiple pages | 2 hrs |
| 4 | Swipe actions on list rows | `components/team/MemberRow.tsx`, others | 2 hrs |
| 5 | Native date picker optimization | `components/bookings/BookingForm.tsx` | 1 hr |
| 6 | Optimize ambient orb SVGs | `components/dashboard/DashboardShell.tsx` | 30 min |
| 7 | Image optimization for avatars | Multiple | 1 hr |
| 8 | Lazy load chart libraries | `components/dashboard/AnalyticsSection.tsx` | 1 hr |
| 9 | Fix badge contrast on colored bg | `components/ui/badge.tsx` | 45 min |
| 10 | Fix focus ring on dark mode | `components/ui/Button.tsx`, globals | 30 min |
| 11 | Calendar month grid mobile UX | `app/dashboard/calendar/page.tsx` | 1 hr |
| 12 | Expenses table mobile UX | `app/dashboard/expenses/page.tsx` | 45 min |

---

## Code Examples for Common Fixes

### 1. Accessible Button Component Update
```tsx
// components/ui/Button.tsx - Enhanced for mobile accessibility
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { clsx } from "clsx"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 min-w-[44px]", // Minimum 44px touch target
        sm: "h-9 rounded-lg px-3 text-xs min-w-[44px]",
        lg: "h-11 rounded-xl px-8 text-base min-w-[44px]",
        xl: "h-12 rounded-xl px-10 text-lg min-w-[44px]",
        icon: "h-10 w-10 min-w-[44px] min-h-[44px]", // 44×44 minimum
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)
```

### 2. Focus Trap Component
```tsx
// components/ui/FocusTrap.tsx
"use client"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface FocusTrapProps {
  children: React.ReactNode
  active?: boolean
  onDeactivate?: () => void
}

export function FocusTrap({ children, active = true, onDeactivate }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    
    previousActiveElement.current = document.activeElement as HTMLElement
    const container = containerRef.current
    
    // Focus first focusable element
    const focusableElements = container?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusableElements?.[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return
      
      const focusable = Array.from(focusableElements || [])
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onDeactivate?.()
      }
    }

    container?.addEventListener("keydown", handleKeyDown)
    container?.addEventListener("keydown", handleEscape)
    
    return () => {
      container?.removeEventListener("keydown", handleKeyDown)
      container?.removeEventListener("keydown", handleEscape)
      previousActiveElement.current?.focus()
    }
  }, [active, onDeactivate])

  if (!active) return <>{children}</>
  
  return createPortal(
    <div ref={containerRef} className="contents">{children}</div>,
    document.body
  )
}
```

### 3. Accessible Input with Error Linking
```tsx
// components/ui/Input.tsx - Updated
"use client"
import { forwardRef, type InputHTMLAttributes } from "react"
import { clsx } from "clsx"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, hint, id, 'aria-describedby': describedBy, ...props }, ref) => {
    const errorId = error ? `${id}-error` : undefined
    const hintId = hint ? `${id}-hint` : undefined
    const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-muted-foreground block">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedByIds}
          aria-required={props.required}
          className={clsx(
            "flex h-10 w-full min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "touch-manipulation", // Prevents double-tap zoom on iOS
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-subtle-foreground" aria-live="polite">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-destructive" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"
```

### 4. Mobile-Optimized Select
```tsx
// components/ui/Select.tsx - Enhanced
"use client"
import { forwardRef, type SelectHTMLAttributes } from "react"
import { clsx } from "clsx"

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  label?: string
  hint?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, hint, id, 'aria-describedby': describedBy, ...props }, ref) => {
    const errorId = error ? `${id}-error` : undefined
    const hintId = hint ? `${id}-hint` : undefined
    const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-muted-foreground block">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedByIds}
          aria-required={props.required}
          className={clsx(
            "flex h-10 w-full min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e')] bg-[length:1.5rem_1.5rem] bg-[right_0.5rem_center] bg-no-repeat pr-10",
            "touch-manipulation",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-subtle-foreground" aria-live="polite">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-destructive" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = "Select"
```

### 5. Table with Scroll Indicator
```tsx
// components/ui/table.tsx - Updated
"use client"
import * as React from "react"
import { clsx } from "clsx"

const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative overflow-x-auto" role="region" aria-label="Data table" tabIndex={0}>
      {/* Scroll shadow indicator */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <table
        ref={ref}
        className={clsx("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"
```

---

## Testing Checklist

### Automated Testing
- [ ] Run `axe-core` on all pages
- [ ] Run `eslint-plugin-jsx-a11y` on all components
- [ ] Test with Lighthouse accessibility audit

### Manual Testing (Mobile Devices)
- [ ] iPhone Safari (VoiceOver)
- [ ] Android Chrome (TalkBack)
- [ ] iPad (Zoom up to 200%)
- [ ] Keyboard-only navigation on mobile (Bluetooth keyboard)

### Screen Reader Testing
- [ ] NVDA + Firefox (Windows)
- [ ] VoiceOver + Safari (macOS/iOS)
- [ ] TalkBack + Chrome (Android)

### Touch Target Verification
- [ ] All interactive elements ≥ 44×44px
- [ ] Adequate spacing between targets (8px minimum)
- [ ] No overlapping touch targets

---

## Priority Summary

| Priority | Count | Est. Effort | Target |
|----------|-------|-------------|--------|
| **Critical** | 3 | 1.5 hrs | Week 1 |
| **High** | 8 | 8.5 hrs | Week 2 |
| **Medium** | 15 | 14 hrs | Weeks 3-4 |
| **Low** | 12 | 14 hrs | Week 5+ |
| **Total** | 38 | ~38 hrs | ~5 weeks |

---

## Appendix: Files Requiring Changes

### Critical/High Priority Files
1. `app/layout.tsx` - Viewport meta tag
2. `components/dashboard/DashboardShell.tsx` - Focus trap, skip link
3. `components/dashboard/DashboardSidebar.tsx` - Touch targets
4. `components/dashboard/DashboardHeader.tsx` - Touch targets (bell, user menu, sidebar toggle)
5. `components/onboarding/SetupWizard.tsx` - Step announcements
6. `components/ui/Input.tsx` - Error linking, autocomplete
7. `components/ui/Select.tsx` - Error linking, autocomplete
8. `components/ui/Button.tsx` - Touch target sizes
9. `components/ui/Dialog.tsx` - Focus restoration
10. `components/ui/table.tsx` - Scroll indicator
11. `components/attachments/AttachmentUploader.tsx` - Live region
12. `app/dashboard/api/ApiDashboardClient.tsx` - Touch targets, tabs
13. `components/settings/NotificationPreferencesForm.tsx` - Clickable labels
14. `components/bookings/BookingForm.tsx` - Date inputs, focus order

### Medium/Low Priority Files
14. `components/dashboard/AnalyticsSection.tsx` - Chart overflow
15. `app/dashboard/page.tsx` - Stats grid
16. `app/dashboard/calendar/page.tsx` - Month grid
17. `app/dashboard/expenses/page.tsx` - Table UX
18. `app/dashboard/settings/page.tsx` - Card padding
19. `components/ui/badge.tsx` - Contrast
20. `components/ui/tabs.tsx` - Touch targets
21. `tailwind.config.ts` - Color tokens
22. `app/globals.css` - Focus rings, logical properties

---

*Report generated by systematic audit of all components and pages in the LodgeTrack codebase.*