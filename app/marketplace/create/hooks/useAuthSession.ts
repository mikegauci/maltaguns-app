import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function useAuthSession() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isRetailer, setIsRetailer] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkSession() {
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

        // Validate session expiry
        const sessionExpiry = new Date(session.expires_at! * 1000)
        const now = new Date()
        const timeUntilExpiry = sessionExpiry.getTime() - now.getTime()
        const isNearExpiry = timeUntilExpiry < 5 * 60 * 1000 // 5 minutes

        if (isNearExpiry) {
          const {
            data: { session: refreshedSession },
            error: refreshError,
          } = await supabase.auth.refreshSession()

          if (refreshError || !refreshedSession) {
            console.error('Session refresh failed:', refreshError)
            router.push('/login')
            return
          }
        }

        if (mounted) {
          setUserId(session.user.id)

          // Check if user is a retailer
          const { data: retailerData, error: retailerError } = await supabase
            .from('stores')
            .select('id')
            .eq('owner_id', session.user.id)
            .limit(1)

          if (retailerError) {
            console.error('Error checking store status:', retailerError)
          }

          setIsRetailer(!!retailerData?.[0])
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error in checkSession:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkSession()

    return () => {
      mounted = false
    }
  }, [router, supabase])

  return { isLoading, userId, isRetailer }
}
