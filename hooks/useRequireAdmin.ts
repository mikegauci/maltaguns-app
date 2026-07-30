'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

type DenyPreset = 'home-toast' | 'admin-toast' | 'admin-silent'

type RequireAdminOptions = {
  preset?: DenyPreset
}

const PRESETS: Record<
  DenyPreset,
  {
    authMethod: 'getUser' | 'getSession'
    unauthenticatedTo: string
    unauthorizedTo: string
    toast:
      | false
      | {
          title: string
          description: string
        }
  }
> = {
  'home-toast': {
    authMethod: 'getUser',
    unauthenticatedTo: '/',
    unauthorizedTo: '/',
    toast: {
      title: 'Access Denied',
      description: 'You must be an admin to view this page',
    },
  },
  'admin-toast': {
    authMethod: 'getSession',
    unauthenticatedTo: '/login',
    unauthorizedTo: '/admin',
    toast: {
      title: 'Unauthorized',
      description: "You don't have permission to access this page.",
    },
  },
  'admin-silent': {
    authMethod: 'getSession',
    unauthenticatedTo: '/login',
    unauthorizedTo: '/admin',
    toast: false,
  },
}

export function useRequireAdmin(options?: RequireAdminOptions) {
  const preset = options?.preset ?? 'admin-toast'
  const config = PRESETS[preset]
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      try {
        let userId: string | undefined

        if (config.authMethod === 'getUser') {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          userId = user?.id
          if (!userId) {
            if (config.toast) {
              toast({
                variant: 'destructive',
                title: config.toast.title,
                description: config.toast.description,
              })
            }
            router.push(config.unauthenticatedTo)
            return
          }
        } else {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession()
          if (error || !session) {
            router.push(config.unauthenticatedTo)
            return
          }
          userId = session.user.id
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userId)
          .single()

        if (profileError || !profile?.is_admin) {
          if (config.toast) {
            toast({
              variant: 'destructive',
              title: config.toast.title,
              description: config.toast.description,
            })
          }
          router.push(config.unauthorizedTo)
          return
        }

        if (mounted) {
          setIsAuthorized(true)
        }
      } catch (error) {
        console.error('Admin auth error:', error)
        router.push(config.unauthenticatedTo)
      } finally {
        if (mounted) {
          setIsChecking(false)
        }
      }
    }

    void checkAuth()

    return () => {
      mounted = false
    }
  }, [
    config.authMethod,
    config.toast,
    config.unauthenticatedTo,
    config.unauthorizedTo,
    router,
    supabase,
    toast,
  ])

  return { isAuthorized, isChecking }
}
