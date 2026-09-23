"use client"

import { useState, useCallback, useRef, DragEvent, ChangeEvent } from "react"
import { formatBytes } from "@/lib/subscriptions"

export type AttachmentModule = "EXPENSE" | "BOOKING" | "PROPERTY" | "UNIT" | "USER_AVATAR"

export interface StoredAttachment {
  path: string
  name: string
  type: string
  size: number
  checksum: string
  supabaseId?: string
  id?: string
  createdAt?: string
}

interface AttachmentUploaderProps {
  module: AttachmentModule
  moduleId: string
  orgId: string
  onUploadComplete?: (attachment: StoredAttachment) => void
  maxFiles?: number
  accept?: string
  maxSizeMB?: number
  disabled?: boolean
  existingAttachments?: StoredAttachment[]
  onDelete?: (attachmentId: string) => Promise<void>
}

const DEFAULT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp"
const DEFAULT_MAX_SIZE_MB = 5
const MAX_FILES_DEFAULT = 1

export function AttachmentUploader({
  module,
  moduleId,
  orgId,
  onUploadComplete,
  maxFiles = MAX_FILES_DEFAULT,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  disabled = false,
  existingAttachments = [],
  onDelete,
}: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxSizeBytes = maxSizeMB * 1024 * 1024

  const validateFile = useCallback((file: File): string | null => {
    if (file.size === 0) return "That file is empty."
    if (file.size > maxSizeBytes) {
      return `Attachments must be under ${maxSizeMB} MB.`
    }
    return null
  }, [maxSizeBytes, maxSizeMB])

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("module", module)
      formData.append("moduleId", moduleId)

      const response = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }

      setProgress(100)
      if (onUploadComplete && data.attachment) {
        onUploadComplete(data.attachment)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [module, moduleId, validateFile, onUploadComplete])

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      if (maxFiles === 1) {
        if (fileArray.length > 0) uploadFile(fileArray[0])
      } else {
        fileArray.slice(0, maxFiles).forEach(uploadFile)
      }
    },
    [maxFiles, uploadFile]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [disabled, handleFiles]
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files)
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    [handleFiles]
  )

  const handleDelete = useCallback(
    async (attachmentId: string) => {
      if (onDelete) {
        await onDelete(attachmentId)
      }
    },
    [onDelete]
  )

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleInputChange}
          disabled={disabled || uploading}
          className="sr-only"
          aria-label="Upload attachment"
        />

        {uploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-gray-700 font-medium">Uploading... {progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-gray-600">
              {maxFiles > 1
                ? "Drag & drop files here, or click to select"
                : "Drag & drop a file here, or click to select"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {accept.split(",").map((ext) => ext.trim()).join(", ")} • Up to {maxSizeMB} MB
              {maxFiles > 1 ? ` • Max ${maxFiles} files` : ""}
            </p>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg" role="alert">
          {error}
        </div>
      )}

      {/* Existing Attachments */}
      {existingAttachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Attachments</h4>
          <ul className="space-y-2">
            {existingAttachments.map((attachment) => (
              <li
                key={attachment.id || attachment.path}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {attachment.type.startsWith("image/") ? (
                    <svg className="h-10 w-10 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  ) : (
                    <svg className="h-10 w-10 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                    <p className="text-xs text-gray-500">{formatBytes(attachment.size)}</p>
                  </div>
                </div>
                {onDelete && attachment.id && (
                  <button
                    onClick={() => handleDelete(attachment.id!)}
                    disabled={uploading}
                    className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                    aria-label={`Delete ${attachment.name}`}
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}