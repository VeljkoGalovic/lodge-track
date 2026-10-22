"use client"

import { useState } from "react"
import { formatBytes } from "@/lib/subscriptions"
import type { StoredAttachment } from "./AttachmentUploader"

interface AttachmentViewerProps {
  attachment: StoredAttachment
  onDelete?: (attachmentId: string) => Promise<void>
  onDownload?: (attachmentId: string) => Promise<void>
  disabled?: boolean
}

export function AttachmentViewer({ attachment, onDelete, onDownload, disabled = false }: AttachmentViewerProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const isImage = attachment.type.startsWith("image/")
  const isPdf = attachment.type === "application/pdf"

  const handleDownload = async () => {
    if (onDownload && attachment.id) {
      setDownloading(true)
      await onDownload(attachment.id)
      setDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (onDelete && attachment.id) {
      await onDelete(attachment.id)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {/* File Icon / Preview */}
      <div className="flex-shrink-0">
        {isImage && attachment.id && (
          <button
            onClick={() => setPreviewOpen(true)}
            className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
            aria-label={`Preview ${attachment.name}`}
          >
            <img
              src={`/api/attachments/${attachment.id}`}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </button>
        )}
        {!isImage && (
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
            {isPdf ? (
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
        <p className="text-xs text-gray-500">
          {attachment.type === "application/pdf" ? "PDF" : attachment.type.split("/")[1]?.toUpperCase() || "FILE"} • {formatBytes(attachment.size)}
          {attachment.createdAt && ` • ${new Date(attachment.createdAt).toLocaleDateString()}`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {attachment.id && (
          <button
            onClick={handleDownload}
            disabled={disabled || downloading}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Download ${attachment.name}`}
          >
            {downloading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>
        )}

        {onDelete && attachment.id && (
          <button
            onClick={handleDelete}
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Delete ${attachment.name}`}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>

    {/* Image Preview Modal */}
    {isImage && previewOpen && attachment.id && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        onClick={() => setPreviewOpen(false)}
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${attachment.name}`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setPreviewOpen(false) }}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          aria-label="Close preview"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={`/api/attachments/${attachment.id}`}
          alt={attachment.name}
          className="max-w-[90vw] max-h-[90vh] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
  </>
  )
}