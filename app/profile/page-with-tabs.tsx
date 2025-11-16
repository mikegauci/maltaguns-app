'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2, X, User, Package, BookOpen, Calendar, Store, CreditCard, Shield } from 'lucide-react'
import { FeatureCreditDialog } from '@/components/feature-credit-dialog'
import { CreditDialog } from '@/components/credit-dialog'
import { EventCreditDialog } from '@/components/event-credit-dialog'
import { useSupabase } from '@/components/providers/supabase-provider'
import { LoadingState } from '@/components/ui/loading-state'

// Import types
import { profileSchema, ProfileForm } from './types'

// Import custom hooks
import { useProfileData } from './hooks/useProfileData'

// Import handlers
import { createProfileHandlers } from './handlers/profileHandlers'
import { createContentHandlers } from './handlers/contentHandlers'

// Import components
import { ProfileInformation } from './components/ProfileInformation'
import { SellerStatus } from './components/SellerStatus'
import { MyListings } from './components/MyListings'
import { MyBlogPosts } from './components/MyBlogPosts'
import { PaymentHistory } from './components/PaymentHistory'
import { MyEvents } from './components/MyEvents'
import { MyEstablishments } from './components/MyEstablishments'

export default function ProfilePage() {
  const { toast } = useToast()
  const { supabase, session } = useSupabase()

  // UI State
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingLicense, setUploadingLicense] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [listingToDelete, setListingToDelete] = useState<string | null>(null)
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false)
  const [listingToFeature, setListingToFeature] = useState<string | null>(null)
  const [removeFeatureDialogOpen, setRemoveFeatureDialogOpen] = useState(false)
  const [listingToRemoveFeature, setListingToRemoveFeature] = useState<string | null>(null)
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

  // Use custom hook for data management
  const {
    profile,
    setProfile,
    listings,
    setListings,
    stores,
    setStores,
    clubs,
    setClubs,
    servicing,
    setServicing,
    ranges,
    setRanges,
    blogPosts,
    setBlogPosts,
    events,
    setEvents,
    creditTransactions,
    setCreditTransactions,
    listingIdToTitleMap,
    loading,
    listingCredits,
    eventCredits,
    refreshCredits,
  } = useProfileData({ supabase, session, form })

  // Create handlers
  const profileHandlers = createProfileHandlers({
    supabase,
    toast,
    setProfile,
    setListings,
    profile,
  })

  const contentHandlers = createContentHandlers({
    supabase,
    toast,
    setBlogPosts,
    setEvents,
    setStores,
    setClubs,
    setServicing,
    setRanges,
  })

  // Wrapper functions for handlers that need additional state
  const handleLicenseUpload = (event: React.ChangeEvent<HTMLInputElement>) =>
    profileHandlers.handleLicenseUpload(event, uploadingLicense, setUploadingLicense)

  const handleDeleteListing = (listingId: string) =>
    profileHandlers.handleDeleteListing(listingId, setDeleteDialogOpen, setListingToDelete)

  const handleRenewalSuccess = () =>
    profileHandlers.handleRenewalSuccess(listingToFeature, setListingToFeature, refreshCredits)

  const onSubmit = (data: ProfileForm) => profileHandlers.onSubmit(data, setIsEditing)

  const confirmDeleteListing = (listingId: string) => {
    setListingToDelete(listingId)
    setDeleteDialogOpen(true)
  }

  // Calculate total establishments
  const totalEstablishments = stores.length + clubs.length + servicing.length + ranges.length

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
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">Manage your account and content</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-3">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex items-center gap-2 py-3">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Listings</span>
              {listings.length > 0 && (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {listings.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-2 py-3">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Blog</span>
              {blogPosts.length > 0 && (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {blogPosts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2 py-3">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Events</span>
              {events.length > 0 && (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {events.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="establishments" className="flex items-center gap-2 py-3">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Business</span>
              {totalEstablishments > 0 && (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {totalEstablishments}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2 py-3">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
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
              handleRemoveLicense={profileHandlers.handleRemoveLicense}
            />
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings">
            <MyListings
              listings={listings}
              listingCredits={listingCredits}
              handleListingStatusChange={profileHandlers.handleListingStatusChange}
              handleRenewListing={profileHandlers.handleRenewListing}
              confirmDeleteListing={confirmDeleteListing}
              setListingToFeature={setListingToFeature}
              setFeatureDialogOpen={setFeatureDialogOpen}
              setListingToRemoveFeature={setListingToRemoveFeature}
              setRemoveFeatureDialogOpen={setRemoveFeatureDialogOpen}
              setShowCreditDialog={setShowCreditDialog}
            />
          </TabsContent>

          {/* Blog Tab */}
          <TabsContent value="blog">
            {blogPosts.length > 0 ? (
              <MyBlogPosts 
                blogPosts={blogPosts} 
                handleDeletePost={contentHandlers.handleDeletePost} 
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No blog posts yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Start sharing your knowledge and experiences with the community
                  </p>
                  <Link href="/blog/create">
                    <Button>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Write Your First Post
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            {events.length > 0 ? (
              <MyEvents
                events={events}
                eventCredits={eventCredits}
                handleDeleteEvent={contentHandlers.handleDeleteEvent}
                setShowEventCreditDialog={setShowEventCreditDialog}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create and manage shooting events for the community
                  </p>
                  <Link href="/events/create">
                    <Button>
                      <Calendar className="h-4 w-4 mr-2" />
                      Create Your First Event
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Establishments Tab */}
          <TabsContent value="establishments">
            <MyEstablishments
              stores={stores}
              clubs={clubs}
              servicing={servicing}
              ranges={ranges}
              handleDeleteStore={contentHandlers.handleDeleteStore}
              establishmentInfoOpen={establishmentInfoOpen}
              setEstablishmentInfoOpen={setEstablishmentInfoOpen}
            />
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            {/* Credits Overview */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Listing Credits</CardTitle>
                  <CardDescription>Available credits for marketplace listings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{listingCredits}</div>
                    <Button
                      onClick={() => setShowCreditDialog(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Add Credits
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Credits</CardTitle>
                  <CardDescription>Available credits for event listings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{eventCredits}</div>
                    <Button
                      onClick={() => setShowEventCreditDialog(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Add Credits
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment History */}
            <PaymentHistory
              creditTransactions={creditTransactions}
              listingIdToTitleMap={listingIdToTitleMap}
            />
          </TabsContent>
        </Tabs>

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
                    profileHandlers.handleRemoveFeature(listingToRemoveFeature)
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
            refreshCredits()
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
            refreshCredits()
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

