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

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [supabase] = useState(() => createClientComponentClient())
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error)
          setSession(null)
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
              const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
              
              if (refreshError || !refreshedSession) {
                console.error('Error refreshing session:', refreshError)
                setSession(null)
                return
              }
              
              // Set the refreshed session
              await supabase.auth.setSession({
                access_token: refreshedSession.access_token,
                refresh_token: refreshedSession.refresh_token
              })
              setSession(refreshedSession)
            } catch (refreshError) {
              console.error('Error refreshing session:', refreshError)
              setSession(null)
            }
          } else {
            setSession(initialSession)
          }
        } else {
          setSession(null)
        }

      } catch (error) {
        console.error('Error in session initialization:', error)
        setSession(null)
      } finally {
        setIsLoading(false)
      }
    }

    // Initialize session
    initializeSession()

    // Set up auth state listener
    const { data: { subscription }} = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event, newSession?.user?.email)
      
      if (event === 'SIGNED_OUT') {
        setSession(null)
        router.push('/')
        router.refresh()
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (newSession) {
          await supabase.auth.setSession({
            access_token: newSession.access_token,
            refresh_token: newSession.refresh_token
          })
          setSession(newSession)
          router.refresh()
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

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