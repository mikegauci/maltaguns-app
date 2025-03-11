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
import { Loader2, LogOut } from "lucide-react"

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

type DebugInfo = {
  sessionAfterLogin?: any
}

export default function Login() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({})
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsAuthenticated(true)
        setUserEmail(session.user.email || null)
      }
    }
    checkSession()
  }, [supabase.auth])

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  })

  async function handleLogout() {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account.",
      })

      router.push('/')
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to log out",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmit(data: LoginForm) {
    try {
      setIsLoading(true)
      setError(null)
      
      // Check if the identifier is an email
      const isEmail = data.identifier.includes('@')
      
      let signInResult
      
      if (isEmail) {
        // Sign in with email
        signInResult = await supabase.auth.signInWithPassword({
          email: data.identifier,
          password: data.password,
        })
      } else {
        // Get the email associated with the username
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', data.identifier)
          .single()
          
        if (userError || !userData) {
          throw new Error("Username not found")
        }
        
        // Sign in with the email associated with the username
        signInResult = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: data.password,
        })
      }
      
      if (signInResult.error) {
        setError(signInResult.error.message)
        return
      }

      // Verify session after login
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setDebugInfo(prev => ({
          ...prev,
          sessionAfterLogin: session
        }))
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        })

        // Get the redirect URL from query parameters
        const redirectTo = searchParams.get('redirectTo') || '/'
        
        router.push(redirectTo)
        router.refresh()
      } else {
        setError('Session not established after login')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  if (isAuthenticated) {
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
                variant="destructive" 
                onClick={handleLogout}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="w-full"
              >
                Go Back
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

              {error && (
                <div className="text-sm text-destructive">
                  {error}
                </div>
              )}

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
    </div>
  )
}