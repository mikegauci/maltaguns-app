"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Store } from "lucide-react"
import Link from "next/link"

export default function EstablishmentsPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Establishments</h1>
          <p className="text-muted-foreground">
            Find firearms related establishments across Malta
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/establishments/stores">
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                    <Store className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Stores</h3>
                    <p className="text-muted-foreground">
                      Find licensed firearms dealers and stores across Malta
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
} 