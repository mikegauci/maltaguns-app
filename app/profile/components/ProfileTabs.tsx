import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  User,
  Package,
  BookOpen,
  Calendar,
  Store,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'
import { UseFormReturn } from 'react-hook-form'

import { ProfileInformation } from './ProfileInformation'
import { SellerStatus } from './SellerStatus'
import { MyListings } from './MyListings'
import { MyBlogPosts } from './MyBlogPosts'
import { PaymentHistory } from './PaymentHistory'
import { MyEvents } from './MyEvents'
import { MyEstablishments } from './MyEstablishments'

import type {
  Profile,
  Listing,
  BlogPost,
  Event,
  CreditTransaction,
  Store as StoreType,
  ProfileForm,
} from '../types'

interface ProfileTabsProps {
  // Data
  profile: Profile
  listings: Listing[]
  listingCredits: number
  blogPosts: BlogPost[]
  events: Event[]
  eventCredits: number
  stores: StoreType[]
  clubs: StoreType[]
  servicing: StoreType[]
  ranges: StoreType[]
  creditTransactions: CreditTransaction[]
  listingIdToTitleMap: Record<string, string>

  // Form & UI State
  form: UseFormReturn<ProfileForm>
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  uploadingLicense: boolean
  uploadingIdCard: boolean
  licenseUploadProgress: number
  idCardUploadProgress: number
  establishmentInfoOpen: boolean
  setEstablishmentInfoOpen: (value: boolean) => void

  // Handlers
  onSubmit: (data: ProfileForm) => Promise<void>
  handleLicenseUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>
  handleIdCardUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>
  handleRemoveLicense: () => Promise<void>
  handleRemoveIdCard: () => Promise<void>
  handleListingStatusChange: (
    listingId: string,
    newStatus: string
  ) => Promise<void>
  handleRenewListing: (listingId: string) => Promise<void>
  confirmDeleteListing: (listingId: string) => void
  handleDeletePost: (postId: string) => Promise<void>
  handleDeleteEvent: (eventId: string) => Promise<void>
  handleDeleteStore: (storeId: string) => Promise<void>

  // Dialog setters
  setListingToFeature: (id: string | null) => void
  setFeatureDialogOpen: (open: boolean) => void
  setListingToRemoveFeature: (id: string | null) => void
  setRemoveFeatureDialogOpen: (open: boolean) => void
  setShowCreditDialog: (open: boolean) => void
  setShowEventCreditDialog: (open: boolean) => void
}

export function ProfileTabs({
  profile,
  listings,
  listingCredits,
  blogPosts,
  events,
  eventCredits,
  stores,
  clubs,
  servicing,
  ranges,
  creditTransactions,
  listingIdToTitleMap,
  form,
  isEditing,
  setIsEditing,
  uploadingLicense,
  uploadingIdCard,
  licenseUploadProgress,
  idCardUploadProgress,
  establishmentInfoOpen,
  setEstablishmentInfoOpen,
  onSubmit,
  handleLicenseUpload,
  handleIdCardUpload,
  handleRemoveLicense,
  handleRemoveIdCard,
  handleListingStatusChange,
  handleRenewListing,
  confirmDeleteListing,
  handleDeletePost,
  handleDeleteEvent,
  handleDeleteStore,
  setListingToFeature,
  setFeatureDialogOpen,
  setListingToRemoveFeature,
  setRemoveFeatureDialogOpen,
  setShowCreditDialog,
  setShowEventCreditDialog,
}: ProfileTabsProps) {
  const totalEstablishments =
    stores.length + clubs.length + servicing.length + ranges.length

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
        <TabsTrigger
          value="profile"
          className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3"
        >
          <User className="h-4 w-4" />
          <span className="text-xs sm:text-sm">Profile</span>
        </TabsTrigger>
        <TabsTrigger
          value="listings"
          className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3"
        >
          <Package className="h-4 w-4" />
          <span className="text-xs sm:text-sm flex items-center gap-1">
            Listings
            {listings.length > 0 && (
              <span className="hidden sm:inline rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground leading-none">
                {listings.length}
              </span>
            )}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="blog"
          className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3"
        >
          <BookOpen className="h-4 w-4" />
          <span className="text-xs sm:text-sm flex items-center gap-1">
            Blog
            {blogPosts.length > 0 && (
              <span className="hidden sm:inline rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground leading-none">
                {blogPosts.length}
              </span>
            )}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="events"
          className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3"
        >
          <Calendar className="h-4 w-4" />
          <span className="text-xs sm:text-sm flex items-center gap-1">
            Events
            {events.length > 0 && (
              <span className="hidden sm:inline rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground leading-none">
                {events.length}
              </span>
            )}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="establishments"
          className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3"
        >
          <Store className="h-4 w-4" />
          <span className="text-xs sm:text-sm flex items-center gap-1">
            Business
            {totalEstablishments > 0 && (
              <span className="hidden sm:inline rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground leading-none">
                {totalEstablishments}
              </span>
            )}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="billing"
          className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3"
        >
          <CreditCard className="h-4 w-4" />
          <span className="text-xs sm:text-sm">Billing</span>
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
          uploadingIdCard={uploadingIdCard}
          licenseUploadProgress={licenseUploadProgress}
          idCardUploadProgress={idCardUploadProgress}
          handleLicenseUpload={handleLicenseUpload}
          handleIdCardUpload={handleIdCardUpload}
          handleRemoveLicense={handleRemoveLicense}
          handleRemoveIdCard={handleRemoveIdCard}
        />
      </TabsContent>

      {/* Listings Tab */}
      <TabsContent value="listings">
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
      </TabsContent>

      {/* Blog Tab */}
      <TabsContent value="blog">
        {blogPosts.length > 0 ? (
          <MyBlogPosts
            blogPosts={blogPosts}
            handleDeletePost={handleDeletePost}
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
            handleDeleteEvent={handleDeleteEvent}
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
          handleDeleteStore={handleDeleteStore}
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
              <CardDescription>
                Available credits for marketplace listings
              </CardDescription>
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
              <CardDescription>
                Available credits for event listings
              </CardDescription>
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
  )
}
