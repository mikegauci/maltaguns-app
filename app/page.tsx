"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Sun as Gun } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <div className="mb-8 flex justify-center">
              <Gun className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
              Welcome to MaltaGuns
            </h1>
            <p className="text-lg leading-8 text-muted-foreground mb-8">
              Your premier destination for the firearms community in Malta. Browse listings, read expert articles, and connect with fellow enthusiasts.
            </p>
            <div className="flex items-center justify-center gap-x-6">
              <Link href={isAuthenticated ? "/marketplace/create" : "/register"}>
                <Button size="lg">
                  {isAuthenticated ? "Post Listing" : "Join the Community"}
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button variant="outline" size="lg">
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary">Everything You Need</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              A Complete Platform for Firearm Enthusiasts
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-3">
              {/* Marketplace Feature */}
              <div className="flex flex-col">
                <div className="mb-6">
                  <div className="rounded-lg bg-primary/10 p-2 w-10 h-10 flex items-center justify-center">
                    <Gun className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Marketplace</h3>
                  <p className="text-muted-foreground">
                    Buy and sell firearms and accessories in a secure, verified environment.
                  </p>
                </div>
              </div>

              {/* Blog Feature */}
              <div className="flex flex-col">
                <div className="mb-6">
                  <div className="rounded-lg bg-primary/10 p-2 w-10 h-10 flex items-center justify-center">
                    <Gun className="h-6 w-6 text-primary rotate-45" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Expert Articles</h3>
                  <p className="text-muted-foreground">
                    Stay informed with our comprehensive blog covering reviews, tips, and industry news.
                  </p>
                </div>
              </div>

              {/* Community Feature */}
              <div className="flex flex-col">
                <div className="mb-6">
                  <div className="rounded-lg bg-primary/10 p-2 w-10 h-10 flex items-center justify-center">
                    <Gun className="h-6 w-6 text-primary -rotate-45" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Verified Community</h3>
                  <p className="text-muted-foreground">
                    Connect with verified members and licensed sellers in a trusted environment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}