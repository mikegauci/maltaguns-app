'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Package,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  Star,
  Calendar,
  X,
} from 'lucide-react'
import { Listing } from '../../app/profile/types'
import { formatPrice, slugify } from '../../app/profile/utils'
import { StatusSelect } from './StatusSelect'

function formatTimeLeft(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// eslint-disable-next-line unused-imports/no-unused-vars
interface MyListingsProps {
  listings: Listing[]
  listingCredits: number
  handleListingStatusChange: (id: string, value: string) => Promise<void> // eslint-disable-line unused-imports/no-unused-vars
  handleRenewListing: (listingId: string) => Promise<void> // eslint-disable-line unused-imports/no-unused-vars
  confirmDeleteListing: (listingId: string) => void // eslint-disable-line unused-imports/no-unused-vars
  setListingToFeature: (listingId: string | null) => void // eslint-disable-line unused-imports/no-unused-vars
  setFeatureDialogOpen: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
  setListingToRemoveFeature: (listingId: string | null) => void // eslint-disable-line unused-imports/no-unused-vars
  setRemoveFeatureDialogOpen: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
  setShowCreditDialog: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
}

export const MyListings = ({
  listings,
  listingCredits,
  handleListingStatusChange,
  handleRenewListing,
  confirmDeleteListing,
  setListingToFeature,
  setFeatureDialogOpen,
  setListingToRemoveFeature,
  setRemoveFeatureDialogOpen,
  setShowCreditDialog,
}: MyListingsProps) => {
  const [showExpired, setShowExpired] = useState(false)

  const { activeListings, expiredListings } = useMemo(() => {
    const active: Listing[] = []
    const expired: Listing[] = []
    for (const l of listings) {
      if (l.is_expired) expired.push(l)
      else active.push(l)
    }
    return { activeListings: active, expiredListings: expired }
  }, [listings])

  const now = new Date()

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>My Listings</CardTitle>
          <CardDescription>Manage your marketplace listings</CardDescription>
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
          {activeListings.map(listing => {
            const editableUntil = (listing as any).editable_until as
              | string
              | null
              | undefined
            const editableUntilMs = (() => {
              if (editableUntil) {
                const ts = Date.parse(editableUntil)
                return Number.isNaN(ts) ? null : ts
              }
              const createdTs = Date.parse(listing.created_at)
              return Number.isNaN(createdTs)
                ? null
                : createdTs + 48 * 60 * 60 * 1000
            })()

            const editTimeLeftMs =
              editableUntilMs === null ? null : editableUntilMs - now.getTime()

            const isEditLocked = editTimeLeftMs !== null && editTimeLeftMs <= 0

            return (
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
                        <div className="flex flex-col">
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

                          {editTimeLeftMs !== null &&
                            editTimeLeftMs > 0 &&
                            listing.status !== 'sold' && (
                              <div className="flex items-center gap-2">
                                <Pencil className="h-4 w-4" />
                                <span className="text-medium text-muted-foreground">
                                  Editable for {formatTimeLeft(editTimeLeftMs)}
                                </span>
                              </div>
                            )}

                          {/* Reason when Edit is disabled */}
                          {(listing.status === 'sold' || isEditLocked) && (
                            <div className="flex items-center gap-2">
                              <Pencil className="h-4 w-4" />
                              <span className="text-medium text-red-500">
                                {listing.status === 'sold'
                                  ? 'Sold listings cannot be edited.'
                                  : 'Editing locked (48-hour window ended). Contact an admin to re-enable edits.'}
                              </span>
                            </div>
                          )}
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

                        {listing.status === 'sold' || isEditLocked ? (
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
            )
          })}

          {expiredListings.length > 0 && (
            <Card className="border-dashed">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">Expired listings</p>
                    <p className="text-sm text-muted-foreground">
                      {expiredListings.length} listing
                      {expiredListings.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowExpired(v => !v)}
                    className="w-full sm:w-auto"
                  >
                    {showExpired ? 'Hide' : 'Show'}
                  </Button>
                </div>

                {showExpired && (
                  <div className="mt-4 space-y-4">
                    {expiredListings.map(listing => (
                      <Card
                        key={listing.id}
                        className="relative overflow-hidden"
                      >
                        <CardContent className="p-4">
                          <div className="grid gap-3 sm:grid-cols-2 sm:items-center">
                            <div className="blur-[1.5px] select-none pointer-events-none">
                              <div className="flex items-center gap-2">
                                {listing.type === 'firearms' ? (
                                  <Image
                                    src="/images/pistol-gun-icon.svg"
                                    alt="Firearms"
                                    width={16}
                                    height={16}
                                    className="mr-2"
                                  />
                                ) : (
                                  <Package className="h-4 w-4 mr-2" />
                                )}
                                <p className="font-semibold">{listing.title}</p>
                              </div>
                              <p className="text-sm text-muted-foreground mt-2">
                                {formatPrice(listing.price)}
                              </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:items-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRenewListing(listing.id)}
                                className="bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 border-orange-200 w-full sm:w-auto"
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Relist for 30 days
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
