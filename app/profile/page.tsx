'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import {
  Shield,
  AlertCircle,
  Pencil,
  Upload,
  Package,
  Sun as Gun,
  Eye,
  Store,
  BookOpen,
  Trash2,
  RefreshCw,
  X,
  Info,
  ArrowLeft,
  CheckCircle,
  Mail,
  Phone,
  Star,
  Calendar,
  Plus,
  Users,
  Wrench,
  MapPin,
  CheckCircle2,
  BanIcon,
  ShoppingCart,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FeatureCreditDialog } from '@/components/feature-credit-dialog'
import { CreditDialog } from '@/components/credit-dialog'
import { EventCreditDialog } from '@/components/event-credit-dialog'
import { useSupabase } from '@/components/providers/supabase-provider'
import { LoadingState } from '@/components/ui/loading-state'
import Image from 'next/image'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { verifyLicenseImage } from '@/utils/license-verification'

type Profile = Database['public']['Tables']['profiles']['Row']

interface BlogPost {
  id: string
  title: string
  slug: string
  published: boolean
  created_at: string
}

interface Listing {
  id: string
  title: string
  type: 'firearms' | 'non_firearms'
  category: string
  price: number
  status: string
  created_at: string
  expires_at: string
  is_near_expiration?: boolean
  is_featured?: boolean
  days_until_expiration?: number
  featured_days_remaining?: number
  is_expired: boolean
}

interface Store {
  id: string
  business_name: string
  logo_url: string | null
  location: string
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  owner_id: string
  slug: string
}

interface Club extends Store {}
interface Servicing extends Store {}
interface Range extends Store {}

interface Event {
  id: string
  title: string
  description: string
  organizer: string
  type: string
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  location: string
  poster_url: string | null
  phone: string | null
  email: string | null
  price: number | null
  created_at: string
  slug: string | null
}

interface CreditTransaction {
  id: string
  amount: number
  type: 'credit' | 'debit'
  stripe_payment_id: string | null
  created_at: string
  credit_type: 'featured' | 'event' | null
  description: string | null
  status: string | null
}

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
})

type ProfileForm = z.infer<typeof profileSchema>

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-MT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

const StatusSelect = ({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) => {
  const [open, setOpen] = useState(false)

  const options = [
    { value: 'active', label: 'Active', icon: CheckCircle2 },
    { value: 'sold', label: 'Sold', icon: ShoppingCart },
    { value: 'inactive', label: 'Inactive', icon: BanIcon },
  ]

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full text-sm border rounded h-9 px-3 bg-white flex items-center sm:justify-start justify-center gap-2 cursor-pointer relative',
          className
        )}
      >
        {selectedOption && (
          <>
            <selectedOption.icon className="h-4 w-4" />
            {selectedOption.label}
          </>
        )}
        <svg
          className="h-4 w-4 sm:static sm:ml-2 absolute right-3"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50',
                  value === option.value && 'bg-gray-50'
                )}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <option.icon className="h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { supabase, session } = useSupabase()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [servicing, setServicing] = useState<Servicing[]>([])
  const [ranges, setRanges] = useState<Range[]>([])
  const [store, setStore] = useState<Store | null>(null)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [creditTransactions, setCreditTransactions] = useState<
    CreditTransaction[]
  >([])
  const [listingIdToTitleMap, setListingIdToTitleMap] = useState<
    Record<string, string>
  >({})
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingLicense, setUploadingLicense] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [listingToDelete, setListingToDelete] = useState<string | null>(null)
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null)
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false)
  const [listingToFeature, setListingToFeature] = useState<string | null>(null)
  const [removeFeatureDialogOpen, setRemoveFeatureDialogOpen] = useState(false)
  const [listingToRemoveFeature, setListingToRemoveFeature] = useState<
    string | null
  >(null)
  const [listingCredits, setListingCredits] = useState(0)
  const [eventCredits, setEventCredits] = useState(0)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [showEventCreditDialog, setShowEventCreditDialog] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [establishmentInfoOpen, setEstablishmentInfoOpen] = useState(false)

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      address: '',
    },
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        // Only load profile data if user is logged in
        if (session?.user) {
          setLoading(true)
          const userId = session.user.id
          console.log('Loading profile for user ID:', userId)

          // Fetch profile first
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

          if (profileError) {
            console.error('Profile fetch error:', profileError.message)
            throw profileError
          }

          // Set profile data immediately
          setProfile(profileData)
          form.reset({
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            phone: profileData.phone || '',
            address: profileData.address || '',
          })

          // Fetch user's listings
          const { data: listingsData, error: listingsError } = await supabase
            .from('listings')
            .select('*')
            .eq('seller_id', userId)
            .order('created_at', { ascending: false })

          if (listingsError) {
            console.error('Listings fetch error:', listingsError.message)
            // Continue even if there's an error
          }

          // Fetch featured listings data
          const { data: featuredListingsData, error: featuredListingsError } =
            await supabase
              .from('featured_listings')
              .select('*')
              .eq('user_id', userId)

          if (featuredListingsError) {
            console.error(
              'Featured listings fetch error:',
              featuredListingsError.message
            )
          }

          // Create a map of listing IDs to their featured end dates
          const featuredEndDates = new Map(
            (featuredListingsData || []).map(featured => [
              featured.listing_id,
              new Date(featured.end_date),
            ])
          )

          // Process listings to add feature status and expiration data
          const listingsWithFeatures = (listingsData || []).map(
            (listing: any) => {
              const now = new Date()
              const expirationDate = new Date(listing.expires_at)
              const featuredEndDate = featuredEndDates.get(listing.id)

              const diffTime = expirationDate.getTime() - now.getTime()
              const daysUntilExpiration = Math.ceil(
                diffTime / (1000 * 60 * 60 * 24)
              )

              let featuredDaysRemaining = 0
              if (featuredEndDate && featuredEndDate > now) {
                const featuredDiffTime =
                  featuredEndDate.getTime() - now.getTime()
                featuredDaysRemaining = Math.max(
                  0,
                  Math.ceil(featuredDiffTime / (1000 * 60 * 60 * 24))
                )
              }

              return {
                ...listing,
                is_featured: featuredEndDate ? featuredEndDate > now : false,
                days_until_expiration: daysUntilExpiration,
                featured_days_remaining: featuredDaysRemaining,
                is_near_expiration:
                  daysUntilExpiration <= 3 && daysUntilExpiration > 0,
                is_expired: daysUntilExpiration <= 0,
              }
            }
          )

          // Filter out expired listings as they'll be deleted soon
          const activeListings = listingsWithFeatures.filter(
            listing => !listing.is_expired
          )
          setListings(activeListings)

          // Fetch user's blog posts
          const { data: blogData, error: blogError } = await supabase
            .from('blog_posts')
            .select('id, title, slug, published, created_at')
            .eq('author_id', userId)
            .order('created_at', { ascending: false })

          if (blogError) {
            console.error('Blog posts fetch error:', blogError.message)
            // Continue even if there's an error
          }

          // Initialize store blog posts data collection

          // Fetch user's stores
          console.log('Fetching stores for user ID:', userId)
          const { data: storesData, error: storeError } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', userId)

          if (storeError) {
            console.error('Store fetch error:', storeError.message)
          } else if (storesData && storesData.length > 0) {
            console.log('Found stores:', storesData.length, storesData)

            // Store all stores
            setStores(storesData)

            // Also keep the first store in the single store state for backwards compatibility
            const currentStore = storesData[0]
            setStore(currentStore)

            // Check and fix slugs for all stores
            for (const store of storesData) {
              if (!store.slug) {
                const slug = slugify(store.business_name)
                const { error: updateError } = await supabase
                  .from('stores')
                  .update({ slug })
                  .eq('id', store.id)

                if (updateError) {
                  console.error('Error updating store slug:', updateError)
                } else {
                  store.slug = slug
                }
              }
            }
          }

          // Fetch user's clubs
          console.log('Fetching clubs for user ID:', userId)
          const { data: clubsData, error: clubsError } = await supabase
            .from('clubs')
            .select('*')
            .eq('owner_id', userId)

          if (clubsError) {
            console.error('Clubs fetch error:', clubsError.message)
          } else if (clubsData && clubsData.length > 0) {
            console.log('Found clubs:', clubsData.length, clubsData)
            setClubs(clubsData)

            // Fix slugs for clubs if needed
            for (const club of clubsData) {
              if (!club.slug) {
                const slug = slugify(club.business_name)
                const { error: updateError } = await supabase
                  .from('clubs')
                  .update({ slug })
                  .eq('id', club.id)

                if (updateError) {
                  console.error('Error updating club slug:', updateError)
                } else {
                  club.slug = slug
                }
              }
            }
          }

          // Fetch user's servicing establishments
          console.log('Fetching servicing establishments for user ID:', userId)
          const { data: servicingData, error: servicingError } = await supabase
            .from('servicing')
            .select('*')
            .eq('owner_id', userId)

          if (servicingError) {
            console.error('Servicing fetch error:', servicingError.message)
          } else if (servicingData && servicingData.length > 0) {
            console.log('Found servicing:', servicingData.length, servicingData)
            setServicing(servicingData)

            // Fix slugs for servicing if needed
            for (const service of servicingData) {
              if (!service.slug) {
                const slug = slugify(service.business_name)
                const { error: updateError } = await supabase
                  .from('servicing')
                  .update({ slug })
                  .eq('id', service.id)

                if (updateError) {
                  console.error('Error updating servicing slug:', updateError)
                } else {
                  service.slug = slug
                }
              }
            }
          }

          // Fetch user's ranges
          console.log('Fetching ranges for user ID:', userId)
          const { data: rangesData, error: rangesError } = await supabase
            .from('ranges')
            .select('*')
            .eq('owner_id', userId)

          if (rangesError) {
            console.error('Ranges fetch error:', rangesError.message)
          } else if (rangesData && rangesData.length > 0) {
            console.log('Found ranges:', rangesData.length, rangesData)
            setRanges(rangesData)

            // Fix slugs for ranges if needed
            for (const range of rangesData) {
              if (!range.slug) {
                const slug = slugify(range.business_name)
                const { error: updateError } = await supabase
                  .from('ranges')
                  .update({ slug })
                  .eq('id', range.id)

                if (updateError) {
                  console.error('Error updating range slug:', updateError)
                } else {
                  range.slug = slug
                }
              }
            }
          }

          // Fetch user's events
          const { data: eventsData, error: eventsError } = await supabase
            .from('events')
            .select('*')
            .eq('created_by', userId)
            .order('start_date', { ascending: false })

          if (eventsError) {
            console.error('Events fetch error:', eventsError.message)
            // Continue even if there's an error
          }

          // Fetch user's credits - Modified query
          const { data: listingCreditsData, error: listingCreditsError } =
            await supabase
              .from('credits')
              .select('amount')
              .eq('user_id', userId)
              .maybeSingle() // Changed from single() to maybeSingle()

          if (listingCreditsError) {
            console.error(
              'Listing credits fetch error:',
              listingCreditsError.message
            )
          }

          const { data: eventCreditsData, error: eventCreditsError } =
            await supabase
              .from('credits_events')
              .select('amount')
              .eq('user_id', userId)
              .maybeSingle() // Changed from single() to maybeSingle()

          if (eventCreditsError) {
            console.error(
              'Event credits fetch error:',
              eventCreditsError.message
            )
          }

          // Set credits with proper null checking
          setListingCredits(listingCreditsData?.amount ?? 0)
          setEventCredits(eventCreditsData?.amount ?? 0)

          // Update state with all fetched data
          setBlogPosts(blogData || [])
          setEvents(eventsData || [])

          // Fetch user's credit transactions
          const { data: transactionsData, error: transactionsError } =
            await supabase
              .from('credit_transactions')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })

          if (transactionsError) {
            console.error(
              'Transactions fetch error:',
              transactionsError.message
            )
            // Continue even if there's an error
          }

          setCreditTransactions(transactionsData || [])

          // Extract listing IDs from transaction descriptions
          const listingIds: string[] = []
          transactionsData?.forEach(transaction => {
            if (
              transaction.description &&
              transaction.description.includes(
                'Feature listing purchase for listing'
              )
            ) {
              const match = transaction.description.match(
                /Feature listing purchase for listing ([0-9a-f-]+)/
              )
              if (match && match[1]) {
                listingIds.push(match[1])
              }
            }
          })

          // Fetch listing titles if there are IDs to look up
          if (listingIds.length > 0) {
            const { data: listingsData, error: listingsFetchError } =
              await supabase
                .from('listings')
                .select('id, title')
                .in('id', listingIds)

            if (listingsFetchError) {
              console.error(
                'Error fetching listing titles:',
                listingsFetchError.message
              )
            } else if (listingsData) {
              // Create a map of listing IDs to titles
              const idToTitleMap = listingsData.reduce(
                (map, listing) => {
                  map[listing.id] = listing.title
                  return map
                },
                {} as Record<string, string>
              )

              setListingIdToTitleMap(idToTitleMap)
            }
          }
        } else {
          // Just set loading to false if not logged in - will show login prompt instead of redirecting
          setLoading(false)
          setSessionChecked(true)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        toast({
          variant: 'destructive',
          title: 'Error loading profile',
          description:
            'We encountered an error loading your profile information. Please refresh the page and try again.',
        })
      } finally {
        setLoading(false)
        setSessionChecked(true)
      }
    }

    loadProfile()
  }, [router, form, toast, session, supabase])

  // Add a document click listener to close tooltip when clicking outside
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      // Close tooltip when clicking outside
      if (openTooltipId !== null) {
        setOpenTooltipId(null)
      }
    }

    // Add the event listener
    document.addEventListener('click', handleDocumentClick)

    // Clean up
    return () => {
      document.removeEventListener('click', handleDocumentClick)
    }
  }, [openTooltipId])

  // Handle tooltip icon click
  const handleTooltipClick = (event: React.MouseEvent, listingId: string) => {
    // Stop propagation to prevent the document click handler from firing
    event.stopPropagation()

    // Toggle tooltip: close if already open, open if closed
    setOpenTooltipId(openTooltipId === listingId ? null : listingId)
  }

  async function handleLicenseUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      setUploadingLicense(true)

      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please upload an image file (JPEG/PNG).',
        })
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'License image must be under 5MB.',
        })
        return
      }

      // Verify the license image using OCR - this now includes auto-rotation
      const {
        isVerified,
        isExpired,
        expiryDate,
        text,
        orientation,
        rotationAngle,
        correctedImageUrl,
      } = await verifyLicenseImage(file)

      // If the license is expired, don't allow it to be uploaded
      if (isExpired) {
        toast({
          variant: 'destructive',
          title: 'Expired license',
          description: expiryDate
            ? `This license expired on ${expiryDate}. Please upload a valid license.`
            : 'This license appears to be expired. Please upload a valid license.',
        })
        setUploadingLicense(false)
        return
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

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, imageToUpload)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('licenses').getPublicUrl(filePath)

      // Update both license_image and is_seller status
      // Set is_verified based on OCR verification result
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          license_image: publicUrl,
          is_seller: true, // Automatically set as seller when license is uploaded
          is_verified: isVerified, // Set verification status based on OCR result
        })
        .eq('id', profile?.id)

      if (updateError) throw updateError

      setProfile(prev =>
        prev
          ? {
              ...prev,
              license_image: publicUrl,
              is_seller: true,
              is_verified: isVerified,
            }
          : null
      )

      if (isVerified) {
        toast({
          title: 'License uploaded and verified',
          description: expiryDate
            ? `Your license has been verified and is valid until ${expiryDate}.`
            : 'Your license has been uploaded and verified successfully. Your account is now marked as a verified seller.',
          className: 'bg-green-600 text-white border-green-600',
        })
      } else {
        toast({
          title: 'License uploaded',
          description:
            'Your license has been uploaded but could not be automatically verified. An administrator will review your license manually.',
          variant: 'default',
          className: 'bg-amber-100 text-amber-800 border-amber-200',
        })
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

  async function onSubmit(data: ProfileForm) {
    try {
      if (!profile?.id) return

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          address: data.address,
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile(prev =>
        prev
          ? {
              ...prev,
              first_name: data.first_name,
              last_name: data.last_name,
              phone: data.phone,
              address: data.address,
            }
          : null
      )
      setIsEditing(false)

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description:
          error instanceof Error ? error.message : 'Failed to update profile.',
      })
    }
  }

  async function handleDeletePost(postId: string) {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      setBlogPosts(prevPosts => prevPosts.filter(post => post.id !== postId))

      toast({
        title: 'Post deleted',
        description: 'Your blog post has been deleted successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description:
          error instanceof Error ? error.message : 'Failed to delete post',
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading profile..." />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Access</CardTitle>
            <CardDescription>
              You need to log in to view your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/login">
                <Button className="w-full">Log In</Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Add null check for profile right before returning the main UI
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading profile data..." />
      </div>
    )
  }

  async function handleListingStatusChange(
    id: string,
    value: string
  ): Promise<void> {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      const { data, error } = await supabase.rpc('update_listing_status', {
        listing_id: id,
        new_status: value,
        user_id: userData.user.id,
      })

      if (error) throw error

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === id ? { ...listing, status: value } : listing
        )
      )

      toast({
        title: 'Listing updated',
        description:
          'The status of your listing has been updated successfully.',
      })
    } catch (error) {
      console.error('Error updating listing status:', error)
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to update listing status.',
      })
    }
  }

  async function handleDeleteListing(listingId: string) {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.user) {
        toast({
          variant: 'destructive',
          title: 'Unauthorized',
          description: 'You must be logged in to delete a listing',
        })
        return
      }

      // Use the server-side API for deletion
      const response = await fetch('/api/listings/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
          userId: session.session.user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete listing')
      }

      // Update the UI by removing the deleted listing
      setListings(prevListings =>
        prevListings.filter(listing => listing.id !== listingId)
      )

      toast({
        title: 'Listing deleted',
        description: 'Your listing has been deleted successfully',
      })

      // Close the dialog
      setDeleteDialogOpen(false)
      setListingToDelete(null)
    } catch (error) {
      console.error('Error deleting listing:', error)
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description:
          error instanceof Error ? error.message : 'Failed to delete listing',
      })

      // Close the dialog even on error
      setDeleteDialogOpen(false)
      setListingToDelete(null)
    }
  }

  // Function to open the delete confirmation dialog
  function confirmDeleteListing(listingId: string) {
    setListingToDelete(listingId)
    setDeleteDialogOpen(true)
  }

  async function handleRemoveLicense() {
    try {
      if (!profile?.id) return

      const { error } = await supabase
        .from('profiles')
        .update({
          license_image: null,
          is_seller: false, // Remove seller status when license is removed
          is_verified: false, // Reset verification status when license is removed
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile(prev =>
        prev
          ? {
              ...prev,
              license_image: null,
              is_seller: false,
              is_verified: false,
            }
          : null
      )

      toast({
        title: 'License removed',
        description:
          'Your license has been removed successfully. Your account is no longer marked as a seller.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Remove failed',
        description:
          error instanceof Error ? error.message : 'Failed to remove license.',
      })
    }
  }

  async function handleDeleteStore(storeId: string) {
    try {
      // Confirm deletion
      if (
        !window.confirm(
          'Are you sure you want to delete this establishment profile? This action cannot be undone.'
        )
      ) {
        return
      }

      // Check which type of establishment this is
      const storeExists = stores.some(s => s.id === storeId)
      const clubExists = clubs.some(c => c.id === storeId)
      const servicingExists = servicing.some(s => s.id === storeId)
      const rangeExists = ranges.some(r => r.id === storeId)

      let tableName = ''
      if (storeExists) tableName = 'stores'
      else if (clubExists) tableName = 'clubs'
      else if (servicingExists) tableName = 'servicing'
      else if (rangeExists) tableName = 'ranges'
      else {
        throw new Error('Establishment not found')
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', storeId)

      if (error) throw error

      // Update the appropriate state array
      if (storeExists) {
        setStores(prevStores =>
          prevStores.filter(store => store.id !== storeId)
        )
      } else if (clubExists) {
        setClubs(prevClubs => prevClubs.filter(club => club.id !== storeId))
      } else if (servicingExists) {
        setServicing(prevServices =>
          prevServices.filter(service => service.id !== storeId)
        )
      } else if (rangeExists) {
        setRanges(prevRanges =>
          prevRanges.filter(range => range.id !== storeId)
        )
      }

      toast({
        title: 'Establishment deleted',
        description: 'Your establishment profile has been deleted successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to delete establishment',
      })
    }
  }

  async function handleDeleteEvent(eventId: string) {
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId)

      if (error) throw error

      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId))

      toast({
        title: 'Event deleted',
        description: 'Your event has been deleted successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description:
          error instanceof Error ? error.message : 'Failed to delete event',
      })
    }
  }

  async function handleRenewListing(
    listingId: string,
    showToast: boolean = true
  ): Promise<void> {
    try {
      console.log(`Renewing listing: ${listingId}`)

      // Call our simplified API endpoint to update the expiry
      const response = await fetch('/api/listings/update-expiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)

        // Fallback to the RPC function if the API fails
        console.log('Trying fallback RPC method')
        const { error } = await supabase.rpc('relist_listing', {
          listing_id: listingId,
        })

        if (error) {
          console.error('RPC fallback error:', error)
          throw new Error('Failed to renew listing after multiple attempts')
        }
      }

      // Update the UI
      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingId
            ? {
                ...listing,
                expires_at: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
                days_until_expiration: 30,
                is_near_expiration: false,
              }
            : listing
        )
      )

      // Only show toast if showToast is true
      if (showToast) {
        toast({
          title: 'Listing renewed',
          description: 'Your listing has been renewed for another 30 days.',
        })
      }
    } catch (error) {
      console.error('Error renewing listing:', error)
      toast({
        variant: 'destructive',
        title: 'Renewal failed',
        description:
          error instanceof Error ? error.message : 'Failed to renew listing.',
      })
    }
  }

  // Update the handleRenewalSuccess function to always extend expiry
  async function handleRenewalSuccess(): Promise<void> {
    try {
      if (!listingToFeature) return

      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      console.log('Starting renewal process for listing:', listingToFeature)

      // Step 1: Always update the expiry date to 30 days first
      console.log('Extending listing expiry to 30 days')
      const expiryResponse = await fetch('/api/listings/update-expiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId: listingToFeature,
        }),
      })

      if (!expiryResponse.ok) {
        console.error('Error extending listing expiry')
        const errorData = await expiryResponse.json()
        throw new Error(errorData.error || 'Failed to extend listing expiry')
      }

      const expiryData = await expiryResponse.json()
      console.log('Expiry update response:', expiryData)

      // Step 2: Call the feature renewal API
      console.log('Renewing featured status')
      const featureResponse = await fetch('/api/listings/renew-feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.user.id,
          listingId: listingToFeature,
        }),
      })

      if (!featureResponse.ok) {
        const errorData = await featureResponse.json()
        throw new Error(errorData.error || 'Failed to renew feature')
      }

      const featureData = await featureResponse.json()
      console.log('Feature API response:', featureData)

      // Update the UI to reflect the changes
      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingToFeature
            ? {
                ...listing,
                expires_at: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
                days_until_expiration: 30,
                is_near_expiration: false,
                is_featured: true,
                featured_days_remaining: 15, // Assuming feature period is 15 days
              }
            : listing
        )
      )

      toast({
        title: 'Listing featured and renewed',
        description:
          'Your listing has been featured for 15 days and renewed for 30 days.',
      })

      // Reset state
      setListingToFeature(null)
    } catch (error) {
      console.error('Error featuring listing:', error)
      toast({
        variant: 'destructive',
        title: 'Featuring failed',
        description:
          error instanceof Error ? error.message : 'Failed to feature listing.',
      })
    }
  }

  // Add this new function after handleRenewalSuccess
  async function testUpdateExpiry(listingId: string) {
    try {
      console.log(`Testing direct expiry update for listing ${listingId}`)

      // Call debug API
      const response = await fetch('/api/listings/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
        }),
      })

      const data = await response.json()
      console.log('Debug API response:', data)

      // Update UI directly instead of refreshing the whole profile
      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingId
            ? {
                ...listing,
                expires_at: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
                days_until_expiration: 30,
                is_near_expiration: false,
              }
            : listing
        )
      )

      toast({
        title: 'Debug completed',
        description: 'Check the console logs for details',
      })
    } catch (error) {
      console.error('Debug test failed:', error)
      toast({
        variant: 'destructive',
        title: 'Test failed',
        description: 'Check the console for details',
      })
    }
  }

  async function handleRemoveFeature(listingId: string): Promise<void> {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      console.log(
        `[REMOVE-FEATURE] Attempting to remove feature status for listing ${listingId}`
      )

      const response = await fetch(
        `/api/listings/feature?listingId=${listingId}&userId=${userData.user.id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`[REMOVE-FEATURE] API error:`, errorData)
        throw new Error(errorData.error || 'Failed to remove feature')
      }

      console.log(
        `[REMOVE-FEATURE] Feature status successfully removed for listing ${listingId}`
      )

      // Update UI by removing ONLY feature status from this listing
      // but preserving the days_until_expiration
      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingId
            ? {
                ...listing,
                is_featured: false,
                featured_days_remaining: 0,
                // Preserve the days_until_expiration and is_near_expiration
              }
            : listing
        )
      )

      toast({
        title: 'Feature removed',
        description:
          'Your listing is no longer featured but its expiration date remains unchanged.',
      })
    } catch (error) {
      console.error('Error removing feature:', error)
      toast({
        variant: 'destructive',
        title: 'Failed to remove feature',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to remove feature from listing.',
      })
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="mb-2 sm:mb-0">
                Profile Information
              </CardTitle>
              <CardDescription>
                Your personal information and account details
              </CardDescription>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="w-full sm:w-auto"
              >
                <Pencil className="h-4 w-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
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
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+356 1234 5678" {...field} />
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
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit">Save Changes</Button>
                </form>
              </Form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Username
                  </p>
                  <p className="text-lg">{profile.username}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="text-lg">{profile.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    First Name
                  </p>
                  <p className="text-lg">
                    {profile.first_name || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Last Name
                  </p>
                  <p className="text-lg">
                    {profile.last_name || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Phone
                  </p>
                  <p className="text-lg">{profile.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Address
                  </p>
                  <p className="text-lg">{profile.address || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Birthday
                  </p>
                  <p className="text-lg">
                    {profile.birthday || 'Not provided'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seller Status */}
        <Card>
          <CardHeader>
            <CardTitle>Seller Status</CardTitle>
            <CardDescription>
              {profile.is_seller
                ? 'Your seller verification status and license information'
                : 'Upload a picture of your license to certify your account'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium">Seller Status:</span>
                <Badge
                  variant={profile.is_seller ? 'default' : 'secondary'}
                  className={
                    profile.is_seller
                      ? 'bg-green-600 hover:bg-green-600 text-white'
                      : ''
                  }
                >
                  {profile.is_seller ? 'Registered Seller' : 'Not a Seller'}
                </Badge>
              </div>

              {profile.is_seller && (
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`h-5 w-5 ${profile.is_verified ? 'text-green-600' : 'text-amber-500'}`}
                  />
                  <span className="font-medium">Verification:</span>
                  <Badge
                    variant={profile.is_verified ? 'default' : 'outline'}
                    className={
                      profile.is_verified
                        ? 'bg-green-600 hover:bg-green-600 text-white'
                        : 'border-amber-500 text-amber-500'
                    }
                  >
                    {profile.is_verified
                      ? 'License Verified'
                      : 'Pending Verification'}
                  </Badge>
                  {!profile.is_verified && profile.license_image && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-[200px] text-xs">
                            Your license has been uploaded but is pending
                            verification. This may take up to 24 hours. You can
                            still create non-firearm listings.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {profile.license_image && (
                <div className="relative">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Current License:
                  </p>
                  <div className="relative inline-block">
                    <img
                      id="profile-license-preview"
                      src={profile.license_image}
                      alt="License"
                      className="w-64 h-auto rounded-md mb-4"
                      data-rotation="0"
                    />
                    <button
                      onClick={handleRemoveLicense}
                      className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-1 rounded-full hover:bg-opacity-100 transition-all"
                      title="Remove license"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLicenseUpload}
                  disabled={uploadingLicense}
                  className="hidden"
                  id="license-upload"
                />
                <label
                  htmlFor="license-upload"
                  className="bg-black text-white px-4 py-2 rounded cursor-pointer hover:bg-gray-800 transition-colors flex items-center"
                >
                  {profile.license_image ? (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploadingLicense
                    ? 'Uploading...'
                    : profile.license_image
                      ? 'Replace License'
                      : 'Upload License'}
                </label>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {profile.is_seller ? (
                  'Upload a new license image if your current one has expired.'
                ) : (
                  <span
                    dangerouslySetInnerHTML={{
                      __html:
                        'You can currently add listings that are <b>not firearms</b> such as assesories. <br/> If you wish to sell <b>Firearms</b> or other license required items, please upload a picture of your license to certify your account.',
                    }}
                  />
                )}
              </p>
            </div>
          </CardContent>
          {!profile.license_image && (
            <div className="m-6 p-4 border rounded-md bg-muted/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">Information:</span>
              </div>
              <p className="mb-3">
                Maltaguns ensures that all firearms added to the site are owned
                by licensed individuals. For this reason, we require all sellers
                wishing to sell a firearm to upload a picture of their license
                only once and before they list their first firearm. The picture
                must include only the front page of the Malta police license
                issued to you, clearly displaying your name and address which
                must match those on your pofile. Uploaded images will not be
                shared with anyone and are strictly used for verification
                purposes only. Should you have any questions please email us on
                Info@maltaguns.com.
              </p>
              <div
                className="w-full max-w-md h-72 rounded-md bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/license-sample.jpg')" }}
                aria-label="Sample License"
              ></div>
            </div>
          )}
        </Card>

        {/* Listings */}
        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>My Listings</CardTitle>
              <CardDescription>
                Manage your marketplace listings
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="bg-muted px-4 py-2 rounded-md text-center sm:text-left">
                  <span className="text-sm text-muted-foreground">
                    Credits Remaining:
                  </span>
                  <span className="font-semibold ml-1">{listingCredits}</span>
                </div>
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setShowCreditDialog(true)}
                >
                  Add more credits
                </Button>
              </div>
              <Link href="/marketplace/create" className="sm:ml-auto">
                <Button className="bg-black text-white hover:bg-gray-800 w-full">
                  <Package className="mr-2 h-4 w-4" />
                  Create Listing
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {listings.map(listing => (
                <Card key={listing.id}>
                  <CardContent className="p-4">
                    {/* Top section with title and featured status */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                      <div className="flex items-start gap-2 w-full sm:w-auto">
                        {listing.type === 'firearms' ? (
                          <Image
                            src="/images/pistol-gun-icon.svg"
                            alt="Firearms"
                            width={16}
                            height={16}
                            className="mr-2 mt-1"
                          />
                        ) : (
                          <Package className="h-4 w-4 mr-2 mt-1" />
                        )}
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {listing.title}
                            </h3>
                            {listing.is_featured && (
                              <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                                <Badge className="bg-red-500 text-white hover:bg-red-600 flex items-center">
                                  <Star className="h-3 w-3 mr-1" /> Featured
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setListingToRemoveFeature(listing.id)
                                    setRemoveFeatureDialogOpen(true)
                                  }}
                                >
                                  <X className="h-3 w-3 mr-1" /> Remove
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className="text-base px-3 py-1 self-start sm:self-center">
                        {formatPrice(listing.price)}
                      </Badge>
                    </div>

                    {/* Middle section: Expiration info */}
                    <div className="mb-4">
                      <div className="text-sm text-muted-foreground flex flex-col gap-2">
                        {/* Listing expiration */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Calendar
                              className={`h-4 w-4 ${
                                listing.is_near_expiration ? 'text-red-500' : ''
                              }`}
                            />
                            <span
                              className={
                                listing.is_near_expiration
                                  ? 'text-red-500 font-medium'
                                  : ''
                              }
                            >
                              Expires in {listing.days_until_expiration} days
                              {listing.is_near_expiration && (
                                <span className="ml-1 text-red-500">
                                  (Will be removed when expired)
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Move the extend expiry button here */}
                          {(listing.days_until_expiration ?? 0) < 15 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRenewListing(listing.id)}
                              className="bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 border-orange-200 w-full sm:w-auto"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Relist for 30 days
                            </Button>
                          )}
                        </div>

                        {/* Featured status expiry */}
                        {listing.is_featured &&
                          (listing.featured_days_remaining ?? 0) > 0 && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                              <div
                                className={`flex items-center gap-2 ${
                                  (listing.featured_days_remaining ?? 0) > 3
                                    ? 'text-green-600'
                                    : 'text-red-500'
                                }`}
                              >
                                <Star className="h-4 w-4" />
                                <span>
                                  Featured ending in{' '}
                                  {listing.featured_days_remaining} days
                                </span>
                              </div>
                              {/* Add Renew Feature button if less than or equal to 3 days remaining */}
                              {(listing.featured_days_remaining ?? 0) <= 3 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="w-full sm:w-auto">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setListingToFeature(listing.id)
                                            setFeatureDialogOpen(true)
                                          }}
                                          className="bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 border-green-200 w-full sm:w-auto"
                                        >
                                          <Star className="h-4 w-4 mr-2" />
                                          Renew Featured
                                        </Button>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Renew featured status for this listing
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Bottom section: Action buttons and status dropdown */}
                    <div className="mt-4">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="w-full sm:w-auto">
                          <StatusSelect
                            value={listing.status}
                            onChange={value =>
                              handleListingStatusChange(listing.id, value)
                            }
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Link
                            href={`/marketplace/listing/${slugify(listing.title)}`}
                            className="w-full sm:w-auto"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </Link>

                          {listing.status === 'sold' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="opacity-50 cursor-not-allowed w-full sm:w-auto"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          ) : (
                            <Link
                              href={`/marketplace/listing/${slugify(listing.title)}/edit`}
                              className="w-full sm:w-auto"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </Link>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmDeleteListing(listing.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200 w-full sm:w-auto"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Blog Posts - Only show if user has posts */}
        {blogPosts.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full">
                <div>
                  <CardTitle>My Blog Posts</CardTitle>
                  <CardDescription>Manage your blog posts</CardDescription>
                </div>
                <Link
                  href="/blog/create"
                  className="mt-4 sm:mt-0 w-full sm:w-auto"
                >
                  <Button className="w-full">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Write Post
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {blogPosts.map(post => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col space-y-4">
                        <div className="flex flex-col space-y-2">
                          <h3 className="font-semibold">{post.title}</h3>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(post.created_at), 'PPP')}
                            </p>
                            <Badge
                              variant={post.published ? 'default' : 'secondary'}
                            >
                              {post.published ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Link
                            href={`/blog/${post.slug}`}
                            className="w-full sm:w-auto"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </Link>
                          <Link
                            href={`/blog/${post.slug}/edit`}
                            className="w-full sm:w-auto"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200 w-full sm:w-auto"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add this new Card component for Payment History after any appropriate existing section - e.g. after blog posts */}
        {creditTransactions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full">
                <div>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>
                    Your transaction history on MaltaGuns
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="text-left border-b">
                      <th className="pb-3 pt-1 pl-4 pr-6 font-medium text-muted-foreground bg-background w-[160px]">
                        Date
                      </th>
                      <th className="pb-3 pt-1 px-4 font-medium text-muted-foreground bg-background w-[140px]">
                        Type
                      </th>
                      <th className="pb-3 pt-1 px-4 font-medium text-muted-foreground bg-background w-[100px]">
                        Amount
                      </th>
                      <th className="pb-3 pt-1 px-4 font-medium text-muted-foreground bg-background">
                        Description
                      </th>
                      <th className="pb-3 pt-1 px-4 font-medium text-muted-foreground bg-background w-[140px] text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {creditTransactions.map(
                      (transaction: CreditTransaction) => {
                        // Process description to replace listing IDs with titles
                        let description = transaction.description
                          ? transaction.description.replace(
                              /\s*\(price_\d+credits?\)\s*/g,
                              ''
                            )
                          : '—'

                        // Replace listing IDs with titles if available
                        if (
                          description.includes(
                            'Feature listing purchase for listing'
                          )
                        ) {
                          const match = description.match(
                            /Feature listing purchase for listing ([0-9a-f-]+)/
                          )
                          if (
                            match &&
                            match[1] &&
                            listingIdToTitleMap[match[1]]
                          ) {
                            description = description.replace(
                              `Feature listing purchase for listing ${match[1]}`,
                              `Feature listing purchase for "${listingIdToTitleMap[match[1]]}"`
                            )
                          }
                        }

                        return (
                          <tr
                            key={transaction.id}
                            className="border-b border-muted hover:bg-muted/20"
                          >
                            <td className="py-4 pl-4 pr-6 text-sm">
                              {format(new Date(transaction.created_at), 'PPP')}
                            </td>
                            <td className="py-4 px-4 text-sm align-top">
                              <div className="flex flex-col gap-2">
                                <Badge
                                  variant={
                                    transaction.type === 'credit'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                >
                                  {transaction.type === 'credit'
                                    ? 'Purchase'
                                    : 'Usage'}
                                </Badge>
                                {transaction.credit_type && (
                                  <Badge variant="outline">
                                    {transaction.credit_type === 'featured'
                                      ? 'Feature'
                                      : 'Event'}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm">
                              <span
                                className={
                                  transaction.type === 'credit'
                                    ? 'text-green-600 font-medium'
                                    : 'text-red-600 font-medium'
                                }
                              >
                                {transaction.type === 'credit' ? '+' : '-'}
                                {transaction.amount}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-sm">{description}</td>
                            <td className="py-4 px-4 text-sm text-right">
                              {transaction.status ? (
                                <Badge
                                  variant={
                                    transaction.status === 'completed'
                                      ? 'default'
                                      : transaction.status === 'pending'
                                        ? 'outline'
                                        : 'secondary'
                                  }
                                >
                                  {transaction.status}
                                </Badge>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        )
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Events - Only show if user has events */}
        {events.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>My Events</CardTitle>
                <CardDescription>Manage your published events</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="bg-muted px-4 py-2 rounded-md text-center sm:text-left">
                    <span className="text-sm text-muted-foreground">
                      Credits Remaining:
                    </span>
                    <span className="font-semibold ml-1">{eventCredits}</span>
                  </div>
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setShowEventCreditDialog(true)}
                  >
                    Add more credits
                  </Button>
                </div>
                <Link href="/events/create" className="sm:ml-auto">
                  <Button className="bg-black text-white hover:bg-gray-800 w-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    Create Event
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map(event => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col space-y-4">
                        <div className="flex gap-3">
                          {event.poster_url ? (
                            <div className="h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                              <img
                                src={event.poster_url}
                                alt={event.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-lg">
                              {event.title}
                            </h3>
                            <div className="text-sm text-muted-foreground">
                              <p>{format(new Date(event.start_date), 'PPP')}</p>
                              <p>{event.location}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Link
                            href={`/events/${event.slug || event.id}`}
                            className="w-full sm:w-auto"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </Link>
                          <Link
                            href={`/events/${event.slug || event.id}/edit`}
                            className="w-full sm:w-auto"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200 w-full sm:w-auto"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Replace the Store Profiles section with Establishments section */}
        {stores.length > 0 ||
        clubs.length > 0 ||
        servicing.length > 0 ||
        ranges.length > 0 ? (
          <Card className="w-full mb-8">
            <CardHeader>
              <CardTitle>My Establishments</CardTitle>
              <CardDescription>
                Manage your firearms business listings on MaltaGuns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Stores */}
              {stores.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold mb-3">Stores</h3>
                  {stores.map(storeItem => (
                    <div
                      key={storeItem.id}
                      className="border rounded-lg p-4 mb-4"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        {storeItem.logo_url ? (
                          <img
                            src={storeItem.logo_url}
                            alt={storeItem.business_name}
                            className="w-16 h-16 object-contain rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <Store className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-lg">
                            {storeItem.business_name}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {storeItem.location || 'No location specified'}
                          </p>
                          {!storeItem.slug && (
                            <Badge variant="outline" className="mt-1">
                              No slug
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Link
                          href={`/establishments/stores/${
                            storeItem.slug || storeItem.id
                          }`}
                          passHref
                        >
                          <Button size="sm" variant="outline">
                            View Profile
                          </Button>
                        </Link>
                        <Link
                          href={`/establishments/stores/${
                            storeItem.slug || storeItem.id
                          }/edit`}
                          passHref
                        >
                          <Button size="sm" variant="outline">
                            Edit Profile
                          </Button>
                        </Link>
                        <Link
                          href={`/blog/create?store_id=${storeItem.id}`}
                          passHref
                        >
                          <Button size="sm" variant="outline">
                            Add Blog Post
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteStore(storeItem.id)}
                        >
                          Delete Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Clubs */}
              {clubs.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold mb-3">Clubs</h3>
                  {clubs.map(club => (
                    <div key={club.id} className="border rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-4 mb-4">
                        {club.logo_url ? (
                          <img
                            src={club.logo_url}
                            alt={club.business_name}
                            className="w-16 h-16 object-contain rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <Users className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-lg">
                            {club.business_name}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {club.location || 'No location specified'}
                          </p>
                          {!club.slug && (
                            <Badge variant="outline" className="mt-1">
                              No slug
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Link
                          href={`/establishments/clubs/${club.slug || club.id}`}
                          passHref
                        >
                          <Button size="sm" variant="outline">
                            View Profile
                          </Button>
                        </Link>
                        <Link
                          href={`/establishments/clubs/${
                            club.slug || club.id
                          }/edit`}
                          passHref
                        >
                          <Button size="sm" variant="outline">
                            Edit Profile
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteStore(club.id)}
                        >
                          Delete Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Servicing */}
              {servicing.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold mb-3">
                    Servicing & Repair
                  </h3>
                  {servicing.map(service => (
                    <div
                      key={service.id}
                      className="border rounded-lg p-4 mb-4"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        {service.logo_url ? (
                          <img
                            src={service.logo_url}
                            alt={service.business_name}
                            className="w-16 h-16 object-contain rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <Wrench className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-lg">
                            {service.business_name}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {service.location || 'No location specified'}
                          </p>
                          {!service.slug && (
                            <Badge variant="outline" className="mt-1">
                              No slug
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Link
                          href={`/establishments/servicing/${
                            service.slug || service.id
                          }`}
                          passHref
                        >
                          <Button size="sm" variant="outline">
                            View Profile
                          </Button>
                        </Link>
                        <Link
                          href={`/establishments/servicing/${
                            service.slug || service.id
                          }/edit`}
                          passHref
                        >
                          <Button size="sm" variant="outline">
                            Edit Profile
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteStore(service.id)}
                        >
                          Delete Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Ranges */}
              {ranges.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold mb-3">
                    Shooting Ranges
                  </h3>
                  {ranges.map(range => (
                    <div key={range.id} className="border rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-4 mb-4">
                        {range.logo_url ? (
                          <img
                            src={range.logo_url}
                            alt={range.business_name}
                            className="w-16 h-16 object-contain rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <MapPin className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-lg">
                            {range.business_name}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {range.location || 'No location specified'}
                          </p>
                          {!range.slug && (
                            <Badge variant="outline" className="mt-1">
                              No slug
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Link
                          href={`/establishments/ranges/${
                            range.slug || range.id
                          }`}
                          passHref
                        >
                          <Button size="sm" variant="outline">
                            View Profile
                          </Button>
                        </Link>
                        <Link
                          href={`/establishments/ranges/${
                            range.slug || range.id
                          }/edit`}
                          passHref
                        >
                          <Button size="sm" variant="outline">
                            Edit Profile
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteStore(range.id)}
                        >
                          Delete Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Common messages */}
              {(stores.length > 1 ||
                clubs.length > 0 ||
                servicing.length > 0 ||
                ranges.length > 0) && (
                <Alert className="mt-4 mb-2">
                  {[...stores, ...clubs, ...servicing, ...ranges].some(
                    e => !e.slug
                  ) && (
                    <AlertDescription className="mb-2">
                      Some of your establishments do not have a properly
                      formatted URL slug. This will be fixed automatically.
                    </AlertDescription>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full mb-8">
            <CardHeader>
              <CardTitle>Create Establishment</CardTitle>
              <CardDescription className="flex items-center gap-2">
                Create your business profile to connect with the local shooting
                community{' '}
                <Button
                  variant="outline"
                  className="h-7 rounded-full text-xs font-normal flex items-center gap-1.5 border-muted-foreground/20"
                  onClick={() => setEstablishmentInfoOpen(true)}
                >
                  <Info className="h-3.5 w-3.5" />
                  Read More
                </Button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/establishments/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your Business
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Establishment Info Dialog */}
        <Dialog
          open={establishmentInfoOpen}
          onOpenChange={setEstablishmentInfoOpen}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Business Opportunities on MaltaGuns</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <p>
                Maltaguns provides businesses in Malta with a unique opportunity
                to connect with the local shooting and firearms community.
                Whether you are a licensed gun dealer, gunsmith, airsoft
                equipment repair specialist, wood stock restoration expert,
                engineering service provider, or gun safe importer, Maltaguns
                offers the ideal platform to enhance your visibility and reach
                your target audience.
              </p>
              <p>
                By creating a retailer profile, your business will be
                prominently featured on our Retailers Page, allowing you to list
                your store and promote your services effectively. Additionally,
                retailers can maintain a dedicated blog to share updates, news,
                and insights directly with the community.
              </p>
              <p>
                As a registered gun store, you will also benefit from Unlimited
                listings in the Firearms category while also gaining access to
                the restricted Ammunition and Powders category.
              </p>
              <p>
                To take advantage of this opportunity and advertise your
                business on Maltaguns, please send an email to
                info@maltaguns.com to learn more and start building your profile
                today.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEstablishmentInfoOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add the delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this listing? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                listingToDelete && handleDeleteListing(listingToDelete)
              }
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature Credit Dialog for renewals */}
      {listingToFeature && (
        <FeatureCreditDialog
          open={featureDialogOpen}
          onOpenChange={setFeatureDialogOpen}
          userId={profile?.id ?? ''}
          listingId={listingToFeature ?? ''}
          onSuccess={handleRenewalSuccess}
        />
      )}

      {/* Remove Feature Confirmation Dialog */}
      <Dialog
        open={removeFeatureDialogOpen}
        onOpenChange={setRemoveFeatureDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Feature Status</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the featured status from this
              listing? This will not refund your feature credit and your listing
              will no longer appear at the top of search results.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setRemoveFeatureDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (listingToRemoveFeature) {
                  handleRemoveFeature(listingToRemoveFeature)
                  setRemoveFeatureDialogOpen(false)
                  setListingToRemoveFeature(null)
                }
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Remove Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Dialogs */}
      <CreditDialog
        open={showCreditDialog}
        onOpenChange={setShowCreditDialog}
        userId={profile?.id || ''}
        source="profile"
        onSuccess={() => {
          toast({
            title: 'Credits purchased',
            description: 'Your credits have been added to your account.',
          })
        }}
      />

      <EventCreditDialog
        open={showEventCreditDialog}
        onOpenChange={setShowEventCreditDialog}
        userId={profile?.id || ''}
        onSuccess={() => {
          toast({
            title: 'Event credits purchased',
            description: 'Your event credits have been added to your account.',
          })
        }}
      />
    </div>
  )
}
