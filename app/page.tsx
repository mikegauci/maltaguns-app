"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Store, Calendar, BookOpen, Package, Shield, Users } from "lucide-react"
import Link from "next/link"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Database } from "@/lib/database.types"
import { LoadingState } from "@/components/ui/loading-state"
import Image from "next/image"

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

interface Event {
  id: string
  title: string
  start_date: string
  location: string
  type: string
  poster_url: string | null
}

interface Listing {
  id: string
  title: string
  description: string
  price: number
  thumbnail: string
  created_at: string
}

interface BlogPost {
  id: string
  title: string
  content: string
  slug: string
  featured_image: string | null
  created_at: string
  author: {
    username: string
  }
}

export default function Home() {
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [latestEvents, setLatestEvents] = useState<Event[]>([])
  const [recentListings, setRecentListings] = useState<Listing[]>([])
  const [latestPosts, setLatestPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 3

  useEffect(() => {
    let mounted = true
    let retryTimeout: NodeJS.Timeout

    async function fetchData() {
      try {
        setIsLoading(true)

        // Fetch recent listings
        const { data: listingsData, error: listingsError } = await supabase
          .from("listings")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(6)

        if (listingsError) {
          console.error('Listings fetch error:', listingsError)
          toast({
            variant: "destructive",
            title: "Error loading listings",
            description: "Failed to load recent listings. Please refresh the page."
          })
        } else if (mounted) {
          setRecentListings(listingsData || [])
        }

        // Fetch latest blog posts
        const { data: postsData, error: postsError } = await supabase
          .from('blog_posts')
          .select(`
            *,
            author:profiles(username)
          `)
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(3)

        if (postsError) {
          console.error('Blog posts fetch error:', postsError)
          toast({
            variant: "destructive",
            title: "Error loading articles",
            description: "Failed to load latest articles. Please refresh the page."
          })
        } else if (mounted) {
          setLatestPosts(postsData || [])
        }

        // Check authentication status
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          setIsAuthenticated(!!session)
        }

        if (mounted) {
          setIsLoading(false)
          setRetryCount(0) // Reset retry count on successful fetch
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        if (mounted) {
          // If we haven't exceeded max retries, try again with exponential backoff
          if (retryCount < MAX_RETRIES) {
            const nextRetry = Math.min(1000 * Math.pow(2, retryCount), 10000)
            retryTimeout = setTimeout(() => {
              setRetryCount(prev => prev + 1)
              fetchData()
            }, nextRetry)
          } else {
            setIsLoading(false)
            toast({
              variant: "destructive",
              title: "Error",
              description: "Something went wrong. Please refresh the page."
            })
          }
        }
      }
    }

    fetchData()

    return () => {
      mounted = false
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  }, [supabase, toast, retryCount])

  function formatPrice(price: number) {
    return new Intl.NumberFormat('en-MT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading content..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative isolate">
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src="/maltaguns-hero.jpg"
            alt="MaltaGuns Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/75"></div>
        </div>
        <div className="relative mx-auto max-w-2xl py-32 sm:py-48 lg:py-56 px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-6xl font-bold sm:text-6xl mb-6 text-white">
              Welcome to MaltaGuns
            </h1>
            <p className="text-lg leading-8 text-white/80 mb-8">
              Your premier destination for the firearms community in Malta. Browse listings, read expert articles, and connect with fellow enthusiasts.
            </p>
            <div className="flex items-center justify-center gap-x-6">
              <Link href={isAuthenticated ? "/marketplace/create" : "/register"}>
                <Button size="lg" className="bg-white text-black border-white hover:bg-white/20">
                  {isAuthenticated ? "Post Listing" : "Join the Community"}
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button variant="outline" size="lg" className="bg-white/10 text-white border-white hover:bg-white/20">
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Listings Section */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Recent Listings</h2>
              <p className="text-muted-foreground">Latest additions to our marketplace</p>
            </div>
            <Link href="/marketplace">
              <Button variant="outline">View All Listings</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentListings.map((listing) => (
              <Link key={listing.id} href={`/marketplace/listing/${slugify(listing.title)}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={listing.thumbnail}
                      alt={listing.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="secondary" className="mb-2">
                      {listing.title.split(' ')[0]}
                    </Badge>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">{listing.title}</h3>
                    <p className="text-lg font-bold text-primary">{formatPrice(listing.price)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Upcoming Events</h2>
              <p className="text-muted-foreground">Join the latest community events</p>
            </div>
            <Link href="/events">
              <Button variant="outline">View All Events</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  {event.poster_url ? (
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={event.poster_url}
                        alt={event.title}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <Badge className="mb-2">{event.type}</Badge>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(event.start_date), 'PPP')}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Blog Posts Section */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Latest Articles</h2>
              <p className="text-muted-foreground">Expert insights and community news</p>
            </div>
            <Link href="/blog">
              <Button variant="outline">View All Articles</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestPosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  {post.featured_image ? (
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{post.title}</h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>By {post.author.username}</span>
                      <span>{format(new Date(post.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-lg text-muted-foreground">
              A complete platform designed for the firearms community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardContent className="p-6">
                <div className="rounded-lg bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <Image
                    src="/images/pistol-gun-icon.svg"
                    alt="Firearms Marketplace"
                    width={24}
                    height={24}
                    className="text-primary"
                  />
                </div>
                <h3 className="font-semibold text-lg mb-2">Marketplace</h3>
                <p className="text-muted-foreground">
                  Buy and sell firearms and accessories in a secure, verified environment.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="rounded-lg bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Verified Sellers</h3>
                <p className="text-muted-foreground">
                  All sellers are verified with proper licensing and documentation.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="rounded-lg bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Events</h3>
                <p className="text-muted-foreground">
                  Discover and participate in local shooting events and competitions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="rounded-lg bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Community</h3>
                <p className="text-muted-foreground">
                  Connect with fellow enthusiasts and share your passion for firearms.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Join the MaltaGuns Community Today
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Create an account to start buying, selling, and connecting with the firearms community in Malta.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href={isAuthenticated ? "/marketplace/create" : "/register"}>
              <Button size="lg" variant="secondary">
                {isAuthenticated ? "Post a Listing" : "Create Account"}
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button 
                size="lg" variant="secondary">
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}