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
import { supabase } from '@/lib/supabase'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info, Eye, EyeOff } from 'lucide-react'
import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { verifyLicenseImage } from '@/utils/license-verification'
import { useClickableTooltip } from '@/hooks/useClickableTooltip'
import heic2any from 'heic2any'

const phoneRegex = /^(356|)(\d{8})$/

/**
 * Converts HEIC/HEIF images to JPEG for browser compatibility
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || 
                 file.name.toLowerCase().endsWith('.heic') || 
                 file.name.toLowerCase().endsWith('.heif')
  
  if (!isHeic) {
    return file // Return original file if not HEIC
  }

  try {
    console.log('Converting HEIC image to JPEG...')
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    })

    // heic2any can return Blob or Blob[], handle both cases
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob
    
    // Create a new File from the converted Blob
    const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
    const convertedFile = new File([blob], newFileName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
    
    console.log(`✓ Converted ${file.name} to ${newFileName}`)
    return convertedFile
  } catch (error) {
    console.error('Error converting HEIC to JPEG:', error)
    throw new Error('Failed to convert HEIC image. Please try a JPEG or PNG instead.')
  }
}

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
    phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
    address: z.string().min(5, 'Address must be at least 5 characters'),
    interestedInSelling: z.boolean().default(false),
    licenseTypes: z.object({
      tslA: z.boolean().default(false),
      tslASpecial: z.boolean().default(false),
      tslB: z.boolean().default(false),
      hunting: z.boolean().default(false),
      collectorsA: z.boolean().default(false),
      collectorsASpecial: z.boolean().default(false),
    }).optional(),
    idCardImage: z.any().optional(),
    licenseImage: z.any().optional(),
    isVerified: z.boolean().default(false),
    contactPreference: z.enum(['email', 'phone', 'both']).default('both'),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    data =>
      !data.interestedInSelling ||
      (data.interestedInSelling && data.idCardImage && data.licenseImage),
    {
      message: 'ID card and license images are required for sellers',
      path: ['licenseImage'],
    }
  )

type RegisterForm = z.infer<typeof registerSchema>

export default function Register() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingLicense, setUploadingLicense] = useState(false)
  const [uploadingIdCard, setUploadingIdCard] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { isOpen, triggerProps, contentProps } = useClickableTooltip()

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      confirmPassword: '',
      birthday: '',
      phone: '',
      address: '',
      interestedInSelling: false,
      licenseTypes: {
        tslA: false,
        tslASpecial: false,
        tslB: false,
        hunting: false,
        collectorsA: false,
        collectorsASpecial: false,
      },
      contactPreference: 'both',
      acceptTerms: false,
    },
  })

  const watchInterestedInSelling = form.watch('interestedInSelling')

  async function handleLicenseUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    try {
      const originalFile = event.target.files?.[0]
      if (!originalFile) return

      setUploadingLicense(true)

      // Accept common image formats including HEIC/HEIF from iPhones
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']
      const isValidImage = validImageTypes.some(type => originalFile.type.toLowerCase().includes(type.split('/')[1]))
      
      if (!originalFile.type.startsWith('image/') && !isValidImage) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please upload an image file (JPEG, PNG, or HEIC).',
        })
        return
      }

      if (originalFile.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'License image must be under 5MB.',
        })
        return
      }

      // Convert HEIC to JPEG if needed (for browser compatibility)
      const file = await convertHeicToJpeg(originalFile)

      // Get current form values for name verification
      const formValues = form.getValues()
      const userFirstName = formValues.first_name
      const userLastName = formValues.last_name

      // Verify the license image using OCR - this now includes auto-rotation, name verification, and license type detection
      const {
        isVerified,
        isExpired,
        expiryDate,
        text,
        orientation,
        rotationAngle,
        correctedImageUrl,
        nameMatch,
        extractedName,
        nameMatchDetails,
        licenseTypes,
      } = await verifyLicenseImage(file, userFirstName, userLastName)

      // Check for verification issues - continue with upload but mark as not verified
      const hasNameMismatch = userFirstName && userLastName && !nameMatch
      const hasVerificationIssues = isExpired || hasNameMismatch

      // Build combined warning message if there are issues
      if (hasVerificationIssues) {
        const issues: string[] = []

        if (isExpired && expiryDate) {
          issues.push(`• License expired on ${expiryDate}`)
        } else if (isExpired) {
          issues.push(`• License appears to be expired`)
        }

        if (hasNameMismatch && nameMatchDetails) {
          issues.push(
            `• Name mismatch: License shows "${nameMatchDetails.licenseName}" but profile shows "${nameMatchDetails.profileName}"`
          )
        } else if (hasNameMismatch) {
          issues.push(
            `• Name on license does not match profile${extractedName ? `: ${extractedName}` : ''}`
          )
        }

        toast({
          title: 'License uploaded - manual verification required',
          description:
            issues.length > 0 ? (
              <div className="space-y-2">
                {issues.map((issue, index) => (
                  <div key={index}>{issue}</div>
                ))}
                <div className="mt-3">
                  Your license will require manual verification. You may still
                  proceed to register.
                </div>
              </div>
            ) : (
              'Your license will require manual verification. You may still proceed to register.'
            ),
          className: 'bg-amber-100 text-amber-800 border-amber-200',
        })
      }

      // If the orientation is still problematic after auto-rotation, warn the user
      if (orientation === 'rotated') {
        toast({
          title: 'Image may be difficult to read',
          description:
            'The system had trouble reading your license clearly, but has attempted to correct its orientation automatically.',
          className: 'bg-amber-100 text-amber-800 border-amber-200',
        })
        // Continue with upload - don't block it
      }

      // Use the corrected image URL if available
      const imageToUpload = correctedImageUrl
        ? await urlToFile(correctedImageUrl, `rotated-${file.name}`, file.type)
        : file

      const fileExt = file.name.split('.').pop()
      const fileName = `license-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`
      const filePath = `licenses/${fileName}`

      const { data, error } = await supabase.storage
        .from('licenses')
        .upload(filePath, imageToUpload, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from('licenses')
        .getPublicUrl(filePath)

      form.setValue('licenseImage', publicUrlData.publicUrl)
      // Store verification status to use during registration
      form.setValue('isVerified', isVerified)
      // Auto-populate detected license types
      form.setValue('licenseTypes', licenseTypes)

      // Show success toast only if no issues were found
      if (!hasVerificationIssues) {
        // Build detected license types message
        const detectedLicenses = []
        if (licenseTypes.tslA) detectedLicenses.push('TSL-A')
        if (licenseTypes.tslASpecial) detectedLicenses.push('TSL-A (special)')
        if (licenseTypes.tslB) detectedLicenses.push('TSL-B')
        if (licenseTypes.hunting) detectedLicenses.push('Hunting')
        if (licenseTypes.collectorsA) detectedLicenses.push('Collectors-A')
        if (licenseTypes.collectorsASpecial) detectedLicenses.push('Collectors-A (special)')

        const licensesMessage = detectedLicenses.length > 0 
          ? `Detected licenses: ${detectedLicenses.join(', ')}`
          : 'No license types detected. Please contact support.'

        if (isVerified) {
          toast({
            title: 'License uploaded and verified',
            description: (
              <div>
                {expiryDate && <div>Valid until {expiryDate}.</div>}
                <div className="mt-1">{licensesMessage}</div>
              </div>
            ),
            className: 'bg-green-600 text-white border-green-600',
          })
        } else {
          toast({
            title: 'License uploaded',
            description: (
              <div>
                <div>Your license has been uploaded but could not be automatically verified.</div>
                <div className="mt-1">{licensesMessage}</div>
                <div className="mt-2">An administrator will review your license manually. You may still proceed to register your account.</div>
              </div>
            ),
            className: 'bg-amber-100 text-amber-800 border-amber-200',
          })
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload license.',
      })
    } finally {
      setUploadingLicense(false)
    }
  }

  async function handleIdCardUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    try {
      const originalFile = event.target.files?.[0]
      if (!originalFile) return

      setUploadingIdCard(true)

      // Accept common image formats including HEIC/HEIF from iPhones
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']
      const isValidImage = validImageTypes.some(type => originalFile.type.toLowerCase().includes(type.split('/')[1]))
      
      if (!originalFile.type.startsWith('image/') && !isValidImage) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please upload an image file (JPEG, PNG, or HEIC).',
        })
        return
      }

      if (originalFile.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'ID card image must be under 5MB.',
        })
        return
      }

      // Convert HEIC to JPEG if needed (for browser compatibility)
      const file = await convertHeicToJpeg(originalFile)

      const fileExt = file.name.split('.').pop()
      const fileName = `id-card-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`
      const filePath = `id-cards/${fileName}`

      const { data, error } = await supabase.storage
        .from('licenses')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from('licenses')
        .getPublicUrl(filePath)

      form.setValue('idCardImage', publicUrlData.publicUrl)

      toast({
        title: 'ID card uploaded',
        description: 'Your ID card has been uploaded successfully.',
        className: 'bg-green-600 text-white border-green-600',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload ID card.',
      })
    } finally {
      setUploadingIdCard(false)
    }
  }

  /**
   * Converts a data URL to a File object
   * @param url The data URL to convert
   * @param filename The name for the new file
   * @param mimeType The MIME type of the file
   * @returns A Promise that resolves to a File object
   */
  async function urlToFile(
    url: string,
    filename: string,
    mimeType: string
  ): Promise<File> {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return new File([buf], filename, { type: mimeType })
  }

  async function onSubmit(data: RegisterForm) {
    try {
      setIsLoading(true)

      // Sign up the user with email confirmation required
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
          data: {
            username: data.username,
          },
        },
      })

      if (authError) throw authError

      const userId = authData?.user?.id
      if (!userId) throw new Error('User ID not found after signup.')

      // Create the user profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        birthday: data.birthday,
        phone: data.phone,
        address: data.address,
        is_seller: data.interestedInSelling,
        is_verified: data.isVerified,
        license_image: data.interestedInSelling ? data.licenseImage : null,
        id_card_image: data.interestedInSelling ? data.idCardImage : null,
        license_types: data.interestedInSelling ? data.licenseTypes : null,
        contact_preference: data.contactPreference,
      })

      if (profileError) throw profileError

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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Join the MaltaGuns community</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => {
                  // Calculate min and max dates
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

              {/* Contact Preference - shown for all users */}
              <FormField
                control={form.control}
                name="contactPreference"
                render={({ field }) => (
                  <FormItem className="border p-4 rounded-md">
                    <FormLabel className="font-medium">
                      Contact Preference
                    </FormLabel>
                    <FormDescription>
                      Choose which contact information will be visible to others
                    </FormDescription>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select your contact preference" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email only</SelectItem>
                        <SelectItem value="phone">Phone number only</SelectItem>
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
                name="interestedInSelling"
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
                        I&apos;m a licensed firearm owner
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {/* Only show license upload when checkbox is checked */}
              {watchInterestedInSelling && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">User Verification</h3>
                    <TooltipProvider>
                      <Tooltip open={isOpen}>
                        <TooltipTrigger asChild {...triggerProps}>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center p-1 -m-1 rounded hover:bg-accent transition-colors touch-manipulation"
                            aria-label="License verification information"
                          >
                            <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          className="w-[calc(100vw-32px)] max-w-[320px] sm:max-w-md p-3 sm:p-4 text-xs"
                          sideOffset={5}
                          align="center"
                          side="bottom"
                          {...contentProps}
                        >
                          <p>
                            Maltaguns requires users who wish to <strong>buy or sell</strong> firearms to verify their account. Verification documents are used solely to confirm you are licensed.
                          </p>
                          <p className="mt-2">
                            If you do not wish to verify at this stage or are not licensed, you may proceed by unselecting the box above. You can still verify your account later if you choose to.
                          </p>
                          <p className="mt-2">
                            For any questions or concerns regarding data processing or your privacy, please contact us at <Link href="mailto:support@maltaguns.com" className="text-primary hover:underline">support@maltaguns.com</Link>.
                          </p>
                          <p className="mt-2">
                            We are committed to safeguarding your privacy and ensuring the secure handling of your data. Your documents will be strictly reviewed for verification purposes only and will not be shared with any third parties or made accessible to anyone else. All data processing is conducted in full compliance with the General Data Protection Regulation (GDPR) and relevant Maltese legislation.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* ID Card Upload */}
                  <FormField
                    control={form.control}
                    name="idCardImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Card</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            {!field.value && (
                              <Button
                                type="button"
                                variant="default"
                                className="bg-black hover:bg-black/90 text-white w-fit flex items-center gap-2 rounded-xl"
                                onClick={() =>
                                  document
                                    .getElementById('id-card-upload')
                                    ?.click()
                                }
                                disabled={uploadingIdCard}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="w-5 h-5"
                                >
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                Upload ID Card
                              </Button>
                            )}
                            <Input
                              id="id-card-upload"
                              type="file"
                              accept="image/*,.heic,.heif"
                              onChange={handleIdCardUpload}
                              disabled={uploadingIdCard}
                              className="hidden"
                            />
                            <Input type="hidden" {...field} />
                            {uploadingIdCard && (
                              <p className="text-sm text-muted-foreground">
                                Uploading ID card...
                              </p>
                            )}
                            {field.value && (
                              <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-green-600">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="24"
                                      height="24"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="w-5 h-5"
                                    >
                                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                      <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                    <span className="font-medium">
                                      ID card uploaded successfully
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => {
                                      form.setValue('idCardImage', '')
                                      form.trigger('idCardImage')
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>

                                {/* ID Card Preview */}
                                <div className="space-y-2">
                                  <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                    <img
                                      id="id-card-preview"
                                      src={field.value}
                                      alt="Uploaded ID card"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* License Upload */}
                  <FormField
                    control={form.control}
                    name="licenseImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Firearms License</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            {!field.value && (
                              <Button
                                type="button"
                                variant="default"
                                className="bg-black hover:bg-black/90 text-white w-fit flex items-center gap-2 rounded-xl"
                                onClick={() =>
                                  document
                                    .getElementById('license-upload')
                                    ?.click()
                                }
                                disabled={uploadingLicense}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="w-5 h-5"
                                >
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                Upload License
                              </Button>
                            )}
                            <Input
                              id="license-upload"
                              type="file"
                              accept="image/*,.heic,.heif"
                              onChange={handleLicenseUpload}
                              disabled={uploadingLicense}
                              className="hidden"
                            />
                            <Input type="hidden" {...field} />
                            {uploadingLicense && (
                              <p className="text-sm text-muted-foreground">
                                Uploading license...
                              </p>
                            )}
                            {field.value && (
                              <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-green-600">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="24"
                                      height="24"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="w-5 h-5"
                                    >
                                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                      <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                    <span className="font-medium">
                                      License uploaded successfully
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => {
                                      form.setValue('licenseImage', '')
                                      form.trigger('licenseImage')
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>

                                {/* License Image Preview */}
                                <div className="space-y-2">
                                  <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                    <img
                                      id="license-preview"
                                      src={field.value}
                                      alt="Uploaded license"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="acceptTerms"
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
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white font-semibold py-6 rounded-lg"
                disabled={isLoading || uploadingLicense || uploadingIdCard}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>

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
    </div>
  )
}
