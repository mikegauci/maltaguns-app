'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, Mail, Globe, BookOpen, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import BlogPostCard from '@/components/blog/BlogPostCard'
import { BackButton } from '@/components/ui/back-button'
import {
  EstablishmentWithDetails,
  EstablishmentType,
} from '@/app/establishments/types'
import { getEstablishmentConfig } from '@/app/establishments/config'

interface EstablishmentClientProps {
  establishment: EstablishmentWithDetails
  type: EstablishmentType
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-MT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

export default function EstablishmentClient({
  establishment,
  type,
}: EstablishmentClientProps) {
  const [isOwner, setIsOwner] = useState(false)
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger] = useState(0)

  const config = getEstablishmentConfig(type)
  const Icon = config.icon

  useEffect(() => {
    // Check if current user is the owner
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsOwner(session.user.id === establishment.owner_id)
      }
    })

    // Update blog posts if they change
    if (Array.isArray(establishment.blogPosts)) {
      setBlogPosts(establishment.blogPosts)
    } else {
      setBlogPosts([])
    }

    setLoading(false)
  }, [establishment.owner_id, establishment.blogPosts])

  // Fetch blog posts directly from the client side as a fallback
  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        console.log(
          `Fetching blog posts for ${config.label} ID: ${establishment.id}`
        )
        setLoading(true)

        const { data, error } = await supabase
          .from('blog_posts')
          .select(
            `
            id,
            title,
            slug,
            content,
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
        } else if (data && data.length > 0) {
          console.log(`Found ${data.length} blog posts:`, data)
          setBlogPosts(data)
        } else {
          console.log(`No blog posts found for this ${config.label}`)
        }
      } catch (error) {
        console.error('Error in client-side fetch:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBlogPosts()
  }, [establishment.id, refreshTrigger, config.label, config.blogForeignKey])

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <BackButton
            label={`Back to ${config.labelPlural}`}
            href={config.baseUrl}
          />

          {isOwner && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href={`/blog/create?${config.createQueryParam}=${establishment.id}`}
                className="w-full sm:w-auto"
              >
                <Button className="bg-primary w-full sm:w-auto">
                  <Pencil className="h-4 w-4 mr-2" />
                  Create New Post
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Establishment Profile */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              {establishment.logo_url ? (
                <img
                  src={establishment.logo_url}
                  alt={establishment.business_name}
                  className="w-20 h-20 sm:w-32 sm:h-32 object-contain rounded-lg mx-auto sm:mx-0"
                />
              ) : (
                <div className="w-20 h-20 sm:w-32 sm:h-32 bg-muted rounded-lg flex items-center justify-center mx-auto sm:mx-0">
                  <Icon className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 w-full">
                <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-center sm:text-left">
                  {establishment.business_name}
                </h1>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm sm:text-base">
                      {establishment.location}
                    </span>
                  </div>
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
        <div>
          <h2 className="text-2xl font-bold mb-6">Available Listings</h2>

          {establishment.listings.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">
                No active listings available.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {establishment.listings.map(listing => (
                <Link
                  key={listing.id}
                  href={`/marketplace/listing/${slugify(listing.title)}`}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={listing.thumbnail}
                        alt={listing.title}
                        className="object-cover w-full h-full"
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
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Blog Posts Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Latest Posts</h2>

            {isOwner && (
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
      </div>
    </div>
  )
}
