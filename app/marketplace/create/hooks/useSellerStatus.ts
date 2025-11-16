import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function useSellerStatus() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isSeller, setIsSeller] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkSellerStatus() {
      try {
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession()

        if (authError) {
          console.error('Auth error:', authError)
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

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_seller')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          throw profileError
        }

        if (mounted) {
          setIsSeller(profile?.is_seller || false)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error checking seller status:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkSellerStatus()

    return () => {
      mounted = false
    }
  }, [router, supabase])

  return { isLoading, isSeller }
}
