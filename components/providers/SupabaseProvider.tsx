'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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

  useEffect(() => {
    let mounted = true

    const initializeSession = async () => {
      try {
        setIsLoading(true)
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting initial session:', error)
          if (mounted) {
            setSession(null)
          }
          return
        }

        if (mounted) {
          setSession(initialSession ?? null)
        }
      } catch (err) {
        console.error('Error in session initialization:', err)
        if (mounted) setSession(null)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    // Initialize session
    initializeSession()

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) setSession(newSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

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
