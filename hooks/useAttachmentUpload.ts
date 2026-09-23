"use client"

import { useCallback, useState } from "react"
import { formatBytes } from "@/lib/subscriptions"

export type AttachmentModule = "EXPENSE" | "BOOKING" | "PROPERTY" | "UNIT" | "USER_AVATAR"

export interface StoredAttachment {
  id?: string
  path: string
  name: string
  type: string
  size: number
  checksum: string
  supabaseId?: string
  createdAt?: string
}

export interface AttachmentQuota {
  usedBytes: number
  limitBytes: number
  used: string
  limit: string
  free: string
  percentUsed: number
}

export function useAttachmentUpload(orgId: string) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [quota, setQuota] = useState<AttachmentQuota | null>(null)

  const checkQuota = useCallback(async (): Promise<AttachmentQuota | null> => {
    try {
      const response = await fetch("/api/attachments/quota")
      if (!response.ok) throw new Error("Failed to fetch quota")
      const data = await response.json()
      setQuota(data)
      return data
    } catch (err) {
      console.error("Quota check failed:", err)
      return null
    }
  }, [])

  const upload = useCallback(
    async (
      file: File,
      module: AttachmentModule,
      moduleId: string
    ): Promise<StoredAttachment | null> => {
      const maxSizeBytes = 5 * 1024 * 1024 // 5 MB
      if (file.size === 0) {
        setError("That file is empty.")
        return null
      }
      if (file.size > maxSizeBytes) {
        setError(`Attachments must be under 5 MB.`)
        return null
      }

      // Check quota before upload
      if (quota && quota.limitBytes !== Infinity) {
        if (quota.usedBytes + file.size > quota.limitBytes) {
          setError(`Your organization has used ${quota.used} of its ${quota.limit} attachment storage, leaving ${quota.free}. Remove an old attachment or upgrade the plan to add this one.`)
          return null
        }
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
        setProgress(100)

        if (!response.ok) {
          throw new Error(data.error || "Upload failed")
        }

        // Refresh quota after successful upload
        await checkQuota()

        return data.attachment
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed")
        return null
      } finally {
        setUploading(false)
        setProgress(0)
      }
    },
    [quota, checkQuota]
  )

  const deleteAttachment = useCallback(
    async (attachmentId: string): Promise<boolean> => {
      setError(null)
      try {
        const response = await fetch(`/api/attachments/${attachmentId}`, {
          method: "DELETE",
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Delete failed")
        }

        // Refresh quota after successful delete
        await checkQuota()

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed")
        return false
      }
    },
    [checkQuota]
  )

  const listAttachments = useCallback(
    async (module: AttachmentModule, moduleId: string): Promise<StoredAttachment[]> => {
      try {
        const response = await fetch(`/api/attachments/list?module=${module}&moduleId=${moduleId}`)
        if (!response.ok) throw new Error("Failed to list attachments")
        const data = await response.json()
        return data.attachments || []
      } catch (err) {
        console.error("List attachments failed:", err)
        return []
      }
    },
    []
  )

  const getSignedUrl = useCallback(
    async (attachmentId: string, download = false): Promise<string | null> => {
      try {
        const response = await fetch(`/api/attachments/${attachmentId}${download ? "?download=true" : ""}`)
        if (!response.ok) throw new Error("Failed to get signed URL")
        const data = await response.json()
        return data.signedUrl || null
      } catch (err) {
        console.error("Get signed URL failed:", err)
        return null
      }
    },
    []
  )

  return {
    upload,
    deleteAttachment,
    listAttachments,
    getSignedUrl,
    checkQuota,
    uploading,
    progress,
    error,
    quota,
    clearError: () => setError(null),
  }
}