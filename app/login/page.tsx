'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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
import { Loader2, LogOut, User, Eye, EyeOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { forceLogout } from '@/lib/auth-utils'
import { useLoginAuth } from './hooks/useLoginAuth'
import { handleLogin, handlePasswordReset } from './handlers/loginHandlers'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
})

const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type LoginForm = z.infer<typeof loginSchema>
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export default function Login() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  
  // Custom hook for auth state management
  const { isAuthenticated, userEmail, isDisabled, error, setError, setIsDisabled } =
    useLoginAuth(supabase)

  // Local state
  const [isLoading, setIsLoading] = useState(false)
  const [isResetLoading, setIsResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  })

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  async function onSubmit(data: LoginForm) {
    try {
      setIsLoading(true)
      setError(null)

      await handleLogin({
        identifier: data.identifier,
        password: data.password,
        supabase,
        router,
        setIsDisabled,
      })
    } catch (error) {
      console.error('Login error:', error)
      setError(error instanceof Error ? error.message : 'Invalid credentials')
      setIsLoading(false)
    }
  }

  async function onResetPassword(data: ResetPasswordForm) {
    try {
      setIsResetLoading(true)
      setResetError(null)

      await handlePasswordReset({
        email: data.email,
        supabase,
        toast,
        onSuccess: () => {
          setResetDialogOpen(false)
          resetForm.reset()
        },
      })
    } catch (error) {
      console.error('Reset password error:', error)
      setResetError(
        error instanceof Error ? error.message : 'Failed to send reset email'
      )
    } finally {
      setIsResetLoading(false)
    }
  }

  if (isAuthenticated && !isDisabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Already Logged In</CardTitle>
            <CardDescription>
              You are currently logged in as {userEmail}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Button
                variant="default"
                onClick={() => router.push('/profile')}
                className="w-full"
              >
                <User className="mr-2 h-4 w-4" />
                Go to My Profile
              </Button>

              <Button
                variant="destructive"
                onClick={forceLogout}
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle the disabled account case
  if (isDisabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive text-center">
              Account Suspended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-md text-center bg-destructive/10 border border-destructive text-destructive mb-4 font-medium">
                <p>
                  Your account has been suspended. If you believe this is an
                  error, please contact our{' '}
                  <a
                    href="mailto:support@maltaguns.com"
                    className="text-primary hover:underline"
                  >
                    support team
                  </a>
                </p>
              </div>

              <Button
                variant="destructive"
                onClick={forceLogout}
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Return to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in to your MaltaGuns account</CardDescription>
        </CardHeader>
        <CardContent>
          {error && !isDisabled && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive mb-4">
              {error}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username or Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your username or email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
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

              <div className="text-sm text-right">
                <button
                  type="button"
                  onClick={() => setResetDialogOpen(true)}
                  className="text-primary hover:underline focus:outline-none"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your
              password.
            </DialogDescription>
          </DialogHeader>
          <Form {...resetForm}>
            <form
              onSubmit={resetForm.handleSubmit(onResetPassword)}
              className="space-y-4"
            >
              <FormField
                control={resetForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your email address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {resetError && (
                <div className="text-sm text-destructive">{resetError}</div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isResetLoading}>
                  {isResetLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
