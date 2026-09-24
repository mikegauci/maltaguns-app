import { cache } from 'react'
import { supabase } from '@/lib/supabase/public'
import { loadPublishedHelpGuidePostIds } from '@/lib/help-guide-utils'

export const fetchHelpGuidePostIdsPublic = cache(
  async (): Promise<Set<string>> => {
    return loadPublishedHelpGuidePostIds(supabase)
  }
)
