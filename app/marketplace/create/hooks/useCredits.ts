import { useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export function useCredits() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [credits, setCredits] = useState<number>(0)
  const [hasCredits, setHasCredits] = useState(true)

  const checkCredits = useCallback(
    async (isRetailer: boolean) => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          router.push('/login')
          return
        }

        if (!session) {
          console.log('No session found')
          router.push('/login')
          return
        }

        // Get user credits
        const { data: creditsData, error: creditsError } = await supabase
          .from('credits')
          .select('amount')
          .eq('user_id', session.user.id)
          .single()

        if (creditsError && creditsError.code !== 'PGRST116') {
          console.error('Error fetching credits:', creditsError)
        }

        const currentCredits = creditsData?.amount || 0
        setCredits(currentCredits)
        setHasCredits(currentCredits > 0 || isRetailer)

        return currentCredits
      } catch (error) {
        console.error('Error in checkCredits:', error)
        return 0
      }
    },
    [router, supabase]
  )

  return { credits, setCredits, hasCredits, setHasCredits, checkCredits }
}
