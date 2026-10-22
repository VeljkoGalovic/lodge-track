// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { ExpenseForm } from "@/components/expenses/ExpenseForm"
import { getDictionary } from "@/lib/i18n/dictionaries"

vi.mock("@/app/actions/expenses", () => ({ createExpense: vi.fn(), updateExpense: vi.fn() }))
vi.mock("@/lib/use-action-redirect", () => ({ useActionRedirect: vi.fn() }))
vi.mock("@/components/i18n/LocaleProvider", () => ({
  useI18n: () => ({ locale: "en", t: getDictionary("en") }),
  useDictionary: () => getDictionary("en"),
  useLocale: () => ({ locale: "en" as const, setLocale: vi.fn() }),
}))
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null }) }))
vi.mock("@/hooks/useAttachmentUpload", () => ({ useAttachmentUpload: () => ({ upload: vi.fn(), deleteAttachment: vi.fn(), uploading: false }) }))

afterEach(cleanup)

const properties = [
  { id: "p1", name: "Motel" },
  { id: "p2", name: "Cabin" },
]

describe("ExpenseForm - no file upload UI", () => {
  it("does not render any file input element", () => {
    render(<ExpenseForm properties={properties} currency="USD" orgId="org1" />)
    // No file input should exist in the DOM
    expect(screen.queryByLabelText(/receipt/i)).not.toBeInTheDocument()
    // Also check for hidden file input
    const fileInputs = screen.getAllByRole("textbox", { hidden: true })
    const fileInputsByType = document.querySelectorAll('input[type="file"]')
    expect(fileInputsByType.length).toBe(0)
  })

  it("does not render AttachmentUploader or dropzone", () => {
    render(<ExpenseForm properties={properties} currency="USD" orgId="org1" />)
    // No dropzone text
    expect(screen.queryByText(/drag & drop/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/drag and drop/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/click to select/i)).not.toBeInTheDocument()
    // No upload progress
    expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument()
    // No file accept hint
    expect(screen.queryByText(/.pdf, .png, .jpg, .jpeg, .webp/i)).not.toBeInTheDocument()
  })

  it("does not render receipt-related help text", () => {
    render(<ExpenseForm properties={properties} currency="USD" orgId="org1" />)
    // The receipt help text should not be present
    expect(screen.queryByText(/stored privately/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument()
  })

  it("renders core expense fields", () => {
    render(<ExpenseForm properties={properties} currency="USD" orgId="org1" />)
    // Core fields should still exist
    expect(screen.getByLabelText(/property/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount in usd/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date incurred/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/what was it for\?/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /log expense/i })).toBeInTheDocument()
  })

  it("renders core expense fields when editing existing expense", () => {
    const expense = {
      id: "e1",
      propertyId: "p1",
      amount: 12000,
      category: "MAINTENANCE" as const,
      date: new Date("2026-09-15"),
      description: "Water heater replacement",
      receiptName: null,
      hasReceipt: false,
      attachments: [],
    }
    render(<ExpenseForm properties={properties} currency="USD" orgId="org1" expense={expense} />)
    expect(screen.getByLabelText(/property/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount in usd/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date incurred/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/what was it for\?/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()
    // No file input
    const fileInputs = document.querySelectorAll('input[type="file"]')
    expect(fileInputs.length).toBe(0)
  })

  it("does not render existing attachment list when editing", () => {
    const expense = {
      id: "e1",
      propertyId: "p1",
      amount: 12000,
      category: "MAINTENANCE" as const,
      date: new Date("2026-09-15"),
      description: "Water heater replacement",
      receiptName: "receipt.pdf",
      hasReceipt: true,
      // attachments field is now never[] - not passed at all
    }
    render(<ExpenseForm properties={properties} currency="USD" orgId="org1" expense={expense} />)
    // No attachment list
    expect(screen.queryByText(/attachments/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/receipt.pdf/i)).not.toBeInTheDocument()
  })
})