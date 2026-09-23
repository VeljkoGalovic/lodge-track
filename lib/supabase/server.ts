import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client with service role key.
 * Use this for all server-side storage operations (upload, delete, signed URLs).
 * The service role bypasses RLS, so tenant isolation must be enforced in application code.
 */
export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// Singleton instance for reuse
let _serverClient: ReturnType<typeof createSupabaseServerClient> | null = null

export function getSupabaseServerClient() {
  if (!_serverClient) {
    _serverClient = createSupabaseServerClient()
  }
  return _serverClient
}