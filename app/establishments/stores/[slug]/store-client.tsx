'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Globe,
  BookOpen,
  Pencil,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import BlogPostCard from '@/app/components/blog/BlogPostCard'
import { BackButton } from '@/components/ui/back-button'

interface Store {
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

export default function StoreClient({ store }: { store: Store }) {
  const router = useRouter()
  const [isOwner, setIsOwner] = useState(false)
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Check if blog posts array is valid
  const hasBlogPosts =
    Array.isArray(store.blogPosts) && store.blogPosts.length > 0

  useEffect(() => {
    // Check if current user is the owner of this store
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsOwner(session.user.id === store.owner_id)
      }
    })

    // Update blog posts if they change
    if (Array.isArray(store.blogPosts)) {
      setBlogPosts(store.blogPosts)
    } else {
      setBlogPosts([]) // Set to empty array if not valid
    }

    setLoading(false)
  }, [store.owner_id, store.blogPosts])

  // Fetch blog posts directly from the client side as a fallback
  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        console.log(`Fetching blog posts for store ID: ${store.id}`)
        setLoading(true)

        // Fetch blog posts from blog_posts table with store_id filter
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
          .eq('store_id', store.id)
          .eq('published', true)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching blog posts from client:', error)
        } else if (data && data.length > 0) {
          console.log(`Found ${data.length} blog posts for store:`, data)
          // Set the blog posts
          setBlogPosts(data)
        } else {
          console.log('No blog posts found for this store')
        }
      } catch (error) {
        console.error('Error in client-side fetch:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBlogPosts()
  }, [store.id, refreshTrigger])

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <BackButton label="Back to Stores" href="/establishments/stores" />

          {isOwner && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href={`/blog/create?store_id=${store.id}`}
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

        {/* Store Profile */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.business_name}
                  className="w-20 h-20 sm:w-32 sm:h-32 object-contain rounded-lg mx-auto sm:mx-0"
                />
              ) : (
                <div className="w-20 h-20 sm:w-32 sm:h-32 bg-muted rounded-lg flex items-center justify-center mx-auto sm:mx-0">
                  <Store className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 w-full">
                <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-center sm:text-left">
                  {store.business_name}
                </h1>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm sm:text-base">
                      {store.location}
                    </span>
                  </div>
                  {store.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                      <a
                        href={`tel:${store.phone}`}
                        className="hover:underline text-sm sm:text-base"
                      >
                        {store.phone}
                      </a>
                    </div>
                  )}
                  {store.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                      <a
                        href={`mailto:${store.email}`}
                        className="hover:underline text-sm sm:text-base break-all"
                      >
                        {store.email}
                      </a>
                    </div>
                  )}
                  {store.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                      <a
                        href={store.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-sm sm:text-base break-all"
                      >
                        {store.website}
                      </a>
                    </div>
                  )}
                </div>

                {store.description && (
                  <p className="text-muted-foreground whitespace-pre-wrap text-sm sm:text-base">
                    {store.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listings Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Available Listings</h2>

          {store.listings.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">
                No active listings available.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {store.listings.map(listing => (
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
              <Link href={`/blog/create?store_id=${store.id}`}>
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
