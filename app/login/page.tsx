"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

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
      
      // Check if the identifier is an email
      const isEmail = data.identifier.includes('@')
      
      let authResponse
      
      if (isEmail) {
        // Sign in with email
        authResponse = await supabase.auth.signInWithPassword({
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
        authResponse = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: data.password,
        })
      }
      
      const { data: { user }, error } = authResponse

      if (error) throw error

      // Check if email is verified
      if (!user?.email_confirmed_at) {
        // Sign out the user if email is not verified
        await supabase.auth.signOut()
        
        // Get email for verification (different depending on login method)
        const emailToVerify = isEmail ? data.identifier : (user?.email || data.identifier)

        // Send another verification email
        await supabase.auth.resend({
          type: 'signup',
          email: emailToVerify,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        })

        toast({
          variant: "destructive",
          title: "Email not verified",
          description: "Please check your email to verify your account. A new verification email has been sent.",
        })
        return
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      })

      router.push("/")
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
      })
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
    </div>
  )
}