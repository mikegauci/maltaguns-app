'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { PageLayout } from '@/components/ui/page-layout'
import { adminPasswordSchema } from '@/lib/admin-password-policy'

const defaultResetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const adminResetPasswordSchema = z
  .object({
    password: adminPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetPasswordForm = z.infer<typeof defaultResetPasswordSchema>

function ResetPasswordFormFields({
  isAdminUser,
  onSuccess,
}: {
  isAdminUser: boolean
  onSuccess: (nextStep: string) => void
}) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { supabase } = useSupabase()

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(
      isAdminUser ? adminResetPasswordSchema : defaultResetPasswordSchema
    ),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: ResetPasswordForm) {
    try {
      setIsLoading(true)
      setError(null)

      if (isAdminUser) {
        const response = await fetch('/api/admin/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: data.password }),
        })

        const responseData = await response.json()
        if (!response.ok) {
          throw new Error(responseData.error || 'Failed to reset password')
        }

        toast({
          title: 'Password updated',
          description: 'Your password has been reset successfully.',
        })

        onSuccess(responseData.nextStep || '/admin/security/mfa')
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) throw error

      toast({
        title: 'Password updated',
        description: 'Your password has been reset successfully.',
      })

      onSuccess('/profile')
    } catch (error) {
      console.error('Reset password error:', error)
      setError(
        error instanceof Error ? error.message : 'Failed to reset password'
      )
      setIsLoading(false)
    }
  }

  if (error) {
    return <div className="text-sm text-destructive mb-4">{error}</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your new password"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating password...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>
      </form>
    </Form>
  )
}

export default function ResetPassword() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidatingLink, setIsValidatingLink] = useState(true)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [redirectTarget, setRedirectTarget] = useState('/profile')
  const { supabase } = useSupabase()

  useEffect(() => {
    const handleRecoveryToken = async () => {
      setIsValidatingLink(true)
      try {
        const url = new URL(window.location.href)
        const accessToken = url.searchParams.get('access_token')
        const refreshToken = url.searchParams.get('refresh_token')
        const type = url.searchParams.get('type')

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (setSessionError) {
            console.error('Error setting session:', setSessionError)
            setError(
              'The password reset link is invalid or has expired. Please request a new one.'
            )
            setIsValidatingLink(false)
            return
          }
        } else if (type !== 'recovery') {
          setError(
            'The password reset link is invalid or has expired. Please request a new one.'
          )
          setIsValidatingLink(false)
          return
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error('No valid authenticated user found:', userError)
          setError(
            'The password reset link is invalid or has expired. Please request a new one.'
          )
          setIsValidatingLink(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        setIsAdminUser(Boolean(profile?.is_admin))
        setIsValidatingLink(false)
      } catch (error) {
        console.error('Error validating recovery token:', error)
        setError(
          'There was an error processing your request. Please try again.'
        )
        setIsValidatingLink(false)
      }
    }

    handleRecoveryToken()
  }, [supabase])

  function handleResetSuccess(nextStep: string) {
    setRedirectTarget(nextStep)
    setSuccess(true)
    setTimeout(() => {
      router.push(nextStep)
    }, 3000)
  }

  if (success) {
    return (
      <PageLayout>
        <Card className="mx-auto w-full max-w-md rounded-sm border-border shadow-none">
          <CardHeader>
            <CardTitle className="app-display uppercase tracking-tight">
              Password Reset Complete
            </CardTitle>
            <CardDescription>
              Your password has been successfully reset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                You will be redirected shortly. If you are not redirected,
                please click the button below.
              </p>
              <Button
                variant="default"
                onClick={() => router.push(redirectTarget)}
                className="w-full"
              >
                {isAdminUser ? 'Continue to admin setup' : 'Go to Profile'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Card className="mx-auto w-full max-w-md rounded-sm border-border shadow-none">
        <CardHeader>
          <CardTitle className="app-display uppercase tracking-tight">
            Reset Your Password
          </CardTitle>
          <CardDescription>
            {isAdminUser
              ? 'Admin passwords must be at least 12 characters with letters and numbers.'
              : 'Enter your new password below'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isValidatingLink ? (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Validating your reset link...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col gap-4">
              <div className="text-sm text-destructive mb-4">{error}</div>
              <BackButton
                label="Back to Login"
                href="/login"
                preferHref
                hideLabelOnMobile={false}
              />
            </div>
          ) : (
            <ResetPasswordFormFields
              key={isAdminUser ? 'admin-reset' : 'user-reset'}
              isAdminUser={isAdminUser}
              onSuccess={handleResetSuccess}
            />
          )}
        </CardContent>
      </Card>
    </PageLayout>
  )
}
