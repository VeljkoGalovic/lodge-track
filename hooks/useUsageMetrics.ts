"use client"

import { useQuery } from "@tanstack/react-query"
import { OrgUsageMetrics } from "@/lib/usage-metrics"

async function fetchUsageMetrics(): Promise<OrgUsageMetrics> {
  const response = await fetch("/api/v1/usage")
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || "Failed to fetch usage metrics")
  }
  return response.json()
}

export function useUsageMetrics() {
  return useQuery({
    queryKey: ["usage-metrics"],
    queryFn: fetchUsageMetrics,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })
}