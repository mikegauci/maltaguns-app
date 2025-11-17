'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Store as StoreIcon,
  MapPin,
  Phone,
  Mail,
  Globe,
  BookOpen,
  Pencil,
} from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import BlogPostCard from '@/app/components/blog/BlogPostCard'

interface Servicing {
  id: string
  business_name: string
  logo_url: string | null
  location: string
  phone: string | null
  email: string | null
  description: string | null
  website: string | null
  owner_id: string
  slug: string
  listings: {
    id: string
    title: string
    type: 'firearms' | 'non_firearms'
    category: string
    price: number
    thumbnail: string
    created_at: string
  }[]
  blogPosts: {
    id: string
    title: string
    slug: string
    content: string
    featured_image: string | null
    created_at: string
    author: {
      username: string
    }
    category: string
  }[]
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

function truncateText(text: string, words: number) {
  // Remove HTML tags
  const strippedText = text.replace(/<[^>]*>/g, '')
  const wordArray = strippedText.split(' ')
  if (wordArray.length <= words) return strippedText
  return wordArray.slice(0, words).join(' ') + '...'
}

export default function ServicingClient({
  servicing,
}: {
  servicing: Servicing
}) {
  const router = useRouter()
  const [isOwner, setIsOwner] = useState(false)
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Check if blog posts array is valid
  const hasBlogPosts =
    Array.isArray(servicing.blogPosts) && servicing.blogPosts.length > 0

  useEffect(() => {
    // Check if current user is the owner of this servicing
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsOwner(session.user.id === servicing.owner_id)
      }
    })

    // Update blog posts if they change
    if (Array.isArray(servicing.blogPosts)) {
      setBlogPosts(servicing.blogPosts)
    } else {
      setBlogPosts([]) // Set to empty array if not valid
    }

    setLoading(false)
  }, [servicing.owner_id, servicing.blogPosts])

  // Fetch blog posts directly from the client side as a fallback
  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        console.log(`Fetching blog posts for servicing ID: ${servicing.id}`)
        setLoading(true)

        // Fetch blog posts from blog_posts table with servicing_id filter
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
          .eq('servicing_id', servicing.id)
          .eq('published', true)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching blog posts from client:', error)
        } else if (data && data.length > 0) {
          console.log(`Found ${data.length} blog posts for servicing:`, data)
          // Set the blog posts
          setBlogPosts(data)
        } else {
          console.log('No blog posts found for this servicing')
        }
      } catch (error) {
        console.error('Error in client-side fetch:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBlogPosts()
  }, [servicing.id, refreshTrigger])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="mb-6 flex items-center justify-between">
          <BackButton
            label="Back to Servicing"
            href="/establishments/servicing"
          />

          {isOwner && (
            <div className="flex items-center gap-2">
              <Link href={`/blog/create?servicing_id=${servicing.id}`}>
                <Button className="bg-primary">
                  <Pencil className="h-4 w-4 mr-2" />
                  Create New Post
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Servicing Profile */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {servicing.logo_url ? (
                <img
                  src={servicing.logo_url}
                  alt={servicing.business_name}
                  className="w-32 h-32 object-contain rounded-lg"
                />
              ) : (
                <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                  <StoreIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-4">
                  {servicing.business_name}
                </h1>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>{servicing.location}</span>
                  </div>
                  {servicing.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <a
                        href={`tel:${servicing.phone}`}
                        className="hover:underline"
                      >
                        {servicing.phone}
                      </a>
                    </div>
                  )}
                  {servicing.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <a
                        href={`mailto:${servicing.email}`}
                        className="hover:underline"
                      >
                        {servicing.email}
                      </a>
                    </div>
                  )}
                  {servicing.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <a
                        href={servicing.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {servicing.website}
                      </a>
                    </div>
                  )}
                </div>

                {servicing.description && (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {servicing.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listings Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Available Listings</h2>

          {servicing.listings.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">
                No active listings available.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicing.listings.map(listing => (
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
              <Link href={`/blog/create?servicing_id=${servicing.id}`}>
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
