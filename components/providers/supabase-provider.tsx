'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import { Session, SupabaseClient } from '@supabase/supabase-js'

interface SupabaseContext {
  supabase: SupabaseClient
  session: Session | null
  isLoading: boolean
}

const Context = createContext<SupabaseContext | undefined>(undefined)

// Add timeout for session operations
const SESSION_TIMEOUT = 5000 // 5 seconds
const MAX_RETRIES = 3

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [supabase] = useState(() => createClientComponentClient())
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    let sessionCheckTimeout: NodeJS.Timeout

    async function initializeSession() {
      try {
        setIsLoading(true)
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          sessionCheckTimeout = setTimeout(
            () => reject(new Error('Session operation timed out')),
            SESSION_TIMEOUT
          )
        })

        // Get initial session with timeout
        const sessionPromise = supabase.auth.getSession()
        const {
          data: { session: initialSession },
          error,
        } = (await Promise.race([sessionPromise, timeoutPromise])) as Awaited<
          typeof sessionPromise
        >

        if (error) {
          console.error('Error getting initial session:', error)
          if (mounted) {
            setSession(null)
          }
          return
        }

        if (initialSession) {
          // Check if session needs refresh
          const sessionExpiry = new Date(initialSession.expires_at! * 1000)
          const now = new Date()
          const timeUntilExpiry = sessionExpiry.getTime() - now.getTime()
          const isNearExpiry = timeUntilExpiry < 5 * 60 * 1000 // 5 minutes

          if (isNearExpiry) {
            try {
              const refreshPromise = supabase.auth.refreshSession()
              const {
                data: { session: refreshedSession },
                error: refreshError,
              } = (await Promise.race([
                refreshPromise,
                timeoutPromise,
              ])) as Awaited<typeof refreshPromise>

              if (refreshError || !refreshedSession) {
                console.error('Error refreshing session:', refreshError)
                if (mounted) {
                  setSession(null)
                }
                return
              }

              // Set the refreshed session
              if (mounted) {
                await supabase.auth.setSession({
                  access_token: refreshedSession.access_token,
                  refresh_token: refreshedSession.refresh_token,
                })
                setSession(refreshedSession)
              }
            } catch (refreshError) {
              console.error('Error refreshing session:', refreshError)
              if (mounted) {
                setSession(null)
              }
            }
          } else {
            if (mounted) {
              setSession(initialSession)
            }
          }
        } else {
          if (mounted) {
            setSession(null)
          }
        }
      } catch (error) {
        console.error('Error in session initialization:', error)
        if (mounted) {
          setSession(null)
          // If we haven't exceeded max retries, try again
          if (retryCount < MAX_RETRIES) {
            setRetryCount(prev => prev + 1)
            setTimeout(initializeSession, 1000 * (retryCount + 1)) // Exponential backoff
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
        clearTimeout(sessionCheckTimeout)
      }
    }

    // Initialize session
    initializeSession()

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event, newSession?.user?.email)

      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setSession(null)
        }
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (newSession && mounted) {
          setSession(newSession)
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(sessionCheckTimeout)
      subscription.unsubscribe()
    }
  }, [supabase, router, retryCount])

  return (
    <Context.Provider value={{ supabase, session, isLoading }}>
      {children}
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider')
  }
  return context
}
