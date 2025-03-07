"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Store, MapPin, Phone, Mail, Globe, ArrowLeft, BookOpen, Pencil } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"

interface Retailer {
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

export default function RetailerClient({ retailer }: { retailer: Retailer }) {
  const router = useRouter()
  const [isOwner, setIsOwner] = useState(false)
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Check if blog posts array is valid
  const hasBlogPosts = Array.isArray(retailer.blogPosts) && retailer.blogPosts.length > 0;

  useEffect(() => {
    // Check if current user is the owner of this retailer
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsOwner(session.user.id === retailer.owner_id)
      }
    })

    // Update blog posts if they change
    if (Array.isArray(retailer.blogPosts)) {
      setBlogPosts(retailer.blogPosts)
    } else {
      setBlogPosts([]) // Set to empty array if not valid
    }
    
    setLoading(false)
  }, [retailer.owner_id, retailer.blogPosts])

  // Fetch blog posts directly from the client side as a fallback
  useEffect(() => {
    if (!hasBlogPosts && !loading) {
      const fetchBlogPosts = async () => {
        try {
          // Fetch blog posts without the join to profiles
          const { data, error } = await supabase
            .from("retailer_blog_posts")
            .select("*")
            .eq("retailer_id", retailer.id)
            .eq("published", true)
            .order("created_at", { ascending: false });
            
          if (error) {
            console.error("Error fetching blog posts from client:", error);
          } else if (data && data.length > 0) {
            // Add default author information
            const postsWithAuthor = data.map(post => ({
              ...post,
              author: { username: "Author" }
            }));
            
            setBlogPosts(postsWithAuthor);
          }
        } catch (error) {
          console.error("Error in client-side fetch:", error);
        }
      };
      
      fetchBlogPosts();
    }
  }, [hasBlogPosts, loading, retailer.id]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/retailers")}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to retailers
          </Button>
          
          {isOwner && (
            <div className="flex items-center gap-2">
              <Link href={`/retailers/${retailer.slug}/blog/create`}>
                <Button className="bg-primary">
                  <Pencil className="h-4 w-4 mr-2" />
                  Create New Post
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Retailer Profile */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {retailer.logo_url ? (
                <img
                  src={retailer.logo_url}
                  alt={retailer.business_name}
                  className="w-32 h-32 object-contain rounded-lg"
                />
              ) : (
                <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                  <Store className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-4">{retailer.business_name}</h1>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>{retailer.location}</span>
                  </div>
                  {retailer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <a href={`tel:${retailer.phone}`} className="hover:underline">
                        {retailer.phone}
                      </a>
                    </div>
                  )}
                  {retailer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <a href={`mailto:${retailer.email}`} className="hover:underline">
                        {retailer.email}
                      </a>
                    </div>
                  )}
                  {retailer.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <a 
                        href={retailer.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {retailer.website}
                      </a>
                    </div>
                  )}
                </div>

                {retailer.description && (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {retailer.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listings Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Available Listings</h2>
          
          {retailer.listings.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No active listings available.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {retailer.listings.map((listing) => (
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
                        {listing.type === 'firearms' ? 'Firearms' : 'Non-Firearms'}
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
            <h2 className="text-2xl font-bold">Latest Articles</h2>
            {isOwner && (
              <Link href={`/retailers/${retailer.slug}/blog/create`}>
                <Button>
                  <Pencil className="h-4 w-4 mr-2" />
                  Create New Post
                </Button>
              </Link>
            )}
          </div>
          
          {blogPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.map((post) => (
                <Link key={post.id} href={`/retailers/${retailer.slug}/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      {post.featured_image ? (
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="text-sm text-muted-foreground mb-2">
                        {format(new Date(post.created_at), 'MMM d, yyyy')} • By {post.author?.username || 'Unknown'}
                      </div>
                      <h2 className="text-xl font-semibold mb-2 line-clamp-2">
                        {post.title}
                      </h2>
                      <p className="text-muted-foreground line-clamp-3">
                        {truncateText(post.content, 20)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No articles published yet.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}