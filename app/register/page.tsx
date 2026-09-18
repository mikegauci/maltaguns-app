'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/public'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, EyeOff } from 'lucide-react'
import { PageLayout } from '@/components/ui/page-layout'
import { Progress } from '@/components/ui/progress'

function isValidPhone(value: string) {
  const digits = value.replace(/[\s()+-]/g, '')
  return /^\d{7,15}$/.test(digits)
}

const step1Fields = [
  'username',
  'first_name',
  'last_name',
  'email',
  'password',
  'confirmPassword',
  'birthday',
  'phone',
  'address',
] as const

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters')
      .refine(value => !value.includes('@') && !value.includes('.'), {
        message: "Username cannot contain '@' or '.' characters",
      }),
    email: z.string().email('Invalid email address'),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    birthday: z.string().refine(
      value => {
        const date = new Date(value)
        const today = new Date()
        const minAgeDate = new Date(today)
        minAgeDate.setFullYear(today.getFullYear() - 18)
        return date <= minAgeDate
      },
      {
        message: 'You must be at least 18 years old',
      }
    ),
    phone: z.string().refine(isValidPhone, 'Invalid phone number format'),
    address: z
      .string()
      .min(5, 'Address must be at least 5 characters')
      .max(200, 'Address must not exceed 200 characters'),
    contactPreference: z.enum(['email', 'phone', 'both']).default('both'),
    acceptArticleEmails: z.boolean().default(false),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterForm = z.infer<typeof registerSchema>

const REGISTER_DRAFT_KEY = 'maltaguns-register-draft'

const registerDefaultValues: RegisterForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  confirmPassword: '',
  birthday: '',
  phone: '',
  address: '',
  contactPreference: 'both',
  acceptArticleEmails: false,
  acceptTerms: false,
}

export default function Register() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false)

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: registerDefaultValues,
  })

  useEffect(() => {
    let cancelled = false

    async function restoreDraft() {
      try {
        const raw = sessionStorage.getItem(REGISTER_DRAFT_KEY)
        if (raw) {
          const draft = JSON.parse(raw) as {
            step?: 1 | 2
            values?: Partial<RegisterForm>
          }
          if (draft.values) {
            const {
              password: _p,
              confirmPassword: _c,
              ...safeValues
            } = draft.values

            form.reset({
              ...registerDefaultValues,
              ...safeValues,
              password: '',
              confirmPassword: '',
            })
          }
          if (!cancelled) {
            setStep(1)
          }
        }
      } catch (error) {
        console.error('Failed to restore registration draft:', error)
      } finally {
        if (!cancelled) {
          setHasRestoredDraft(true)
        }
      }
    }

    void restoreDraft()
    return () => {
      cancelled = true
    }
  }, [form])

  useEffect(() => {
    if (!hasRestoredDraft) return

    const subscription = form.watch(values => {
      const {
        password: _password,
        confirmPassword: _confirm,
        ...draftValues
      } = values
      try {
        sessionStorage.setItem(
          REGISTER_DRAFT_KEY,
          JSON.stringify({
            step,
            values: draftValues,
          })
        )
      } catch (error) {
        console.error('Failed to save registration draft:', error)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, hasRestoredDraft, step])

  useEffect(() => {
    if (!hasRestoredDraft) return
    try {
      const raw = sessionStorage.getItem(REGISTER_DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      sessionStorage.setItem(
        REGISTER_DRAFT_KEY,
        JSON.stringify({ ...draft, step })
      )
    } catch (error) {
      console.error('Failed to save registration step:', error)
    }
  }, [step, hasRestoredDraft])

  async function handleContinue() {
    const valid = await form.trigger([...step1Fields])
    if (!valid) return

    setIsCheckingAvailability(true)
    try {
      const username = form.getValues('username').trim()
      const email = form.getValues('email').trim().toLowerCase()
      form.setValue('email', email)

      const [{ data: existingUsername }, { data: existingEmail }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('id')
            .ilike('email', email)
            .maybeSingle(),
        ])

      let hasConflict = false

      if (existingUsername) {
        form.setError('username', {
          type: 'manual',
          message: 'This username is already taken',
        })
        hasConflict = true
      }

      if (existingEmail) {
        form.setError('email', {
          type: 'manual',
          message: 'This email is already registered',
        })
        hasConflict = true
      }

      if (hasConflict) return

      setStep(2)
    } catch (error) {
      console.error('Availability check error:', error)
      toast({
        variant: 'destructive',
        title: 'Could not verify account details',
        description: 'Please try again.',
      })
    } finally {
      setIsCheckingAvailability(false)
    }
  }

  async function onSubmit(data: RegisterForm) {
    try {
      setIsLoading(true)

      // Submit to the server so the real client IP can be captured from
      // request headers and saved with the new profile.
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          email: data.email.trim().toLowerCase(),
          username: data.username.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Registration failed')
      }

      sessionStorage.removeItem(REGISTER_DRAFT_KEY)

      toast({
        title: 'Registration successful!',
        description:
          'Please check your email to verify your account. You will be redirected to the login page after verification.',
      })

      router.push('/login')
    } catch (error) {
      console.error('Registration error:', error)
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageLayout>
      <Card className="w-full max-w-md md:max-w-2xl mx-auto [&_label.text-sm]:!text-foreground">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>
            {step === 1
              ? 'Step 1 of 2 — Profile details'
              : 'Step 2 of 2 — Preferences'}
          </CardDescription>
          <Progress
            value={step === 1 ? 50 : 100}
            className="h-2 mt-2 [&>div]:bg-[#4CAF50]"
          />
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={
                step === 2
                  ? form.handleSubmit(onSubmit)
                  : e => {
                      e.preventDefault()
                      void handleContinue()
                    }
              }
              className="space-y-4"
            >
              {step === 1 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="johndoe"
                              {...field}
                              onChange={e => {
                                field.onChange(e)
                                form.trigger('username')
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              {...field}
                              onChange={e => {
                                field.onChange(e)
                                form.trigger('email')
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              {...field}
                              onChange={e => {
                                field.onChange(e)
                                form.trigger('first_name')
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              {...field}
                              onChange={e => {
                                field.onChange(e)
                                form.trigger('last_name')
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                {...field}
                                onChange={e => {
                                  field.onChange(e)
                                  form.trigger('password')
                                  if (form.getValues('confirmPassword')) {
                                    form.trigger('confirmPassword')
                                  }
                                }}
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
                                {...field}
                                onChange={e => {
                                  field.onChange(e)
                                  form.trigger('confirmPassword')
                                }}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="birthday"
                      render={({ field }) => {
                        const today = new Date()
                        const maxDate = new Date(today)
                        maxDate.setFullYear(today.getFullYear() - 18)

                        const minDate = new Date(today)
                        minDate.setFullYear(today.getFullYear() - 100)

                        return (
                          <FormItem>
                            <FormLabel>Birthday</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                max={maxDate.toISOString().split('T')[0]}
                                min={minDate.toISOString().split('T')[0]}
                                {...field}
                                onChange={e => {
                                  field.onChange(e)
                                  form.trigger('birthday')
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+356 1234 5678"
                              {...field}
                              onChange={e => {
                                field.onChange(e)
                                form.trigger('phone')
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123 Main St, Valletta"
                            {...field}
                            onChange={e => {
                              field.onChange(e)
                              form.trigger('address')
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="contactPreference"
                    render={({ field }) => (
                      <FormItem className="border p-4 rounded-md">
                        <FormLabel className="font-medium">
                          Contact Preference
                        </FormLabel>
                        <FormDescription>
                          Choose which contact information will be visible to
                          others
                        </FormDescription>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select your contact preference" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email">Email only</SelectItem>
                            <SelectItem value="phone">
                              Phone number only
                            </SelectItem>
                            <SelectItem value="both">
                              Both email and phone
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="acceptArticleEmails"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Notify me about new articles by email
                          </FormLabel>
                          <FormDescription>
                            Optional. Unsubscribe anytime. New articles always
                            show in your notifications.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="rounded-md border p-4 space-y-2">
                        <div className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            I agree to the{' '}
                            <Link
                              href="/terms"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline hover:no-underline"
                            >
                              Terms and Conditions
                            </Link>
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {step === 1 ? (
                <Button
                  type="button"
                  className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white font-semibold py-6 rounded-lg"
                  onClick={handleContinue}
                  disabled={isCheckingAvailability}
                >
                  {isCheckingAvailability ? 'Checking...' : 'Continue'}
                </Button>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto font-semibold py-6 rounded-lg"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="w-full flex-1 bg-[#4CAF50] hover:bg-[#45a049] text-white font-semibold py-6 rounded-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </Button>
                </div>
              )}

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
