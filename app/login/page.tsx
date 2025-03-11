"use client"

import { useState } from "react"
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

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

interface DebugInfo {
  sessionAfterLogin?: any;
  [key: string]: any;
}

export default function Login() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({})
  const supabase = createClientComponentClient()

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  })

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
                      <Input {...field} />
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
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary hover:underline">
                  Register here
                </Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>

      {error && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Error</h3>
          <p className="mt-2 p-4 bg-red-100 rounded text-sm overflow-auto">
            {error}
          </p>
        </div>
      )}

      {debugInfo && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Debug Information</h3>
          <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}