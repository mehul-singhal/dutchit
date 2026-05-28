import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * React cache() deduplicates this call within a single server render tree.
 * Layout + page both call getAuthUser() but only one Supabase request fires.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
