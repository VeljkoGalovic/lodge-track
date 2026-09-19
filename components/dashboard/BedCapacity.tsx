import { cn } from "@/lib/utils"

interface BedCapacityProps {
  occupied: number
  total: number
  /** Shows "2/5" beside the segments. Bare bar when omitted. */
  showCount?: boolean
  className?: string
}

/**
 * Capacity as geometry: one segment per bed.
 *
 * Beds are discrete inventory, so a continuous progress bar would be the wrong
 * shape — it implies a fractional bed that cannot exist. One square per bed
 * encodes the actual count, and a full house turns the segments destructive so
 * "no beds left" is seen before it is read. The segments are aria-hidden and the
 * count is the accessible label, so a screen reader hears "2 of 5 beds
 * occupied", not "five decorative squares".
 */
export function BedCapacity({ occupied, total, showCount, className }: BedCapacityProps) {
  const clamped = Math.max(0, Math.min(occupied, total))
  const full = clamped >= total && total > 0

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={`${clamped} of ${total} beds occupied`}
    >
      <span aria-hidden="true" className="inline-flex items-center gap-[3px]">
        {Array.from({ length: Math.max(total, 1) }, (_, bed) => (
          <span
            key={bed}
            className={cn(
              "h-[9px] w-[9px] rounded-[3px] border",
              bed < clamped
                ? full
                  ? "border-destructive/30 bg-destructive/70"
                  : "border-primary/30 bg-primary/70"
                : "border-border bg-transparent"
            )}
          />
        ))}
      </span>
      {showCount ? (
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {clamped}/{total}
        </span>
      ) : null}
    </span>
  )
}
