'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, Mail, Globe, BookOpen, Pencil } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import BlogPostCard from '@/app/components/blog/BlogPostCard'

interface Range {
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

export default function RangeClient({ range }: { range: Range }) {
  const router = useRouter()
  const [isOwner, setIsOwner] = useState(false)
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Check if blog posts array is valid
  const hasBlogPosts =
    Array.isArray(range.blogPosts) && range.blogPosts.length > 0

  useEffect(() => {
    // Check if current user is the owner of this range
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsOwner(session.user.id === range.owner_id)
      }
    })

    // Update blog posts if they change
    if (Array.isArray(range.blogPosts)) {
      setBlogPosts(range.blogPosts)
    } else {
      setBlogPosts([]) // Set to empty array if not valid
    }

    setLoading(false)
  }, [range.owner_id, range.blogPosts])

  // Fetch blog posts directly from the client side as a fallback
  useEffect(() => {
    if (!hasBlogPosts && !loading) {
      const fetchBlogPosts = async () => {
        try {
          // Fetch blog posts from blog_posts table with range_id filter
          const { data, error } = await supabase
            .from('blog_posts')
            .select('*, author:profiles(username)')
            .eq('range_id', range.id)
            .eq('published', true)
            .order('created_at', { ascending: false })

          if (error) {
            console.error('Error fetching blog posts from client:', error)
          } else if (data && data.length > 0) {
            // Set the blog posts
            setBlogPosts(data)
          }
        } catch (error) {
          console.error('Error in client-side fetch:', error)
        }
      }

      fetchBlogPosts()
    }
  }, [hasBlogPosts, loading, range.id])

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <BackButton label="Back to Ranges" href="/establishments/ranges" />

          {isOwner && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href={`/blog/create?range_id=${range.id}`}
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

        {/* Range Profile */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              {range.logo_url ? (
                <img
                  src={range.logo_url}
                  alt={range.business_name}
                  className="w-20 h-20 sm:w-32 sm:h-32 object-contain rounded-lg mx-auto sm:mx-0"
                />
              ) : (
                <div className="w-20 h-20 sm:w-32 sm:h-32 bg-muted rounded-lg flex items-center justify-center mx-auto sm:mx-0">
                  <MapPin className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 w-full">
                <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-center sm:text-left">
                  {range.business_name}
                </h1>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm sm:text-base">
                      {range.location}
                    </span>
                  </div>
                  {range.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                      <a
                        href={`tel:${range.phone}`}
                        className="hover:underline text-sm sm:text-base"
                      >
                        {range.phone}
                      </a>
                    </div>
                  )}
                  {range.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                      <a
                        href={`mailto:${range.email}`}
                        className="hover:underline text-sm sm:text-base break-all"
                      >
                        {range.email}
                      </a>
                    </div>
                  )}
                  {range.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                      <a
                        href={range.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-sm sm:text-base break-all"
                      >
                        {range.website}
                      </a>
                    </div>
                  )}
                </div>

                {range.description && (
                  <div className="mt-4 sm:mt-6">
                    <h2 className="text-lg sm:text-xl font-semibold mb-2">
                      About
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      {range.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blog Posts Section */}
        {blogPosts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5" />
              <h2 className="text-2xl font-bold">Blog Posts</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.map(post => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
