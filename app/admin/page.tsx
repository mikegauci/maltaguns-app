"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from "next/dynamic"

// Use dynamic import with SSR disabled to prevent hydration issues
const AdminDashboardContent = dynamic(() => Promise.resolve(AdminDashboardComponent), { 
  ssr: false 
})

export default function AdminDashboard() {
  return <AdminDashboardContent />
}

function AdminDashboardComponent() {
  const [activeTab, setActiveTab] = useState("overview")
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Link href="/" className="text-blue-500 hover:underline">
          Return to Site
        </Link>
      </div>
      
      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="blogs">Blogs</TabsTrigger>
          <TabsTrigger value="retailers">Retailers</TabsTrigger>
          <TabsTrigger value="retailer-blogs">Retailer Blogs</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AdminCard 
              title="Users" 
              description="Manage user accounts" 
              href="/admin/users"
              icon="👤"
            />
            <AdminCard 
              title="Listings" 
              description="Manage marketplace listings" 
              href="/admin/listings"
              icon="📦"
            />
            <AdminCard 
              title="Events" 
              description="Manage events and schedules" 
              href="/admin/events"
              icon="📅"
            />
            <AdminCard 
              title="Blogs" 
              description="Manage blog posts" 
              href="/admin/blogs"
              icon="📝"
            />
            <AdminCard 
              title="Retailers" 
              description="Manage retailer profiles" 
              href="/admin/retailers"
              icon="🏪"
            />
            <AdminCard 
              title="Retailer Blogs" 
              description="Manage retailer blog posts" 
              href="/admin/retailer-blogs"
              icon="📰"
            />
            <AdminCard 
              title="Credits" 
              description="Manage user credits" 
              href="/admin/credits"
              icon="💳"
            />
          </div>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Create, view, edit, and delete user accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/users" className="text-blue-500 hover:underline">
                Go to User Management →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="listings">
          <Card>
            <CardHeader>
              <CardTitle>Listing Management</CardTitle>
              <CardDescription>
                Create, view, edit, and delete marketplace listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/listings" className="text-blue-500 hover:underline">
                Go to Listing Management →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Event Management</CardTitle>
              <CardDescription>
                Create, view, edit, and delete events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/events" className="text-blue-500 hover:underline">
                Go to Event Management →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="blogs">
          <Card>
            <CardHeader>
              <CardTitle>Blog Management</CardTitle>
              <CardDescription>
                Create, view, edit, and delete blog posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/blogs" className="text-blue-500 hover:underline">
                Go to Blog Management →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="retailers">
          <Card>
            <CardHeader>
              <CardTitle>Retailer Management</CardTitle>
              <CardDescription>
                Create, view, edit, and delete retailer profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/retailers" className="text-blue-500 hover:underline">
                Go to Retailer Management →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="retailer-blogs">
          <Card>
            <CardHeader>
              <CardTitle>Retailer Blog Management</CardTitle>
              <CardDescription>
                Create, view, edit, and delete retailer blog posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/retailer-blogs" className="text-blue-500 hover:underline">
                Go to Retailer Blog Management →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="credits">
          <Card>
            <CardHeader>
              <CardTitle>Credit Management</CardTitle>
              <CardDescription>
                View and manage user credits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/credits" className="text-blue-500 hover:underline">
                Go to Credit Management →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AdminCard({ title, description, href, icon }: { 
  title: string
  description: string
  href: string
  icon: string
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-all hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <span className="text-2xl">{icon}</span>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-blue-500 hover:underline">Manage {title} →</span>
        </CardContent>
      </Card>
    </Link>
  )
} 