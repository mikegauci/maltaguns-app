"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Calendar,
  BookOpen,
  Package,
  Shield,
  Users,
  MapPin,
  Wrench,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/lib/database.types";
import { LoadingState } from "@/components/ui/loading-state";
import Image from "next/image";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");
}

interface Event {
  id: string;
  title: string;
  start_date: string;
  location: string;
  type: string;
  poster_url: string | null;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  created_at: string;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  slug: string;
  featured_image: string | null;
  created_at: string;
  author: {
    username: string;
  };
}

interface Establishment {
  id: string;
  business_name: string;
  logo_url: string | null;
  location: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  website: string | null;
  slug: string;
  type: "store" | "club" | "servicing" | "range";
}

export default function Home() {
  const supabase = createClientComponentClient<Database>();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [latestEvents, setLatestEvents] = useState<Event[]>([]);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [latestPosts, setLatestPosts] = useState<BlogPost[]>([]);
  const [featuredEstablishments, setFeaturedEstablishments] = useState<
    Establishment[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    async function fetchData() {
      try {
        setIsLoading(true);

        // Fetch recent listings
        const { data: listingsData, error: listingsError } = await supabase
          .from("listings")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(3);

        if (listingsError) {
          console.error("Listings fetch error:", listingsError);
          toast({
            variant: "destructive",
            title: "Error loading listings",
            description:
              "Failed to load recent listings. Please refresh the page.",
          });
        } else if (mounted) {
          setRecentListings(listingsData || []);
        }

        // Fetch latest blog posts
        const { data: postsData, error: postsError } = await supabase
          .from("blog_posts")
          .select(
            `
            *,
            author:profiles(username)
          `
          )
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(3);

        if (postsError) {
          console.error("Blog posts fetch error:", postsError);
          toast({
            variant: "destructive",
            title: "Error loading articles",
            description:
              "Failed to load latest articles. Please refresh the page.",
          });
        } else if (mounted) {
          setLatestPosts(postsData || []);
        }

        // Check authentication status
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (mounted) {
          setIsAuthenticated(!!session);
        }

        // Fetch featured establishments (3 most recent ones)
        const establishments: Establishment[] = [];

        // Fetch from all establishment types
        const types = ['stores', 'ranges', 'servicing', 'clubs'];
        for (const type of types) {
          const { data, error } = await supabase
            .from(type)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);

          if (error) {
            console.error(`Error fetching ${type}:`, error);
          } else if (data && data.length > 0) {
            // Convert each item to an Establishment
            data.forEach((item: any) => {
              establishments.push({
                id: item.id,
                business_name: item.business_name,
                logo_url: item.logo_url,
                location: item.location,
                phone: item.phone,
                email: item.email,
                description: item.description,
                website: item.website,
                slug: item.slug,
                type: type === 'stores' ? 'store' 
                  : type === 'ranges' ? 'range' 
                  : type === 'clubs' ? 'club'
                  : 'servicing'
              });
            });
          }
        }

        // Sort all establishments by creation date and take the 3 most recent
        if (mounted && establishments.length > 0) {
          const sorted = establishments.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setFeaturedEstablishments(sorted.slice(0, 3));
        }

        if (mounted) {
          setIsLoading(false);
          setRetryCount(0); // Reset retry count on successful fetch
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (mounted) {
          // If we haven't exceeded max retries, try again with exponential backoff
          if (retryCount < MAX_RETRIES) {
            const nextRetry = Math.min(1000 * Math.pow(2, retryCount), 10000);
            retryTimeout = setTimeout(() => {
              setRetryCount((prev) => prev + 1);
              fetchData();
            }, nextRetry);
          } else {
            setIsLoading(false);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Something went wrong. Please refresh the page.",
            });
          }
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [supabase, toast, retryCount]);

  function formatPrice(price: number) {
    return new Intl.NumberFormat("en-MT", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading content..." />
      </div>
    );
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
            <h1 className="text-5xl sm:text-6xl font-bold mb-6 text-white">
              Welcome to MaltaGuns
            </h1>
            <p className="text-lg leading-8 text-white/80 mb-8">
              Your premier destination for the firearms community in Malta.
              Browse listings, read expert articles, and connect with fellow
              enthusiasts.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6 w-full sm:w-auto">
              <Link
                href={isAuthenticated ? "/marketplace/create" : "/register"}
                className="w-[80%] sm:w-auto"
              >
                <Button
                  size="lg"
                  className="bg-white text-black border-white hover:bg-white/20 w-full"
                >
                  {isAuthenticated ? "Post Listing" : "Join the Community"}
                </Button>
              </Link>
              <Link href="/marketplace" className="w-[80%] sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-white/10 text-white border-white hover:bg-white/20 w-full"
                >
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
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Recent Listings</h2>
            <p className="text-lg text-muted-foreground">
              Latest additions to our marketplace
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {recentListings.map((listing) => (
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
                    <Badge variant="secondary" className="mb-2">
                      {listing.title.split(" ")[0]}
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
          <div className="mt-6 flex justify-center">
            <Link href="/marketplace">
              <Button>View All Listings</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Listings Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Featured Listings</h2>
            <p className="text-lg text-muted-foreground">
              Premium items from verified sellers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                id: "f1",
                title: "Beretta 92FS 9mm",
                price: 899,
                thumbnail: "/images/sample/beretta.jpg",
                badge: "Premium",
              },
              {
                id: "f2",
                title: "Remington 870 Tactical",
                price: 1299,
                thumbnail: "/images/sample/remington.jpg",
                badge: "Featured",
              },
              {
                id: "f3",
                title: "Sig Sauer P226 Legion",
                price: 1499,
                thumbnail: "/images/sample/sig-sauer.jpg",
                badge: "Premium",
              },
            ].map((listing) => (
              <Link
                key={listing.id}
                href={`/marketplace/listing/${slugify(listing.title)}`}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video relative overflow-hidden bg-muted">
                    <Store className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-12 w-12 text-muted-foreground" />
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="default" className="mb-2 bg-primary">
                      {listing.badge}
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
        </div>
      </section>

      {/* Latest Blog Posts Section */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Latest Articles</h2>
            <p className="text-lg text-muted-foreground">
              Expert insights and community news
            </p>
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
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>By {post.author.username}</span>
                      <span>
                        {format(new Date(post.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <Link href="/blog">
              <Button>View All Articles</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Upcoming Events</h2>
            <p className="text-lg text-muted-foreground">
              Join the latest community events
            </p>
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
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(event.start_date), "PPP")}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <Link href="/events">
              <Button>View All Events</Button>
            </Link>
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
                <div className="rounded-lg bg-[#cb0e0e] p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <Image
                    src="/images/pistol-gun-icon-white.svg"
                    alt="Firearms Marketplace"
                    width={24}
                    height={24}
                    className="text-white"
                  />
                </div>
                <h3 className="font-semibold text-lg mb-2">Marketplace</h3>
                <p className="text-muted-foreground">
                  Buy and sell firearms and accessories in a secure, verified
                  environment.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="rounded-lg bg-[#cb0e0e] p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Verified Sellers</h3>
                <p className="text-muted-foreground">
                  All sellers are verified with proper licensing and
                  documentation.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="rounded-lg bg-[#cb0e0e] p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Events</h3>
                <p className="text-muted-foreground">
                  Discover and participate in local shooting events and
                  competitions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="rounded-lg bg-[#cb0e0e] p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Community</h3>
                <p className="text-muted-foreground">
                  Connect with fellow enthusiasts and share your passion for
                  firearms.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Establishments Section */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Featured Establishments</h2>
            <p className="text-lg text-muted-foreground">
              Trusted dealers and shooting ranges in Malta
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredEstablishments.map((establishment) => (
              <Link
                key={`${establishment.type}-${establishment.id}`}
                href={`/establishments/${establishment.type === 'store' ? 'stores' : establishment.type}/${
                  establishment.slug || establishment.id
                }`}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      {establishment.logo_url ? (
                        <img
                          src={establishment.logo_url}
                          alt={establishment.business_name}
                          className="w-16 h-16 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          {establishment.type === "store" ? (
                            <Store className="h-8 w-8 text-muted-foreground" />
                          ) : establishment.type === "range" ? (
                            <MapPin className="h-8 w-8 text-muted-foreground" />
                          ) : (
                            <Wrench className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">
                          {establishment.business_name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{establishment.location}</span>
                        </div>
                      </div>
                    </div>

                    {establishment.description && (
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {establishment.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm">
                      {establishment.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{establishment.phone}</span>
                        </div>
                      )}
                      {establishment.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{establishment.email}</span>
                        </div>
                      )}
                      {establishment.website && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <span>{establishment.website}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <Link href="/establishments">
              <Button>View All Establishments</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Reviews Section */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Latest Reviews</h2>
            <p className="text-lg text-muted-foreground">
              Recent feedback from our community
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((_, index) => (
              <Card
                key={index}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">John D.</h4>
                      <p className="text-sm text-muted-foreground">
                        Verified Buyer
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${
                          i < 4 ? "text-yellow-400" : "text-gray-300"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {index === 0
                      ? "Excellent service and fast delivery. The firearm was exactly as described."
                      : index === 1
                      ? "Great experience at the shooting range. Professional instructors and well-maintained facilities."
                      : "The gunsmith did an amazing job with my restoration project. Highly recommended!"}
                  </p>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(), "MMM d, yyyy")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Need Help?</h2>
            <p className="text-lg text-muted-foreground">
              Find guides and latest news about firearms in Malta
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/guides">
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6">
                  <div className="rounded-lg bg-[#cb0e0e] p-3 w-12 h-12 flex items-center justify-center mb-4">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">
                    Guides & Resources
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Access comprehensive guides on licensing, safety
                    regulations, and maintenance tips for firearm owners in
                    Malta.
                  </p>
                  <div className="flex items-center text-sm text-primary">
                    <span className="mr-2">Browse guides</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="transition-transform transform group-hover:translate-x-1"
                    >
                      <path
                        d="M6.66667 12.6667L12 7.33333L6.66667 2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/news">
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6">
                  <div className="rounded-lg bg-[#cb0e0e] p-3 w-12 h-12 flex items-center justify-center mb-4">
                    <Globe className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Latest News</h3>
                  <p className="text-muted-foreground mb-4">
                    Stay updated with the latest news, regulations, and
                    announcements affecting the firearms community in Malta.
                  </p>
                  <div className="flex items-center text-sm text-primary">
                    <span className="mr-2">Read news</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="transition-transform transform group-hover:translate-x-1"
                    >
                      <path
                        d="M6.66667 12.6667L12 7.33333L6.66667 2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </CardContent>
              </Card>
            </Link>
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
            Create an account to start buying, selling, and connecting with the
            firearms community in Malta.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href={isAuthenticated ? "/marketplace/create" : "/register"}>
              <Button size="lg" variant="secondary">
                {isAuthenticated ? "Post a Listing" : "Create Account"}
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="lg" variant="secondary">
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
