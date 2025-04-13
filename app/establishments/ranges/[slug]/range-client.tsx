"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Phone, Mail, Globe, ArrowLeft, BookOpen, Pencil } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"

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
    currency: 'EUR'
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
  const hasBlogPosts = Array.isArray(range.blogPosts) && range.blogPosts.length > 0;

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
            .from("blog_posts")
            .select("*, author:profiles(username)")
            .eq("range_id", range.id)
            .eq("published", true)
            .order("created_at", { ascending: false });
            
          if (error) {
            console.error("Error fetching blog posts from client:", error);
          } else if (data && data.length > 0) {
            // Set the blog posts
            setBlogPosts(data);
          }
        } catch (error) {
          console.error("Error in client-side fetch:", error);
        }
      };
      
      fetchBlogPosts();
    }
  }, [hasBlogPosts, loading, range.id]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/establishments/ranges")}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Ranges
          </Button>
          
          {isOwner && (
            <div className="flex items-center gap-2">
              <Link href={`/blog/create?range_id=${range.id}`}>
                <Button className="bg-primary">
                  <Pencil className="h-4 w-4 mr-2" />
                  Create New Post
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Range Profile */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {range.logo_url ? (
                <img
                  src={range.logo_url}
                  alt={range.business_name}
                  className="w-32 h-32 object-contain rounded-lg"
                />
              ) : (
                <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                  <MapPin className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-4">{range.business_name}</h1>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>{range.location}</span>
                  </div>
                  {range.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <a href={`tel:${range.phone}`} className="hover:underline">
                        {range.phone}
                      </a>
                    </div>
                  )}
                  {range.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <a href={`mailto:${range.email}`} className="hover:underline">
                        {range.email}
                      </a>
                    </div>
                  )}
                  {range.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <a 
                        href={range.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {range.website}
                      </a>
                    </div>
                  )}
                </div>

                {range.description && (
                  <div className="mt-6">
                    <h2 className="text-xl font-semibold mb-2">About</h2>
                    <p className="text-muted-foreground">{range.description}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {blogPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      {post.featured_image && (
                        <div className="aspect-video mb-4 overflow-hidden rounded-md">
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <span>{post.author?.username || "Author"}</span>
                        <span className="mx-2">•</span>
                        <span>{format(new Date(post.created_at), "MMM d, yyyy")}</span>
                      </div>
                      <p className="text-muted-foreground">
                        {truncateText(post.content, 30)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 