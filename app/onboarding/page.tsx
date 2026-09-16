"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Building2, Users, CheckCircle, ArrowRight } from "lucide-react"
import { clsx } from "clsx"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [orgName, setOrgName] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName }),
      })

      if (res.ok) {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      console.error("Onboarding failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal/20">
            <Building2 className="h-6 w-6 text-brand-teal" />
          </div>
          <CardTitle>Welcome to LodgeTracker</CardTitle>
          <CardDescription>
            Let&apos;s set up your organization to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <div
                    className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                      step >= s
                        ? "bg-brand-teal text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                  </div>
                  {s === 1 && <div className="hidden md:block w-12 h-px bg-muted" />}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4" style={{ animation: "fadeIn 0.2s ease-out" }}>
                <div className="space-y-2">
                  <label htmlFor="orgName" className="text-sm font-medium block">
                    Organization Name
                  </label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g., Acme Properties"
                    className="w-full"
                    autoFocus
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  This will be your organization&apos;s display name
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 text-center" style={{ animation: "fadeIn 0.2s ease-out" }}>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold">Almost done!</h3>
                <p className="text-muted-foreground">
                  We&apos;ll create your organization &ldquo;{orgName}&rdquo; and set up your dashboard.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {step === 1 && (
                <Button type="submit" className="flex-1" disabled={!orgName.trim() || loading}>
                  {loading ? "Creating..." : "Continue"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === 2 && (
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Creating..." : "Create Organization"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}