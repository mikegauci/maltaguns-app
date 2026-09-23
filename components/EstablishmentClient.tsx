'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, Mail, Globe, BookOpen, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'
import { StorageImage } from '@/components/ui/storage-image'
import { useEffect, useState } from 'react'
import BlogPostCard from '@/components/blog/BlogPostCard'
import { EditButton } from '@/components/ui/edit-button'
import {
  AppAlert,
  AppCard,
  AppSectionHeading,
} from '@/components/design-system'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import {
  EstablishmentWithDetails,
  EstablishmentType,
} from '@/app/establishments/types'
import { getEstablishmentConfig } from '@/app/establishments/config'
import { listingPublicPath } from '@/lib/listing-slug'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { formatPrice } from '@/lib/format'
import { scheduleEffectWork } from '@/lib/schedule-effect-work'

interface EstablishmentClientProps {
  establishment: EstablishmentWithDetails
  type: EstablishmentType
}

export default function EstablishmentClient({
  establishment,
  type,
}: EstablishmentClientProps) {
  const { supabase, session } = useSupabase()
  const isOwner = Boolean(
    session?.user?.id && session.user.id === establishment.owner_id
  )
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger] = useState(0)

  const config = getEstablishmentConfig(type)
  const Icon = config.icon
  const isLive = establishment.status === 'active'

  useEffect(() => {
    scheduleEffectWork(() => {
      if (Array.isArray(establishment.blogPosts)) {
        setBlogPosts(establishment.blogPosts)
      } else {
        setBlogPosts([])
      }

      setLoading(false)
    })
  }, [establishment.blogPosts])

  // Fetch blog posts directly from the client side as a fallback
  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from('blog_posts')
          .select(
            `
            id,
            title,
            slug,
            meta_description,
            featured_image,
            created_at,
            category,
            author:profiles(username)
          `
          )
          .eq(config.blogForeignKey, establishment.id)
          .eq('published', true)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching blog posts from client:', error)
        } else if (data) {
          setBlogPosts(data)
        }
      } catch (error) {
        console.error('Error in client-side fetch:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBlogPosts()
  }, [
    establishment.id,
    refreshTrigger,
    config.label,
    config.blogForeignKey,
    supabase,
  ])

  return (
    <PageLayout>
      <PageHeader
        align="center"
        backHref={config.baseUrl}
        title={establishment.business_name}
        description={establishment.location}
        actions={
          isOwner && isLive ? (
            <EditButton
              label="Edit Profile"
              href={`${config.baseUrl}/${establishment.slug || establishment.id}/edit`}
              hideLabelOnMobile={false}
            />
          ) : undefined
        }
      />

      {!isLive && (
        <AppAlert
          className="mb-6"
          variant={establishment.status === 'pending' ? 'pending' : 'rejected'}
          icon={
            establishment.status === 'pending' ? (
              <Clock className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )
          }
        >
          {establishment.status === 'pending'
            ? 'This establishment is pending approval and is not visible to the public yet. You will be notified once it is approved.'
            : 'This establishment was not approved and is not visible to the public.'}
        </AppAlert>
      )}

      {/* Establishment Profile */}
      <Card className="mb-6 rounded-sm border-border shadow-none">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {establishment.logo_url ? (
              <img
                src={establishment.logo_url}
                alt={establishment.business_name}
                className="mx-auto h-20 w-20 rounded-sm object-contain sm:mx-0 sm:h-32 sm:w-32"
              />
            ) : (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-sm bg-muted sm:mx-0 sm:h-32 sm:w-32">
                <Icon className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 w-full">
              <div className="space-y-2 mb-4">
                {establishment.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                    <a
                      href={`tel:${establishment.phone}`}
                      className="hover:underline text-sm sm:text-base"
                    >
                      {establishment.phone}
                    </a>
                  </div>
                )}
                {establishment.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                    <a
                      href={`mailto:${establishment.email}`}
                      className="hover:underline text-sm sm:text-base break-all"
                    >
                      {establishment.email}
                    </a>
                  </div>
                )}
                {establishment.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                    <a
                      href={establishment.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-sm sm:text-base break-all"
                    >
                      {establishment.website}
                    </a>
                  </div>
                )}
              </div>

              {establishment.description && (
                <p className="text-muted-foreground whitespace-pre-wrap text-sm sm:text-base">
                  {establishment.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listings Section */}
      <div className="mb-6">
        <AppSectionHeading className="mb-2 text-2xl">
          Available Listings
        </AppSectionHeading>

        {establishment.listings.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              No active listings available.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {establishment.listings.map(listing => (
              <Link key={listing.id} href={listingPublicPath(listing)}>
                <AppCard>
                  <div className="aspect-video relative overflow-hidden">
                    <StorageImage
                      src={listing.thumbnail}
                      alt={listing.title}
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <CardContent className="p-4">
                    <Badge className="mb-2">
                      {listing.type === 'firearms'
                        ? 'Firearms'
                        : 'Non-Firearms'}
                    </Badge>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                      {listing.title}
                    </h3>
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(listing.price)}
                    </p>
                  </CardContent>
                </AppCard>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Blog Posts Section */}
      <div>
        <div className="flex items-center justify-between">
          <AppSectionHeading className="mb-2 text-2xl">
            Latest Posts
          </AppSectionHeading>

          {isOwner && isLive && (
            <Link
              href={`/blog/create?${config.createQueryParam}=${establishment.id}`}
            >
              <Button>
                <BookOpen className="h-4 w-4 mr-2" />
                Write Post
              </Button>
            </Link>
          )}
        </div>

        {blogPosts.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              {loading ? 'Loading posts...' : 'No blog posts available.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map(post => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
