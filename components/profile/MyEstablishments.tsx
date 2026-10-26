'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AppCard } from '@/components/design-system'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EstablishmentInfoDialog } from '@/components/dialogs'
import { Store, Users, Wrench, MapPin, Plus, Info } from 'lucide-react'
import {
  Store as StoreType,
  Club,
  Servicing,
  Range,
  EstablishmentStatus,
} from '../../app/profile/types'

interface MyEstablishmentsProps {
  stores: StoreType[]
  clubs: Club[]
  servicing: Servicing[]
  ranges: Range[]
  handleDeleteEstablishment: (
    establishmentId: string,
    table: 'stores' | 'clubs' | 'servicing' | 'ranges'
  ) => Promise<void>
  establishmentInfoOpen: boolean
  setEstablishmentInfoOpen: (open: boolean) => void
}

function StatusBadge({ status }: { status: EstablishmentStatus }) {
  if (status === 'pending') {
    return (
      <Badge
        variant="outline"
        className="mt-1 border-amber-600 text-amber-400 hover:bg-transparent"
      >
        Pending approval
      </Badge>
    )
  }
  if (status === 'rejected') {
    return (
      <Badge
        variant="outline"
        className="mt-1 border-destructive text-destructive hover:bg-transparent"
      >
        Rejected
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="mt-1 border-emerald-600 text-emerald-400 hover:bg-transparent"
    >
      Live
    </Badge>
  )
}

function EstablishmentActions({
  typePath,
  slug,
  id,
  status,
  onDelete,
  showBlog,
}: {
  typePath: string
  slug: string | null
  id: string
  status: EstablishmentStatus
  onDelete: () => void
  showBlog?: boolean
}) {
  const pathSegment = slug || id
  const isActive = status === 'active'

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {isActive && (
        <Link href={`/establishments/${typePath}/${pathSegment}`} passHref>
          <Button size="sm" variant="outline">
            View Profile
          </Button>
        </Link>
      )}
      <Link href={`/establishments/${typePath}/${pathSegment}/edit`} passHref>
        <Button size="sm" variant="outline">
          Edit Profile
        </Button>
      </Link>
      {showBlog && isActive && (
        <Link href={`/blog/create?store_id=${id}`} passHref>
          <Button size="sm" variant="outline">
            Add Blog Post
          </Button>
        </Link>
      )}
      <Button size="sm" variant="destructive" onClick={onDelete}>
        Delete Profile
      </Button>
    </div>
  )
}

export const MyEstablishments = ({
  stores,
  clubs,
  servicing,
  ranges,
  handleDeleteEstablishment,
  establishmentInfoOpen,
  setEstablishmentInfoOpen,
}: MyEstablishmentsProps) => {
  const hasEstablishments =
    stores.length > 0 ||
    clubs.length > 0 ||
    servicing.length > 0 ||
    ranges.length > 0

  if (!hasEstablishments) {
    return (
      <>
        <AppCard className="mb-8 w-full">
          <CardHeader>
            <CardTitle>Create Establishment</CardTitle>
            <CardDescription className="flex items-center gap-2">
              Create your business profile to connect with the local shooting
              community{' '}
              <Button
                variant="outline"
                className="flex h-7 items-center gap-1.5 rounded-sm text-xs font-normal"
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
        </AppCard>

        <EstablishmentInfoDialog
          open={establishmentInfoOpen}
          onOpenChange={setEstablishmentInfoOpen}
        />
      </>
    )
  }

  return (
    <AppCard className="mb-8 w-full">
      <CardHeader>
        <CardTitle>My Establishments</CardTitle>
        <CardDescription>
          Manage your firearms business listings on MaltaGuns
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stores.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-3">Stores</h3>
            {stores.map(storeItem => (
              <div
                key={storeItem.id}
                className="mb-4 rounded-sm border border-border p-4"
              >
                <div className="flex items-center gap-4 mb-4">
                  {storeItem.logo_url ? (
                    <img
                      src={storeItem.logo_url}
                      alt={storeItem.business_name}
                      className="w-16 h-16 object-contain rounded-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center">
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
                    <div className="flex flex-wrap gap-1 mt-1">
                      <StatusBadge status={storeItem.status || 'active'} />
                      {!storeItem.slug && (
                        <Badge variant="outline">No slug</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <EstablishmentActions
                  typePath="stores"
                  slug={storeItem.slug}
                  id={storeItem.id}
                  status={storeItem.status || 'active'}
                  onDelete={() =>
                    handleDeleteEstablishment(storeItem.id, 'stores')
                  }
                  showBlog
                />
              </div>
            ))}
          </>
        )}

        {clubs.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-3">Clubs</h3>
            {clubs.map(club => (
              <div
                key={club.id}
                className="mb-4 rounded-sm border border-border p-4"
              >
                <div className="flex items-center gap-4 mb-4">
                  {club.logo_url ? (
                    <img
                      src={club.logo_url}
                      alt={club.business_name}
                      className="w-16 h-16 object-contain rounded-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center">
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
                    <div className="flex flex-wrap gap-1 mt-1">
                      <StatusBadge status={club.status || 'active'} />
                      {!club.slug && <Badge variant="outline">No slug</Badge>}
                    </div>
                  </div>
                </div>
                <EstablishmentActions
                  typePath="clubs"
                  slug={club.slug}
                  id={club.id}
                  status={club.status || 'active'}
                  onDelete={() => handleDeleteEstablishment(club.id, 'clubs')}
                />
              </div>
            ))}
          </>
        )}

        {servicing.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-3">Servicing & Repair</h3>
            {servicing.map(service => (
              <div
                key={service.id}
                className="mb-4 rounded-sm border border-border p-4"
              >
                <div className="flex items-center gap-4 mb-4">
                  {service.logo_url ? (
                    <img
                      src={service.logo_url}
                      alt={service.business_name}
                      className="w-16 h-16 object-contain rounded-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center">
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
                    <div className="flex flex-wrap gap-1 mt-1">
                      <StatusBadge status={service.status || 'active'} />
                      {!service.slug && (
                        <Badge variant="outline">No slug</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <EstablishmentActions
                  typePath="servicing"
                  slug={service.slug}
                  id={service.id}
                  status={service.status || 'active'}
                  onDelete={() =>
                    handleDeleteEstablishment(service.id, 'servicing')
                  }
                />
              </div>
            ))}
          </>
        )}

        {ranges.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-3">Shooting Ranges</h3>
            {ranges.map(range => (
              <div
                key={range.id}
                className="mb-4 rounded-sm border border-border p-4"
              >
                <div className="flex items-center gap-4 mb-4">
                  {range.logo_url ? (
                    <img
                      src={range.logo_url}
                      alt={range.business_name}
                      className="w-16 h-16 object-contain rounded-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center">
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
                    <div className="flex flex-wrap gap-1 mt-1">
                      <StatusBadge status={range.status || 'active'} />
                      {!range.slug && <Badge variant="outline">No slug</Badge>}
                    </div>
                  </div>
                </div>
                <EstablishmentActions
                  typePath="ranges"
                  slug={range.slug}
                  id={range.id}
                  status={range.status || 'active'}
                  onDelete={() => handleDeleteEstablishment(range.id, 'ranges')}
                />
              </div>
            ))}
          </>
        )}

        {(stores.length > 1 ||
          clubs.length > 0 ||
          servicing.length > 0 ||
          ranges.length > 0) && (
          <Alert className="mt-4 mb-2">
            {[...stores, ...clubs, ...servicing, ...ranges].some(
              e => !e.slug
            ) && (
              <AlertDescription className="mb-2">
                Some of your establishments do not have a properly formatted URL
                slug. This will be fixed automatically.
              </AlertDescription>
            )}
          </Alert>
        )}
      </CardContent>
    </AppCard>
  )
}
