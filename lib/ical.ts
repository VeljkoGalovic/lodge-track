import { parseICS, VEvent } from "node-ical"
import { addHours, startOfDay, endOfDay } from "date-fns"
import { prisma } from "@/lib/prisma"

export interface ParsedBooking {
  externalUid: string
  guestName: string
  startDate: Date
  endDate: Date
}

const FETCH_TIMEOUT_MS = 10000
const MAX_ICS_SIZE_BYTES = 1024 * 1024

export async function fetchAndParseIcal(url: string): Promise<ParsedBooking[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/calendar" },
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("text/calendar") && !contentType.includes("text/plain")) {
      throw new Error("Response is not a calendar file")
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body")
    }

    const chunks: Uint8Array[] = []
    let totalBytes = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      totalBytes += value.length
      if (totalBytes > MAX_ICS_SIZE_BYTES) {
        throw new Error("iCal file too large")
      }
    }

    clearTimeout(timeoutId)
    const icsText = new TextDecoder().decode(Buffer.concat(chunks))
    return parseIcalText(icsText)
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("iCal fetch timed out")
    }
    throw error
  }
}

function parseIcalText(icsText: string): ParsedBooking[] {
  const parsed = parseICS(icsText)
  const bookings: ParsedBooking[] = []

  for (const [, component] of Object.entries(parsed)) {
    if (!component) continue
    if (component.type !== "VEVENT") continue

    const event = component as VEvent

    const uid = event.uid
    if (!uid) continue

    const start = event.start
    const end = event.end
    if (!(start instanceof Date) || !(end instanceof Date)) continue

    const summary = event.summary
    const guestName = typeof summary === "string" ? summary : summary?.val || "Imported booking"

    bookings.push({
      externalUid: String(uid),
      guestName,
      startDate: start,
      endDate: end,
    })
  }

  return bookings
}

export async function syncPropertyIcal(propertyId: string, orgId: string, icalUrl: string): Promise<{ created: number; updated: number; errors: string[] }> {
  const errors: string[] = []
  let created = 0
  const updated = 0

  let parsed: ParsedBooking[]
  try {
    parsed = await fetchAndParseIcal(icalUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    errors.push(`Fetch failed: ${message}`)
    return { created, updated, errors }
  }

  for (const booking of parsed) {
    try {
      await prisma.booking.upsert({
        where: {
          propertyId_externalUid: {
            propertyId,
            externalUid: booking.externalUid,
          },
        },
        create: {
          propertyId,
          externalUid: booking.externalUid,
          guestName: booking.guestName,
          startDate: booking.startDate,
          endDate: booking.endDate,
          source: "iCal",
          status: "CONFIRMED",
          type: "WHOLE_UNIT",
        },
        update: {
          guestName: booking.guestName,
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: "CONFIRMED",
        },
      })
      created++
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`UID ${booking.externalUid}: ${error.message}`)
      }
    }
  }

  return { created, updated, errors }
}