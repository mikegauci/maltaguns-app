'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2, X } from 'lucide-react'
import { FeatureCreditDialog } from '@/components/feature-credit-dialog'
import { CreditDialog } from '@/components/credit-dialog'
import { EventCreditDialog } from '@/components/event-credit-dialog'
import { useSupabase } from '@/components/providers/supabase-provider'
import { LoadingState } from '@/components/ui/loading-state'
import { verifyLicenseImage } from '@/utils/license-verification'

// Import types
import {
  Profile,
  Listing,
  Store,
  Club,
  Servicing,
  Range,
  Event,
  BlogPost,
  CreditTransaction,
  ProfileForm,
  profileSchema,
} from './types'

// Import components
import { ProfileInformation } from './components/ProfileInformation'
import { SellerStatus } from './components/SellerStatus'
import { MyListings } from './components/MyListings'
import { MyBlogPosts } from './components/MyBlogPosts'
import { PaymentHistory } from './components/PaymentHistory'
import { MyEvents } from './components/MyEvents'
import { MyEstablishments } from './components/MyEstablishments'

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { supabase, session } = useSupabase()
  
  // State
  const [profile, setProfile] = useState<Profile | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [servicing, setServicing] = useState<Servicing[]>([])
  const [ranges, setRanges] = useState<Range[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([])
  const [listingIdToTitleMap, setListingIdToTitleMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingLicense, setUploadingLicense] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [listingToDelete, setListingToDelete] = useState<string | null>(null)
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false)
  const [listingToFeature, setListingToFeature] = useState<string | null>(null)
  const [removeFeatureDialogOpen, setRemoveFeatureDialogOpen] = useState(false)
  const [listingToRemoveFeature, setListingToRemoveFeature] = useState<string | null>(null)
  const [listingCredits, setListingCredits] = useState(0)
  const [eventCredits, setEventCredits] = useState(0)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [showEventCreditDialog, setShowEventCreditDialog] = useState(false)
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

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        if (session?.user) {
          setLoading(true)
          const userId = session.user.id

          // Fetch profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

          if (profileError) throw profileError

          setProfile(profileData)
          form.reset({
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            phone: profileData.phone || '',
            address: profileData.address || '',
          })

          // Fetch listings
          const { data: listingsData, error: listingsError } = await supabase
            .from('listings')
            .select('*')
            .eq('seller_id', userId)
            .order('created_at', { ascending: false })

          if (!listingsError) {
            // Fetch featured listings
            const { data: featuredListingsData } = await supabase
              .from('featured_listings')
              .select('*')
              .eq('user_id', userId)

            const featuredEndDates = new Map(
              (featuredListingsData || []).map(featured => [
                featured.listing_id,
                new Date(featured.end_date),
              ])
            )

            const listingsWithFeatures = (listingsData || []).map((listing: any) => {
              const now = new Date()
              const expirationDate = new Date(listing.expires_at)
              const featuredEndDate = featuredEndDates.get(listing.id)

              const diffTime = expirationDate.getTime() - now.getTime()
              const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

              let featuredDaysRemaining = 0
              if (featuredEndDate && featuredEndDate > now) {
                const featuredDiffTime = featuredEndDate.getTime() - now.getTime()
                featuredDaysRemaining = Math.max(0, Math.ceil(featuredDiffTime / (1000 * 60 * 60 * 24)))
              }

              return {
                ...listing,
                is_featured: featuredEndDate ? featuredEndDate > now : false,
                days_until_expiration: daysUntilExpiration,
                featured_days_remaining: featuredDaysRemaining,
                is_near_expiration: daysUntilExpiration <= 3 && daysUntilExpiration > 0,
                is_expired: daysUntilExpiration <= 0,
              }
            })

            const activeListings = listingsWithFeatures.filter(l => !l.is_expired)
            setListings(activeListings)
            
            const titleMap: Record<string, string> = {}
            activeListings.forEach((l: any) => {
              titleMap[l.id] = l.title
            })
            setListingIdToTitleMap(titleMap)
          }

          // Fetch stores and establishments
          const { data: storesData } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', userId)

          if (storesData) {
            setStores(storesData)
          }

          const { data: clubsData } = await supabase
            .from('clubs')
            .select('*')
            .eq('owner_id', userId)

          if (clubsData) {
            setClubs(clubsData)
          }

          const { data: servicingData } = await supabase
            .from('servicing')
            .select('*')
            .eq('owner_id', userId)

          if (servicingData) {
            setServicing(servicingData)
          }

          const { data: rangesData } = await supabase
            .from('ranges')
            .select('*')
            .eq('owner_id', userId)

          if (rangesData) {
            setRanges(rangesData)
          }

          // Fetch blog posts
          const { data: blogPostsData } = await supabase
            .from('blog_posts')
            .select('id, title, slug, published, created_at')
            .eq('author_id', userId)
            .order('created_at', { ascending: false })

          if (blogPostsData) {
            setBlogPosts(blogPostsData)
          }

          // Fetch events
          const { data: eventsData } = await supabase
            .from('events')
            .select('*')
            .eq('created_by', userId)
            .order('created_at', { ascending: false })

          if (eventsData) {
            setEvents(eventsData)
          }

          // Fetch credits
          const { data: listingCreditsData } = await supabase
            .from('credits')
            .select('balance')
            .eq('user_id', userId)
            .single()

          if (listingCreditsData) {
            setListingCredits(listingCreditsData.balance || 0)
          }

          const { data: eventCreditsData } = await supabase
            .from('credits_events')
            .select('balance')
            .eq('user_id', userId)
            .single()

          if (eventCreditsData) {
            setEventCredits(eventCreditsData.balance || 0)
          }

          // Fetch credit transactions
          const { data: transactionsData } = await supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

          if (transactionsData) {
            setCreditTransactions(transactionsData)
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        toast({
          variant: 'destructive',
          title: 'Error loading profile',
          description: 'There was a problem loading your profile data.',
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, form, toast, session, supabase])

  // Helper: Convert data URL to File
  async function urlToFile(url: string, filename: string, mimeType: string): Promise<File> {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return new File([buf], filename, { type: mimeType })
  }

  // Handlers
  async function handleLicenseUpload(event: React.ChangeEvent<HTMLInputElement>) {
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

      const { isVerified, isExpired, expiryDate, correctedImageUrl } = await verifyLicenseImage(file)

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

      const imageToUpload = correctedImageUrl
        ? await urlToFile(correctedImageUrl, `rotated-${file.name}`, file.type)
        : file

      const fileExt = file.name.split('.').pop()
      const fileName = `license-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `licenses/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, imageToUpload)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          license_image: publicUrl,
          is_seller: true,
          is_verified: isVerified,
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

      toast({
        title: isVerified ? 'License uploaded and verified' : 'License uploaded',
        description: isVerified
          ? 'Your license has been verified successfully.'
          : 'Your license will be reviewed by an administrator.',
        className: isVerified ? 'bg-green-600 text-white border-green-600' : 'bg-amber-100 text-amber-800 border-amber-200',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload license.',
      })
    } finally {
      setUploadingLicense(false)
    }
  }

  async function handleRemoveLicense() {
    try {
      if (!profile?.id) return

      const { error } = await supabase
        .from('profiles')
        .update({
          license_image: null,
          is_seller: false,
          is_verified: false,
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
        description: 'Your license has been removed successfully.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Remove failed',
        description: error instanceof Error ? error.message : 'Failed to remove license.',
      })
    }
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
        description: error instanceof Error ? error.message : 'Failed to update profile.',
      })
    }
  }

  async function handleListingStatusChange(id: string, value: string): Promise<void> {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      const { error } = await supabase.rpc('update_listing_status', {
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
        description: 'The status of your listing has been updated successfully.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update listing status.',
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

      const response = await fetch('/api/listings/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, userId: session.session.user.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete listing')
      }

      setListings(prevListings => prevListings.filter(listing => listing.id !== listingId))

      toast({
        title: 'Listing deleted',
        description: 'Your listing has been deleted successfully',
      })

      setDeleteDialogOpen(false)
      setListingToDelete(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete listing',
      })
      setDeleteDialogOpen(false)
      setListingToDelete(null)
    }
  }

  function confirmDeleteListing(listingId: string) {
    setListingToDelete(listingId)
    setDeleteDialogOpen(true)
  }

  async function handleRenewListing(listingId: string): Promise<void> {
    try {
      const response = await fetch('/api/listings/update-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      })

      if (!response.ok) {
        const { error } = await supabase.rpc('relist_listing', { listing_id: listingId })
        if (error) throw new Error('Failed to renew listing')
      }

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingId
            ? {
                ...listing,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                days_until_expiration: 30,
                is_near_expiration: false,
              }
            : listing
        )
      )

      toast({
        title: 'Listing renewed',
        description: 'Your listing has been renewed for another 30 days.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Renewal failed',
        description: error instanceof Error ? error.message : 'Failed to renew listing.',
      })
    }
  }

  async function handleRenewalSuccess(): Promise<void> {
    try {
      if (!listingToFeature) return

      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      const expiryResponse = await fetch('/api/listings/update-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listingToFeature }),
      })

      if (!expiryResponse.ok) throw new Error('Failed to extend listing expiry')

      const featureResponse = await fetch('/api/listings/renew-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.user.id, listingId: listingToFeature }),
      })

      if (!featureResponse.ok) throw new Error('Failed to renew feature')

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingToFeature
            ? {
                ...listing,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                days_until_expiration: 30,
                is_near_expiration: false,
                is_featured: true,
                featured_days_remaining: 15,
              }
            : listing
        )
      )

      toast({
        title: 'Listing featured and renewed',
        description: 'Your listing has been featured for 15 days and renewed for 30 days.',
      })

      setListingToFeature(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Featuring failed',
        description: error instanceof Error ? error.message : 'Failed to feature listing.',
      })
    }
  }

  async function handleRemoveFeature(listingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('featured_listings')
        .delete()
        .eq('listing_id', listingId)

      if (error) throw error

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingId
            ? { ...listing, is_featured: false, featured_days_remaining: 0 }
            : listing
        )
      )

      toast({
        title: 'Feature removed',
        description: 'Featured status has been removed from your listing.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove feature.',
      })
    }
  }

  async function handleDeletePost(postId: string) {
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', postId)
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
        description: error instanceof Error ? error.message : 'Failed to delete post',
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
        description: error instanceof Error ? error.message : 'Failed to delete event',
      })
    }
  }

  async function handleDeleteStore(storeId: string) {
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId)

      if (error) throw error

      setStores(prev => prev.filter(s => s.id !== storeId))
      setClubs(prev => prev.filter(c => c.id !== storeId))
      setServicing(prev => prev.filter(s => s.id !== storeId))
      setRanges(prev => prev.filter(r => r.id !== storeId))

      toast({
        title: 'Establishment deleted',
        description: 'Your establishment profile has been deleted successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete establishment',
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
            <CardDescription>You need to log in to view your profile</CardDescription>
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading profile data..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <ProfileInformation
          profile={profile}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          form={form}
          onSubmit={onSubmit}
        />

        <SellerStatus
          profile={profile}
          uploadingLicense={uploadingLicense}
          handleLicenseUpload={handleLicenseUpload}
          handleRemoveLicense={handleRemoveLicense}
        />

        <MyListings
          listings={listings}
          listingCredits={listingCredits}
          handleListingStatusChange={handleListingStatusChange}
          handleRenewListing={handleRenewListing}
          confirmDeleteListing={confirmDeleteListing}
          setListingToFeature={setListingToFeature}
          setFeatureDialogOpen={setFeatureDialogOpen}
          setListingToRemoveFeature={setListingToRemoveFeature}
          setRemoveFeatureDialogOpen={setRemoveFeatureDialogOpen}
          setShowCreditDialog={setShowCreditDialog}
        />

        <MyBlogPosts blogPosts={blogPosts} handleDeletePost={handleDeletePost} />

        <PaymentHistory
          creditTransactions={creditTransactions}
          listingIdToTitleMap={listingIdToTitleMap}
        />

        <MyEvents
          events={events}
          eventCredits={eventCredits}
          handleDeleteEvent={handleDeleteEvent}
          setShowEventCreditDialog={setShowEventCreditDialog}
        />

        <MyEstablishments
          stores={stores}
          clubs={clubs}
          servicing={servicing}
          ranges={ranges}
          handleDeleteStore={handleDeleteStore}
          establishmentInfoOpen={establishmentInfoOpen}
          setEstablishmentInfoOpen={setEstablishmentInfoOpen}
        />

        {/* Dialogs */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Listing</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this listing? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => listingToDelete && handleDeleteListing(listingToDelete)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Listing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {listingToFeature && (
          <FeatureCreditDialog
            open={featureDialogOpen}
            onOpenChange={setFeatureDialogOpen}
            userId={profile?.id ?? ''}
            listingId={listingToFeature ?? ''}
            onSuccess={handleRenewalSuccess}
          />
        )}

        <Dialog open={removeFeatureDialogOpen} onOpenChange={setRemoveFeatureDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Feature Status</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove the featured status from this listing? This will not refund your feature credit.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setRemoveFeatureDialogOpen(false)}>
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
    </div>
  )
}

