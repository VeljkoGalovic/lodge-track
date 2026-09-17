"use client"

import { useActionState } from "react"
import { DoorOpen, Plus, Trash2 } from "lucide-react"
import { createUnit, deleteUnit, renameUnit } from "@/app/actions/units"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/input"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useI18n } from "@/components/i18n/LocaleProvider"
import {
  ACTIVE_BOOKING_FORMS,
  format,
  plural,
  UNIT_COUNT_FORMS,
} from "@/lib/i18n/dictionaries"

interface Unit {
  id: string
  name: string
  kind: string | null
  /** Live, non-cancelled stays — what stops a unit being removed. */
  activeBookings: number
}

interface UnitsCardProps {
  propertyId: string
  units: Unit[]
  /** View-only roles see the list, not the controls. */
  canEdit: boolean
}

/**
 * One unit's rename form.
 *
 * Split out from the list so each row owns its own `useActionState` — one hook
 * per row rather than one per card, so a failed rename reports against the row it
 * belongs to instead of somewhere else on the page.
 */
function UnitRow({ unit, canEdit }: { unit: Unit; canEdit: boolean }) {
  const { locale, t } = useI18n()
  const [renameState, renameAction] = useActionState(renameUnit, EMPTY_ACTION_STATE)
  const [deleteState, deleteAction] = useActionState(deleteUnit, EMPTY_ACTION_STATE)
  useActionRedirect(renameState)
  useActionRedirect(deleteState)

  return (
    <div className="rounded-2xl border border-border bg-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{unit.name}</p>
          <p className="text-sm text-subtle-foreground">
            {unit.kind ?? t.units.noKind} ·{" "}
            {unit.activeBookings === 0
              ? t.units.noneActive
              : plural(unit.activeBookings, ACTIVE_BOOKING_FORMS[locale], locale)}
          </p>
        </div>

        {canEdit ? (
          <div className="flex items-center gap-1">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  {t.units.rename}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-foreground">
                    {format(t.units.renameTitle, { name: unit.name })}
                  </DialogTitle>
                  <DialogDescription>{t.units.renameHelp}</DialogDescription>
                </DialogHeader>

                <FormMessage error={renameState.error} />

                <form action={renameAction} className="space-y-4">
                  <input type="hidden" name="id" value={unit.id} />
                  <div className="space-y-2">
                    <label htmlFor={`name-${unit.id}`} className="text-sm font-medium text-muted-foreground">
                      {t.forms.name}
                    </label>
                    <Input
                      id={`name-${unit.id}`}
                      name="name"
                      defaultValue={unit.name}
                      maxLength={60}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor={`kind-${unit.id}`} className="text-sm font-medium text-muted-foreground">
                      {t.forms.unitKind}{" "}
                      <span className="text-subtle-foreground">({t.common.optional})</span>
                    </label>
                    <Input
                      id={`kind-${unit.id}`}
                      name="kind"
                      defaultValue={unit.kind ?? ""}
                      placeholder={t.forms.unitKindPlaceholder}
                      maxLength={40}
                    />
                  </div>
                  <DialogFooter>
                    <SubmitButton pendingLabel={t.common.saving}>{t.units.saveUnit}</SubmitButton>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t.units.remove}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-foreground">
                    {format(t.units.removeTitle, { name: unit.name })}
                  </DialogTitle>
                  <DialogDescription>
                    {unit.activeBookings > 0
                      ? format(t.units.removeBlocked, {
                          bookings: plural(
                            unit.activeBookings,
                            ACTIVE_BOOKING_FORMS[locale],
                            locale
                          ),
                        })
                      : t.units.removeConfirm}
                  </DialogDescription>
                </DialogHeader>

                <FormMessage error={deleteState.error} />

                <form action={deleteAction}>
                  <input type="hidden" name="id" value={unit.id} />
                  <DialogFooter>
                    <SubmitButton variant="destructive" pendingLabel={t.common.removing}>
                      {t.units.removeUnit}
                    </SubmitButton>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function UnitsCard({ propertyId, units, canEdit }: UnitsCardProps) {
  const { locale, t } = useI18n()
  const [state, formAction] = useActionState(createUnit, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-primary" />
          {t.units.title}
        </CardTitle>
        <CardDescription>
          {units.length === 0
            ? t.units.empty
            : plural(units.length, UNIT_COUNT_FORMS[locale], locale)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {units.length > 0 ? (
          <div className="space-y-3">
            {units.map((unit) => (
              <UnitRow key={unit.id} unit={unit} canEdit={canEdit} />
            ))}
          </div>
        ) : null}

        {canEdit ? (
          <form
            action={formAction}
            className="space-y-3 rounded-2xl border border-border bg-muted p-4"
          >
            <input type="hidden" name="propertyId" value={propertyId} />
            <FormMessage error={state.error} success={state.success} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="unit-name" className="text-sm font-medium text-muted-foreground">
                  {t.forms.unitName}
                </label>
                <Input
                  id="unit-name"
                  name="name"
                  placeholder="Room 1"
                  maxLength={60}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="unit-kind" className="text-sm font-medium text-muted-foreground">
                  {t.forms.unitKind}{" "}
                  <span className="text-subtle-foreground">({t.common.optional})</span>
                </label>
                <Input
                  id="unit-kind"
                  name="kind"
                  placeholder={t.forms.unitKindPlaceholder}
                  maxLength={40}
                />
              </div>
            </div>

            <SubmitButton variant="outline" pendingLabel={t.common.adding}>
              <Plus className="mr-2 h-4 w-4" />
              {t.units.addUnit}
            </SubmitButton>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
