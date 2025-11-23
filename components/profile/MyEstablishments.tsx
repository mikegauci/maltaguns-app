'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EstablishmentInfoDialog } from '@/components/dialogs'
import { Store, Users, Wrench, MapPin, Plus, Info } from 'lucide-react'
import { Store as StoreType, Club, Servicing, Range } from '../../app/profile/types'

interface MyEstablishmentsProps {
  stores: StoreType[]
  clubs: Club[]
  servicing: Servicing[]
  ranges: Range[]
  handleDeleteStore: (storeId: string) => Promise<void> // eslint-disable-line unused-imports/no-unused-vars
  establishmentInfoOpen: boolean
  setEstablishmentInfoOpen: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
}

export const MyEstablishments = ({
  stores,
  clubs,
  servicing,
  ranges,
  handleDeleteStore,
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

        <EstablishmentInfoDialog
          open={establishmentInfoOpen}
          onOpenChange={setEstablishmentInfoOpen}
        />
      </>
    )
  }

  return (
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
              <div key={storeItem.id} className="border rounded-lg p-4 mb-4">
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
                  <Link href={`/blog/create?store_id=${storeItem.id}`} passHref>
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
                    href={`/establishments/clubs/${club.slug || club.id}/edit`}
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
            <h3 className="text-lg font-semibold mb-3">Servicing & Repair</h3>
            {servicing.map(service => (
              <div key={service.id} className="border rounded-lg p-4 mb-4">
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
            <h3 className="text-lg font-semibold mb-3">Shooting Ranges</h3>
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
                    href={`/establishments/ranges/${range.slug || range.id}`}
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
                Some of your establishments do not have a properly formatted URL
                slug. This will be fixed automatically.
              </AlertDescription>
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
