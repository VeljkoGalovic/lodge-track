"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import {
  Key,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Shield,
  Terminal,
  Globe,
  Info,
  Building2,
  Calendar,
  Receipt,
  BarChart3,
  Lock,
  ArrowUpRight,
  FileCode,
  Globe as GlobeIcon,
} from "lucide-react"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { formatDistanceToNow } from "date-fns"
import { srLatn } from "date-fns/locale/sr-Latn"
import { getOrgFeatures, Tier } from "@/lib/subscriptions"

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}

interface CreateApiKeyResponse {
  ok: true
  rawKey: string
  key: {
    id: string
    name: string
    keyPrefix: string
    createdAt: Date
    expiresAt: Date | null
  }
}

interface ListApiKeysResponse {
  ok: true
  keys: ApiKey[]
}

interface ActionResponse<T> {
  ok: boolean
  error?: string
  [key: string]: unknown
}

export default function ApiDashboardClient({
  initialKeys,
  orgTier,
}: {
  initialKeys: ApiKey[]
  orgTier: Tier
}) {
  const { t, locale } = useI18n()
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [isCreating, setIsCreating] = useState(false)
  const [showRawKey, setShowRawKey] = useState<string | null>(null)
  const [rawKeyValue, setRawKeyValue] = useState<string>("")
  const [isRevoking, setIsRevoking] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  const features = getOrgFeatures(orgTier)
  const hasApiAccess = features.hasApiAccess

  // Add state to control the dialog open/close lifecycle
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  async function handleCreateKey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const isLive = formData.get("isLive") === "true"

    setIsCreating(true)
    try {
      const res = await fetch("/api/actions/create-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isLive }),
      })
      const data: CreateApiKeyResponse | { ok: false; error: string } = await res.json()

      if (data.ok) {
        setRawKeyValue(data.rawKey)
        setShowRawKey(data.rawKey)
        setKeys((prev) => [
          { ...data.key, lastUsedAt: null, revokedAt: null },
          ...prev,
        ])
      } else {
        alert(data.error || t.settings.api.createError)
      }
    } catch {
      alert(t.settings.api.createError)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRevokeKey(keyId: string) {
    if (!confirm(t.settings.api.revokeConfirm)) return

    setIsRevoking(keyId)
    try {
      const res = await fetch("/api/actions/revoke-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      })
      const data: { ok: boolean; error?: string } = await res.json()

      if (data.ok) {
        setKeys((prev) =>
          prev.map((k) =>
            k.id === keyId ? { ...k, revokedAt: new Date() } : k
          )
        )
      } else {
        alert(data.error || t.settings.api.revokeError)
      }
    } catch {
      alert(t.settings.api.revokeError)
    } finally {
      setIsRevoking(null)
    }
  }

  async function handleCopyKey(keyId: string, prefix: string) {
    if (showRawKey === keyId) {
      try {
        await navigator.clipboard.writeText(rawKeyValue)
        setCopiedKeyId(keyId)
        setTimeout(() => setCopiedKeyId(null), 2000)
      } catch {
        alert(t.settings.api.copyError)
      }
    } else {
      try {
        await navigator.clipboard.writeText(prefix)
        setCopiedKeyId(keyId)
        setTimeout(() => setCopiedKeyId(null), 2000)
      } catch {
        alert(t.settings.api.copyError)
      }
    }
  }

  function formatDate(date: Date | null) {
    if (!date) return t.settings.api.never

    let dateLocale = undefined
    if (locale === "sr") {
      // Use the Serbian Latin locale from date-fns to match website script
      dateLocale = srLatn
    }

    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: dateLocale
    })
  }

  function getKeyStatus(key: ApiKey) {
    if (key.revokedAt) return { label: t.settings.api.statusRevoked, variant: "destructive" as const }
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) return { label: t.settings.api.statusExpired, variant: "destructive" as const }
    if (key.lastUsedAt) return { label: t.settings.api.statusActive, variant: "default" as const }
    return { label: t.settings.api.statusUnused, variant: "secondary" as const }
  }

  if (!hasApiAccess) {
    const previewFeatures = [
      {
        icon: Key,
        title: t.settings.api.preview.apiKeys,
        description: t.settings.api.preview.apiKeysHelp,
      },
      {
        icon: FileCode,
        title: t.settings.api.preview.documentation,
        description: t.settings.api.preview.documentationHelp,
      },
      {
        icon: GlobeIcon,
        title: t.settings.api.preview.webhooks,
        description: t.settings.api.preview.webhooksHelp,
      },
    ]

    return (
      <div className="space-y-6">
        <Card className="relative overflow-hidden">
          {/* Ambient purple wash, matching the landing page's feature cards. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-purple/15 blur-[100px]"
          />
          <div className="relative p-8 text-center md:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/10">
              <Lock className="h-8 w-8 text-brand-purple" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">{t.settings.api.upgradeTitle}</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-subtle-foreground">
              {t.settings.api.upgradeDescription}
            </p>
            <Button size="lg" href="/dashboard/billing" className="mt-6">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              {t.settings.api.upgradeButton}
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {previewFeatures.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="opacity-60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.settings.api.title}</h1>
          <p className="text-muted-foreground mt-1">{t.settings.api.description}</p>
        </div>
      <Dialog 
  open={isDialogOpen} 
  onOpenChange={(open) => {
    setIsDialogOpen(open)
    if (!open) {
      setShowRawKey(null)
      setRawKeyValue("")
    }
  }}
>
  <DialogTrigger asChild>
    <Button className="gap-2 shadow-sm">
      <Key className="h-4 w-4" />
      {t.settings.api.createKey}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] p-6">
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {t.settings.api.createKey}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t.settings.api.createKeyDescription}
          </DialogDescription>
        </DialogHeader>

        {!showRawKey ? (
          <form onSubmit={handleCreateKey} className="space-y-5">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  {t.settings.api.keyName}
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t.settings.api.keyNamePlaceholder}
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t.settings.api.keyTypeLabel || "Environment"}
                </Label>
                <div className="flex items-center space-x-3 h-10 px-3 rounded-md border border-input bg-background shadow-sm transition-colors hover:bg-accent/50">
                  <input
                    type="checkbox"
                    id="isLive"
                    name="isLive"
                    defaultChecked
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <div className="flex flex-col cursor-pointer select-none" onClick={() => {
                    const cb = document.getElementById("isLive") as HTMLInputElement;
                    if (cb) cb.checked = !cb.checked;
                  }}>
                    <Label htmlFor="isLive" className="font-medium cursor-pointer text-sm leading-none">
                      {t.settings.api.liveKey}
                    </Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  {t.settings.api.keyTypeNote}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="h-10"
              >
                {t.settings.api.cancel}
              </Button>
              <Button type="submit" disabled={isCreating} className="h-10">
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t.settings.api.createKey}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="pt-2 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {t.settings.api.keyCreated}
              </h4>
              <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono">
                {rawKeyValue.startsWith("lt_live_") ? t.settings.api.live : t.settings.api.test}
              </Badge>
            </div>
            
            <div className="relative mb-2">
              <Input
                readOnly
                value={rawKeyValue}
                className="pr-10 font-mono text-xs bg-muted/50 h-11"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-background"
                onClick={() => handleCopyKey(showRawKey, rawKeyValue)}
              >
                {copiedKeyId === showRawKey ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            
            <div className="rounded-md bg-destructive/10 p-3 mb-4">
              <p className="text-xs text-destructive font-medium leading-relaxed">
                {t.settings.api.keyWarning}
              </p>
            </div>

            <Button
              type="button"
              className="w-full h-10 shadow-sm"
              onClick={() => {
                setShowRawKey(null)
                setRawKeyValue("")
                setIsDialogOpen(false)
              }}
            >
              {t.settings.api.gotIt}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
      </div>

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t.settings.api.yourKeys}
          </CardTitle>
          <CardDescription>{t.settings.api.yourKeysDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">{t.settings.api.noKeys}</h3>
              <p className="text-muted-foreground mb-4">{t.settings.api.noKeysDescription}</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>{t.settings.api.createFirstKey}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{t.settings.api.createKey}</DialogTitle>
                    <DialogDescription>{t.settings.api.createKeyDescription}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateKey}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">{t.settings.api.keyName}</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder={t.settings.api.keyNamePlaceholder}
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="checkbox" id="isLive" name="isLive" defaultChecked />
                        <Label htmlFor="isLive" className="font-normal cursor-pointer">
                          {t.settings.api.liveKey}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">{t.settings.api.keyTypeNote}</p>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => { }}>
                        {t.settings.api.cancel}
                      </Button>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t.settings.api.createKey}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              {keys.map((key) => {
                const status = getKeyStatus(key)
                const isRevoked = !!key.revokedAt
                return (
                  <div
                    key={key.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg ${
                      isRevoked ? "opacity-50 bg-muted/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Key className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{key.name}</span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {key.expiresAt && (
                            <Badge variant="outline" className="text-xs">
                              {t.settings.api.expires} {formatDate(key.expiresAt)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                          <span className="font-mono text-primary">{key.keyPrefix}••••••</span>
                          <span>{t.settings.api.created} {formatDate(key.createdAt)}</span>
                          {key.lastUsedAt && (
                            <span>{t.settings.api.lastUsed} {formatDate(key.lastUsedAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyKey(key.id, key.keyPrefix + "••••••")}
                        disabled={isRevoked}
                        title={t.settings.api.copyPrefix}
                      >
                        {copiedKeyId === key.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (showRawKey === key.id) {
                            setShowRawKey(null)
                          } else {
                            // In real app, would need to fetch full key - for demo we only show on create
                            alert(t.settings.api.cannotShowKey)
                          }
                        }}
                        disabled={isRevoked}
                        title={t.settings.api.viewKey}
                      >
                        {showRawKey === key.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeKey(key.id)}
                        disabled={isRevoking === key.id || isRevoked}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title={t.settings.api.revoke}
                      >
                        {isRevoking === key.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" data-testid="loading-spinner" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Tabs defaultValue="authentication" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="authentication">{t.settings.api.tabs.authentication}</TabsTrigger>
          <TabsTrigger value="endpoints">{t.settings.api.tabs.endpoints}</TabsTrigger>
          <TabsTrigger value="examples">{t.settings.api.tabs.examples}</TabsTrigger>
        </TabsList>

        <TabsContent value="authentication" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t.settings.api.auth.title}
              </CardTitle>
              <CardDescription>{t.settings.api.auth.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">{t.settings.api.auth.headerFormat}</h4>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <code>{t.settings.api.auth.headerExample}</code>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">{t.settings.api.auth.keyFormat}</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="font-mono text-green-800">lt_live_abc123...</span>
                    <Badge variant="success" className="text-xs">{t.settings.api.live}</Badge>
                    <span className="text-sm text-green-700 ml-auto">{t.settings.api.auth.liveDescription}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="font-mono text-blue-800">lt_test_abc123...</span>
                    <Badge variant="secondary" className="text-xs">{t.settings.api.test}</Badge>
                    <span className="text-sm text-blue-700 ml-auto">{t.settings.api.auth.testDescription}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">{t.settings.api.auth.bestPractices}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> {t.settings.api.auth.practice1}</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> {t.settings.api.auth.practice2}</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> {t.settings.api.auth.practice3}</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> {t.settings.api.auth.practice4}</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t.settings.api.auth.errorsTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { code: "401", title: t.settings.api.auth.error401Title, desc: t.settings.api.auth.error401Desc },
                { code: "403", title: t.settings.api.auth.error403Title, desc: t.settings.api.auth.error403Desc },
                { code: "429", title: t.settings.api.auth.error429Title, desc: t.settings.api.auth.error429Desc },
              ].map((err) => (
                <div key={err.code} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge variant="outline" className="shrink-0 font-mono">
                    {err.code}
                  </Badge>
                  <div>
                    <p className="font-medium">{err.title}</p>
                    <p className="text-sm text-muted-foreground">{err.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-6 mt-6">
          {[
            {
              category: t.settings.api.endpoints.propertiesTitle,
              icon: Building2,
              endpoints: [
                { method: "GET", path: "/v1/properties", desc: t.settings.api.endpoints.listProperties },
                { method: "POST", path: "/v1/properties", desc: t.settings.api.endpoints.createProperty },
                { method: "GET", path: "/v1/properties/:id", desc: t.settings.api.endpoints.getProperty },
                { method: "PATCH", path: "/v1/properties/:id", desc: t.settings.api.endpoints.updateProperty },
                { method: "DELETE", path: "/v1/properties/:id", desc: t.settings.api.endpoints.deleteProperty },
              ],
            },
            {
              category: t.settings.api.endpoints.bookingsTitle,
              icon: Calendar,
              endpoints: [
                { method: "GET", path: "/v1/bookings", desc: t.settings.api.endpoints.listBookings },
                { method: "POST", path: "/v1/bookings", desc: t.settings.api.endpoints.createBooking },
                { method: "GET", path: "/v1/bookings/:id", desc: t.settings.api.endpoints.getBooking },
                { method: "PATCH", path: "/v1/bookings/:id", desc: t.settings.api.endpoints.updateBooking },
                { method: "DELETE", path: "/v1/bookings/:id", desc: t.settings.api.endpoints.deleteBooking },
              ],
            },
            {
              category: t.settings.api.endpoints.unitsTitle,
              icon: Globe,
              endpoints: [
                { method: "GET", path: "/v1/properties/:propertyId/units", desc: t.settings.api.endpoints.listUnits },
                { method: "POST", path: "/v1/properties/:propertyId/units", desc: t.settings.api.endpoints.createUnit },
                { method: "GET", path: "/v1/units/:id", desc: t.settings.api.endpoints.getUnit },
                { method: "PATCH", path: "/v1/units/:id", desc: t.settings.api.endpoints.updateUnit },
              ],
            },
            {
              category: t.settings.api.endpoints.expensesTitle,
              icon: Receipt,
              endpoints: [
                { method: "GET", path: "/v1/expenses", desc: t.settings.api.endpoints.listExpenses },
                { method: "POST", path: "/v1/expenses", desc: t.settings.api.endpoints.createExpense },
                { method: "GET", path: "/v1/expenses/:id", desc: t.settings.api.endpoints.getExpense },
                { method: "PATCH", path: "/v1/expenses/:id", desc: t.settings.api.endpoints.updateExpense },
                { method: "DELETE", path: "/v1/expenses/:id", desc: t.settings.api.endpoints.deleteExpense },
              ],
            },
            {
              category: t.settings.api.endpoints.analyticsTitle,
              icon: BarChart3,
              endpoints: [
                { method: "GET", path: "/v1/analytics/occupancy", desc: t.settings.api.endpoints.getOccupancy },
                { method: "GET", path: "/v1/analytics/revenue", desc: t.settings.api.endpoints.getRevenue },
                { method: "GET", path: "/v1/analytics/expenses", desc: t.settings.api.endpoints.getExpenses },
              ],
            },
            {
              category: t.settings.api.endpoints.webhooksTitle,
              icon: Terminal,
              endpoints: [
                { method: "POST", path: "/v1/webhooks", desc: t.settings.api.endpoints.createWebhook },
                { method: "GET", path: "/v1/webhooks", desc: t.settings.api.endpoints.listWebhooks },
                { method: "DELETE", path: "/v1/webhooks/:id", desc: t.settings.api.endpoints.deleteWebhook },
              ],
            },
          ].map((section) => (
            <Card key={section.category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="h-5 w-5" />
                  {section.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.endpoints.map((ep) => (
                    <div
                      key={`${ep.method}-${ep.path}`}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
                    >
                      <Badge
                        variant={
                          ep.method === "GET"
                            ? "default"
                            : ep.method === "POST"
                            ? "success"
                            : ep.method === "PATCH"
                            ? "secondary"
                            : "destructive"
                        }
                        className="font-mono text-xs shrink-0 px-2 py-1"
                      >
                        {ep.method}
                      </Badge>
                      <code className="font-mono text-sm text-primary flex-1 truncate">{ep.path}</code>
                      <span className="text-sm text-muted-foreground">{ep.desc}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => navigator.clipboard.writeText(ep.path)}
                        title={t.settings.api.copyEndpoint}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="examples" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                {t.settings.api.examples.curlTitle}
              </CardTitle>
              <CardDescription>{t.settings.api.examples.curlDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  title: t.settings.api.examples.listProperties,
                  code: `curl -X GET "https://api.lodgetrack.com/v1/properties" \\
  -H "Authorization: Bearer lt_live_abc123..." \\
  -H "Accept: application/json"`,
                },
                {
                  title: t.settings.api.examples.createBooking,
                  code: `curl -X POST "https://api.lodgetrack.com/v1/bookings" \\
  -H "Authorization: Bearer lt_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "propertyId": "prop_123",
    "unitId": "unit_456",
    "guestName": "John Doe",
    "guestEmail": "john@example.com",
    "checkIn": "2024-07-15",
    "checkOut": "2024-07-20",
    "adults": 2,
    "children": 0
  }'`,
                },
                {
                  title: t.settings.api.examples.getAnalytics,
                  code: `curl -X GET "https://api.lodgetrack.com/v1/analytics/occupancy?propertyId=prop_123&from=2024-01-01&to=2024-12-31" \\
  -H "Authorization: Bearer lt_live_abc123..." \\
  -H "Accept: application/json"`,
                },
              ].map((ex) => (
                <div key={ex.title} className="space-y-2">
                  <h4 className="font-medium text-sm">{ex.title}</h4>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm"><code className="font-mono">{ex.code}</code></pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => navigator.clipboard.writeText(ex.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t.settings.api.examples.javascriptTitle}
              </CardTitle>
              <CardDescription>{t.settings.api.examples.javascriptDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm"><code className="font-mono">{t.settings.api.examples.javascriptCode}</code></pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => navigator.clipboard.writeText(t.settings.api.examples.javascriptCode)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                {t.settings.api.examples.openapiTitle}
              </CardTitle>
              <CardDescription>{t.settings.api.examples.openapiDescription}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild variant="outline">
                <Link href="/api/openapi.json" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t.settings.api.examples.openapiButton}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}