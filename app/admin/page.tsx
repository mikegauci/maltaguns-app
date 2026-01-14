'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/ui/page-header'
import { BackButton } from '@/components/ui/back-button'
import { PageLayout } from '@/components/ui/page-layout'

// Use dynamic import with SSR disabled to prevent hydration issues
const AdminDashboardContent = dynamic(
  () => Promise.resolve(AdminDashboardComponent),
  {
    ssr: false,
  }
)

export default function AdminDashboard() {
  return <AdminDashboardContent />
}

function AdminDashboardComponent() {
  return (
    <PageLayout withSpacing>
      <PageHeader
        title="Admin Dashboard"
        description="Manage the admin dashboard"
      />
      <BackButton label="Back to Site" href="/" />

      <Tabs defaultValue="overview" className="space-y-4">
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
              title="Establishments"
              description="Manage establishment profiles"
              href="/admin/establishments"
              icon="🏪"
            />
            <AdminCard
              title="Credits"
              description="Manage user credits"
              href="/admin/credits"
              icon="💳"
            />
            <AdminCard
              title="Event Credits"
              description="Manage event credits"
              href="/admin/event-credits"
              icon="🎫"
            />
            <AdminCard
              title="Payments Received"
              description="View payment transactions"
              href="/admin/payments-received"
              icon="💰"
            />
            <AdminCard
              title="Reported Listings"
              description="Manage reported listings"
              href="/admin/reported-listings"
              icon="🚨"
            />
            <AdminCard
              title="Notifications"
              description="Send manual notifications"
              href="/admin/notifications"
              icon="🔔"
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
              <Link
                href="/admin/users"
                className="text-blue-500 hover:underline"
              >
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
              <Link
                href="/admin/listings"
                className="text-blue-500 hover:underline"
              >
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
              <Link
                href="/admin/events"
                className="text-blue-500 hover:underline"
              >
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
              <Link
                href="/admin/blogs"
                className="text-blue-500 hover:underline"
              >
                Go to Blog Management →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retailers">
          <Card>
            <CardHeader>
              <CardTitle>Establishment Management</CardTitle>
              <CardDescription>
                Create, view, edit, and delete establishment profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/retailers"
                className="text-blue-500 hover:underline"
              >
                Go to Establishment Management →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits">
          <Card>
            <CardHeader>
              <CardTitle>Credit Management</CardTitle>
              <CardDescription>View and manage user credits</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/credits"
                className="text-blue-500 hover:underline"
              >
                Go to Credit Management →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="event-credits">
          <Card>
            <CardHeader>
              <CardTitle>Event Credit Management</CardTitle>
              <CardDescription>View and manage event credits</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/event-credits"
                className="text-blue-500 hover:underline"
              >
                Go to Event Credit Management →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}

function AdminCard({
  title,
  description,
  href,
  icon,
}: {
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
          <span className="text-blue-500 hover:underline">
            Manage {title} →
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
