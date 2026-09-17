"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { ShieldCheck, ShieldOff } from "lucide-react"
import { confirmTwoFactor, disableTwoFactor, startTwoFactorSetup } from "@/app/actions/account"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { Input } from "@/components/ui/input"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"

interface TwoFactorPanelProps {
  enabled: boolean
  issuer: string
  accountName: string
}

/**
 * Enrolment for the TOTP second factor.
 *
 * The secret is only committed to the account once a code has been proved
 * against it, so an abandoned or mistyped setup cannot lock anyone out — until
 * the code is confirmed, signing in still only needs the password.
 */
export function TwoFactorPanel({ enabled, issuer, accountName }: TwoFactorPanelProps) {
  const router = useRouter()
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null)
  const [startError, setStartError] = useState("")
  const [starting, startTransition] = useTransition()

  const [confirmState, confirmAction] = useActionState(confirmTwoFactor, EMPTY_ACTION_STATE)
  const [disableState, disableAction] = useActionState(disableTwoFactor, EMPTY_ACTION_STATE)

  // Confirming flips the factor live, so the refresh re-renders this panel with
  // `enabled` true. The `enabled` branch below is checked before the setup state,
  // so the finished setup stops being rendered without having to be cleared.
  useEffect(() => {
    if (confirmState.success) router.refresh()
  }, [confirmState.success, router])

  useEffect(() => {
    if (disableState.success) router.refresh()
  }, [disableState.success, router])

  function begin() {
    setStartError("")
    startTransition(async () => {
      const result = await startTwoFactorSetup()
      if ("error" in result) setStartError(result.error)
      else setSetup(result)
    })
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-primary">Two-factor authentication is on</p>
            <p className="text-sm text-muted-foreground">
              Signing in requires a code from your authenticator app.
            </p>
          </div>
        </div>

        <form action={disableAction} className="space-y-3">
          <FormMessage error={disableState.error} success={disableState.success} />
          <div className="space-y-2">
            <label htmlFor="disablePassword" className="text-sm font-medium text-muted-foreground">
              Confirm your password to turn it off
            </label>
            <Input
              id="disablePassword"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <SubmitButton variant="outline" pendingLabel="Turning off...">
            <ShieldOff className="mr-1.5 h-4 w-4" />
            Turn off two-factor
          </SubmitButton>
        </form>
      </div>
    )
  }

  if (!setup) {
    return (
      <div className="space-y-4">
        <FormMessage error={startError} />
        <p className="text-sm text-subtle-foreground">
          Adds a second step to sign-in using an authenticator app such as Google Authenticator,
          1Password or Authy. If you lose the device, an owner of this organization can reset the
          factor for you.
        </p>
        <SubmitButton onClick={begin} pendingLabel="Preparing..." disabled={starting}>
          Set up two-factor
        </SubmitButton>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <FormMessage error={confirmState.error} success={confirmState.success} />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* White plate behind the code — QR scanners need the contrast. */}
        <div className="w-fit rounded-2xl bg-white p-3">
          <QRCodeSVG value={setup.uri} size={168} level="M" bgColor="#FFFFFF" fgColor="#07090E" />
        </div>

        <div className="min-w-0 space-y-3">
          <p className="text-sm text-muted-foreground">
            Scan this with your authenticator app. If it cannot scan, enter the key by hand:
          </p>
          <code className="block break-all rounded-xl border border-border bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
            {setup.secret}
          </code>
          <p className="text-xs text-subtle-foreground">
            {issuer} account: {accountName}
          </p>
        </div>
      </div>

      <form action={confirmAction} className="space-y-3 border-t border-border pt-5">
        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium text-muted-foreground">
            Enter the six-digit code it shows
          </label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            required
            className="max-w-40 font-mono tracking-[0.3em]"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <SubmitButton pendingLabel="Verifying...">Turn on two-factor</SubmitButton>
          <SubmitButton type="button" variant="ghost" onClick={() => setSetup(null)}>
            Cancel
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}
