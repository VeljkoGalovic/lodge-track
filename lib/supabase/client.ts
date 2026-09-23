import { createClient } from '@supabase/supabase-js'

/**
 * Browser-safe Supabase client with anon key.
 * Use this for client-side operations that need to work with RLS policies
 * (e.g., generating signed URLs for direct browser download).
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

// Singleton instance for reuse
let _browserClient: ReturnType<typeof createSupabaseBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!_browserClient) {
    _browserClient = createSupabaseBrowserClient()
  }
  return _browserClient
}