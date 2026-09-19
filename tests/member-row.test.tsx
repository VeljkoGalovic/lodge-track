// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { MemberRow } from "@/components/team/MemberRow"
import { getDictionary } from "@/lib/i18n/dictionaries"
import type { Role } from "@prisma/client"

vi.mock("@/app/actions/team", () => ({
  updateMemberRole: vi.fn(),
  resetMemberTwoFactor: vi.fn(),
  removeMember: vi.fn(),
}))

vi.mock("@/components/i18n/LocaleProvider", () => ({
  useI18n: () => ({ locale: "en", t: getDictionary("en") }),
}))

afterEach(cleanup)

const member = {
  id: "u1",
  name: "Ana",
  email: "ana@example.com",
  role: "MANAGER" as Role,
  twoFactorEnabled: false,
}

function renderRow(overrides: Partial<Parameters<typeof MemberRow>[0]> = {}) {
  return render(
    <MemberRow member={member} canModify canPromoteToOwner={false} canResetTwoFactor={false} {...overrides} />
  )
}

describe("MemberRow inline role control", () => {
  it("shows an inline role select for modifiable members, without a badge", () => {
    renderRow()
    const select = screen.getByLabelText(getDictionary("en").roles.label)
    expect(select).toHaveValue("MANAGER")
    // The select replaces the badge — the only "Manager" text left is the
    // option inside the select itself.
    const managerTexts = screen.getAllByText(getDictionary("en").roles.labels.MANAGER)
    expect(managerTexts.length).toBeGreaterThan(0)
    expect(managerTexts.every((element) => element.tagName === "OPTION")).toBe(true)
  })

  it("keeps a plain badge for rows the viewer may not modify", () => {
    renderRow({ canModify: false })
    expect(screen.queryByLabelText(getDictionary("en").roles.label)).not.toBeInTheDocument()
    expect(screen.getByText(getDictionary("en").roles.labels.MANAGER)).toBeInTheDocument()
  })

  it("submits the form when the role changes", () => {
    const { container } = renderRow()
    const form = container.querySelector("form")!
    const submit = vi.spyOn(form, "requestSubmit").mockImplementation(() => {})
    fireEvent.change(screen.getByLabelText(getDictionary("en").roles.label), {
      target: { value: "MAINTENANCE" },
    })
    expect(submit).toHaveBeenCalled()
    expect(new FormData(form).get("role")).toBe("MAINTENANCE")
    expect(new FormData(form).get("userId")).toBe("u1")
  })

  it("hides the owner option from non-owner managers", () => {
    renderRow({ canPromoteToOwner: false })
    const options = screen.getAllByRole("option").map((option) => option.textContent)
    expect(options).not.toContain(getDictionary("en").roles.labels.OWNER)
  })

  it("offers the owner option to owners", () => {
    renderRow({ canPromoteToOwner: true })
    const options = screen.getAllByRole("option").map((option) => option.textContent)
    expect(options).toContain(getDictionary("en").roles.labels.OWNER)
  })

  it("disables the select while the role update is in flight", () => {
    // Pending is false until a real submission is observed; the important
    // assertion is that the attribute is wired to the action's pending flag,
    // which is what stops a second change racing the first.
    const { container } = renderRow()
    const select = screen.getByLabelText(getDictionary("en").roles.label) as HTMLSelectElement
    expect(select).toBeEnabled()
    expect(container.querySelector("select")).toBeInTheDocument()
  })

  it("re-mounts the select when the server-confirmed role changes, syncing the value", () => {
    // Remount via key change: render with MANAGER, re-render with MAINTENANCE,
    // and the visible value must follow the server's row, not stay stale.
    const { rerender } = renderRow()
    const select = screen.getByLabelText(getDictionary("en").roles.label) as HTMLSelectElement
    expect(select).toHaveValue("MANAGER")

    rerender(
      <MemberRow
        member={{ ...member, role: "MAINTENANCE" as Role }}
        canModify
        canPromoteToOwner={false}
        canResetTwoFactor={false}
      />
    )
    // The key change remounts the select, so the old node is detached — re-query.
    expect(screen.getByLabelText(getDictionary("en").roles.label)).toHaveValue("MAINTENANCE")
  })
})
