"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import CategoryListings from "@/components/CategoryListings"
import { supabase } from "@/lib/supabase"

export default function AmmunitionPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isRetailer, setIsRetailer] = useState(false)

  useEffect(() => {
    async function checkRetailerStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          // If not logged in, redirect to login page
          router.push("/login")
          return
        }

        // Check if user is a retailer
        const { data: retailerData, error: retailerError } = await supabase
          .from("retailers")
          .select("id")
          .eq("owner_id", session.user.id)
          .single()
          
        if (!retailerError && retailerData) {
          setIsRetailer(true)
        } else {
          // If not a retailer, redirect to the main firearms page
          router.push("/marketplace/firearms")
        }
      } catch (error) {
        console.error("Error checking retailer status:", error)
        router.push("/marketplace/firearms")
      } finally {
        setIsLoading(false)
      }
    }

    checkRetailerStatus()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isRetailer) {
    return null // This shouldn't render as we redirect non-retailers
  }

  return (
    <CategoryListings 
      type="firearms"
      category="ammunition"
      title="Ammunition"
      description="Browse ammunition listings from licensed sellers"
    />
  )
} 