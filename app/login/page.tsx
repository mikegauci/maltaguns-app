"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, LogOut, User } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { forceLogout } from "@/lib/auth-utils"

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
})

const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type LoginForm = z.infer<typeof loginSchema>
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

interface DebugInfo {
  sessionAfterLogin?: any
}

export default function Login() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isResetLoading, setIsResetLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({})
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [isDisabled, setIsDisabled] = useState(false)
  const supabase = createClientComponentClient()

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  useEffect(() => {
    // Check for error message in URL params
    const errorMsg = searchParams.get('error')
    if (errorMsg) {
      setError(errorMsg)
      
      // If the error is about a disabled account, set the disabled flag
      if (errorMsg.includes('disabled')) {
        setIsDisabled(true)
        
        // Clear any existing session to avoid auth errors
        if (typeof window !== 'undefined') {
          // Clear session from localStorage to prevent auth errors
          localStorage.removeItem('supabase.auth.token')
          // Force immediate logout if account is disabled
          forceLogout()
        }
      }
    }
  }, [searchParams])

  useEffect(() => {
    let mounted = true
    
    async function checkSession() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          return
        }
        
        if (session) {
          // Check if this user's account is disabled by querying the profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('is_disabled')
            .eq('id', session.user.id)
            .single()
          
          if (profileError) {
            console.error('Error fetching profile:', profileError)
          }
          
          // If profile exists and is disabled, set disabled flag
          if (profileData && profileData.is_disabled === true) {
            setIsDisabled(true)
            setError("Your account has been disabled by an administrator")
            return
          }
          
          // Not disabled, proceed with normal authenticated flow
          if (mounted) {
            setIsAuthenticated(true)
            setUserEmail(session.user.email || null)
            
            // Check for saved redirect location first
            const savedRedirect = localStorage.getItem('redirectAfterLogin')
            if (savedRedirect) {
              console.log(`Auto-redirecting to saved location: ${savedRedirect}`)
              localStorage.removeItem('redirectAfterLogin')
              // Use replace instead of push to avoid adding to history
              router.replace(savedRedirect)
            } else {
              // Only redirect to home if explicitly requested or no redirect is specified
              const redirectTo = searchParams.get('redirectTo')
              if (redirectTo) {
                router.replace(redirectTo)
              }
              // Don't auto-redirect if there's no explicit direction
            }
          }
        }
      } catch (error) {
        console.error('Error checking session:', error)
      }
    }
    
    checkSession()
    
    return () => {
      mounted = false
    }
  }, [supabase.auth, router, searchParams, isDisabled])

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  })

  // Direct logout that doesn't get stuck in a loading state
  function handleLogout() {
    // Directly call forceLogout without waiting - prevents getting stuck
    forceLogout();
  }

  async function onSubmit(data: LoginForm) {
    try {
      setIsLoading(true)
      setError(null)
      
      // Check if the identifier is an email
      const isEmail = data.identifier.includes('@')
      let email = data.identifier
      
      if (!isEmail) {
        // Get the email associated with the username
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', data.identifier)
          .single()
          
        if (userError || !userData) {
          throw new Error("Username not found")
        }
        email = userData.email
      }
      
      // Check if the user's account is disabled before sign in
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_disabled')
        .eq('email', email)
        .single()
      
      if (!profileError && profileData && profileData.is_disabled === true) {
        setIsDisabled(true)
        throw new Error("Your account has been disabled by an administrator")
      }
      
      // Sign in with email
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: data.password,
      })
      
      if (error) {
        // Check if error message contains "disabled" and set the flag
        if (error.message.includes('disabled')) {
          setIsDisabled(true)
          // Just throw the error to display the message
          throw error
        }
        throw error
      }

      // Check if there's a redirect URL in localStorage (set by profile page)
      const redirectUrl = localStorage.getItem('redirectAfterLogin')
      
      // If there is a redirect URL, use it and clear the localStorage
      if (redirectUrl) {
        console.log(`Redirecting to saved location: ${redirectUrl}`)
        localStorage.removeItem('redirectAfterLogin')
        router.push(redirectUrl)
      } else {
        // Otherwise, redirect to profile page
        router.push('/profile')
      }
      
      router.refresh()

    } catch (error) {
      console.error('Login error:', error)
      setError(error instanceof Error ? error.message : "Invalid credentials")
      setIsLoading(false)
    }
  }

  async function handleResetPassword(data: ResetPasswordForm) {
    try {
      setIsResetLoading(true)
      setResetError(null)
      
      // Define the redirect URL for password reset
      const redirectTo = `${window.location.origin}/reset-password`
      console.log(`Setting password reset redirect to: ${redirectTo}`)
      
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectTo,
      })
      
      if (error) throw error
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password.",
      })
      
      setResetDialogOpen(false)
      resetForm.reset()
    } catch (error) {
      console.error('Reset password error:', error)
      setResetError(error instanceof Error ? error.message : "Failed to send reset email")
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
                onClick={handleLogout}
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
            <CardTitle className="text-destructive text-center">Account Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-md text-center bg-destructive/10 border border-destructive text-destructive mb-4 font-medium">
                <p>Your account has been suspended. If you believe this is an error, please contact our <a href="mailto:support@maltaguns.com" className="text-primary hover:underline">support team</a></p>
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
          <CardDescription>
            Sign in to your MaltaGuns account
          </CardDescription>
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
                      <Input placeholder="Enter your username or email" {...field} />
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
                      <Input type="password" placeholder="Enter your password" {...field} />
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

              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
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
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {resetError && (
                <div className="text-sm text-destructive">
                  {resetError}
                </div>
              )}

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setResetDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isResetLoading}
                >
                  {isResetLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
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