"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export default function ResetPassword() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidatingLink, setIsValidatingLink] = useState(true)
  const supabase = createClientComponentClient()

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  })

  // Check if the user is in recovery mode
  useEffect(() => {
    const handleRecoveryToken = async () => {
      setIsValidatingLink(true)
      try {
        // Get the URL parameters
        const url = new URL(window.location.href)
        const accessToken = url.searchParams.get('access_token')
        const refreshToken = url.searchParams.get('refresh_token')
        const type = url.searchParams.get('type')
        
        // If we have tokens directly in the URL (from the redirect)
        if ((accessToken && refreshToken) || type === 'recovery') {
          // We already have a valid session, the Supabase client will handle it
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Session error:', error)
            setError("There was an error validating your reset link. Please try again.")
            setIsValidatingLink(false)
            return
          }
          
          if (!data.session) {
            console.log('No session found, but we have tokens in URL')
            // If no session but we have tokens, try to set the session manually
            if (accessToken && refreshToken) {
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              })
              
              if (setSessionError) {
                console.error('Error setting session:', setSessionError)
                setError("The password reset link is invalid or has expired. Please request a new one.")
                setIsValidatingLink(false)
                return
              }
            } else {
              setError("The password reset link is invalid or has expired. Please request a new one.")
              setIsValidatingLink(false)
              return
            }
          }
          
          // Session is valid, user can reset password
          setIsValidatingLink(false)
        } else {
          // Check if we have a valid session anyway (for other flow types)
          const { data, error } = await supabase.auth.getSession()
          
          if (error || !data.session) {
            console.error('No valid session found:', error)
            setError("The password reset link is invalid or has expired. Please request a new one.")
            setIsValidatingLink(false)
            return
          }
          
          setIsValidatingLink(false)
        }
      } catch (error) {
        console.error('Error validating recovery token:', error)
        setError("There was an error processing your request. Please try again.")
        setIsValidatingLink(false)
      }
    }
    
    handleRecoveryToken()
  }, [supabase.auth])

  async function onSubmit(data: ResetPasswordForm) {
    try {
      setIsLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })
      
      if (error) throw error
      
      setSuccess(true)
      toast({
        title: "Password updated",
        description: "Your password has been reset successfully.",
      })
      
      // Delay navigation to allow the user to see the success message
      setTimeout(() => {
        router.push('/profile')
      }, 3000)
      
    } catch (error) {
      console.error('Reset password error:', error)
      setError(error instanceof Error ? error.message : "Failed to reset password")
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Password Reset Complete</CardTitle>
            <CardDescription>
              Your password has been successfully reset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                You will be redirected to your profile shortly. If you are not redirected, please click the button below.
              </p>
              <Button 
                variant="default" 
                onClick={() => router.push('/profile')}
                className="w-full"
              >
                Go to Profile
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
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isValidatingLink ? (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Validating your reset link...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col gap-4">
              <div className="text-sm text-destructive mb-4">
                {error}
              </div>
              <Button 
                variant="default" 
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your new password" {...field} />
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
                        <Input type="password" placeholder="Confirm your new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 