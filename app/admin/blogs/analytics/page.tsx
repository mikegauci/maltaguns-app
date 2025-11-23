'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Eye,
  TrendingUp,
  Users,
  Store,
  MapPin,
  Wrench,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { BackButton } from '@/components/ui/back-button'

// Remove hardcoded admin list - use database is_admin field instead

interface BlogAnalytics {
  totalPosts: number
  totalViews: number
  publishedPosts: number
  draftPosts: number
  avgViewsPerPost: number
  topPosts: Array<{
    id: string
    title: string
    slug: string
    category: string
    view_count: number
    author: { username: string }
  }>
  postsByCategory: Array<{
    category: string
    count: number
  }>
  postsBySource: Array<{
    source: string
    count: number
  }>
  recentActivity: Array<{
    id: string
    title: string
    author: { username: string }
    created_at: string
    category: string
  }>
}

export default function BlogAnalyticsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  const [analytics, setAnalytics] = useState<BlogAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  // Check authorization
  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error || !session) {
          router.push('/login')
          return
        }

        // Check if user is admin using database field
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()

        if (profileError || !profile || !profile.is_admin) {
          toast({
            variant: 'destructive',
            title: 'Unauthorized',
            description: "You don't have permission to access this page.",
          })
          router.push('/admin')
          return
        }

        setIsAuthorized(true)
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router, supabase, toast])

  // Fetch analytics data
  useEffect(() => {
    async function fetchAnalytics() {
      if (!isAuthorized) return

      try {
        setLoading(true)

        // First, try to fetch posts with basic columns that should always exist
        const { data: allPosts, error: postsError } = await supabase.from(
          'blog_posts'
        ).select(`
            id,
            title,
            slug,
            published,
            created_at,
            author_id,
            author:profiles(username)
          `)

        if (postsError) {
          console.error('Database error:', postsError)
          throw new Error(`Database query failed: ${postsError.message}`)
        }

        if (!allPosts) {
          throw new Error('No data returned from database')
        }

        // Check if we have the extended columns by trying to fetch one post with all fields
        let extendedData = null
        try {
          const { data: testPost, error: testError } = await supabase
            .from('blog_posts')
            .select(
              'view_count, category, store_id, club_id, range_id, servicing_id'
            )
            .limit(1)
            .maybeSingle()

          if (!testError) {
            // Extended columns exist, fetch full data
            const { data: fullPosts, error: fullError } = await supabase.from(
              'blog_posts'
            ).select(`
                id,
                title,
                slug,
                category,
                published,
                created_at,
                view_count,
                store_id,
                club_id,
                range_id,
                servicing_id,
                author:profiles(username)
              `)

            if (!fullError && fullPosts) {
              extendedData = fullPosts
            }
          }
        } catch (extendedError) {
          console.warn('Extended columns not available:', extendedError)
        }

        // Use extended data if available, otherwise fall back to basic data
        const postsToUse =
          extendedData ||
          allPosts.map(post => ({
            ...post,
            category: 'news', // default
            view_count: 0, // default
            store_id: null,
            club_id: null,
            range_id: null,
            servicing_id: null,
          }))

        // Calculate analytics
        const totalPosts = postsToUse?.length || 0
        const publishedPosts =
          postsToUse?.filter(post => post.published).length || 0
        const draftPosts = totalPosts - publishedPosts
        const totalViews =
          postsToUse?.reduce((sum, post) => sum + (post.view_count || 0), 0) ||
          0
        const avgViewsPerPost =
          totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0

        // Top posts by views
        const topPosts =
          postsToUse
            ?.filter(post => post.published)
            .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
            .slice(0, 5)
            .map(post => {
              let authorUsername = 'Unknown'
              const author = post.author as any
              if (author) {
                if (Array.isArray(author) && author.length > 0) {
                  authorUsername = author[0]?.username || 'Unknown'
                } else if (author.username) {
                  authorUsername = author.username || 'Unknown'
                }
              }

              return {
                id: post.id,
                title: post.title,
                slug: post.slug,
                category: post.category || 'news',
                view_count: post.view_count || 0,
                author: { username: authorUsername },
              }
            }) || []

        // Posts by category
        const categoryCount =
          postsToUse?.reduce(
            (acc, post) => {
              const category = post.category || 'news'
              acc[category] = (acc[category] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          ) || {}

        const postsByCategory = Object.entries(categoryCount).map(
          ([category, count]) => ({
            category,
            count,
          })
        )

        // Posts by source
        const sourceCount =
          postsToUse?.reduce(
            (acc, post) => {
              let source = 'Admin'
              if (post.store_id) source = 'Store'
              else if (post.club_id) source = 'Club'
              else if (post.range_id) source = 'Range'
              else if (post.servicing_id) source = 'Servicing'

              acc[source] = (acc[source] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          ) || {}

        const postsBySource = Object.entries(sourceCount).map(
          ([source, count]) => ({
            source,
            count,
          })
        )

        // Recent activity (last 10 posts)
        const recentActivity =
          postsToUse
            ?.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .slice(0, 10)
            .map(post => {
              let authorUsername = 'Unknown'
              const author = post.author as any
              if (author) {
                if (Array.isArray(author) && author.length > 0) {
                  authorUsername = author[0]?.username || 'Unknown'
                } else if (author.username) {
                  authorUsername = author.username || 'Unknown'
                }
              }

              return {
                id: post.id,
                title: post.title,
                created_at: post.created_at,
                category: post.category || 'news',
                author: { username: authorUsername },
              }
            }) || []

        setAnalytics({
          totalPosts,
          totalViews,
          publishedPosts,
          draftPosts,
          avgViewsPerPost,
          topPosts,
          postsByCategory,
          postsBySource,
          recentActivity,
        })

        // Show info message if using fallback data
        if (!extendedData) {
          toast({
            title: 'Limited Data Available',
            description:
              'Some analytics features require running the database migration. View tracking and establishment data are not available yet.',
          })
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
        toast({
          variant: 'destructive',
          title: 'Error Loading Analytics',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to fetch analytics data. You may need to run the database migration first.',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [isAuthorized, supabase, toast])

  if (!isAuthorized) {
    return <div>Checking authorization...</div>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Blog Analytics</h1>
        <div className="text-center py-8">Loading analytics...</div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Blog Analytics</h1>
        <div className="text-center py-8">No data available</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Blog Analytics</h1>
          <p className="text-muted-foreground">
            Track blog performance and engagement metrics
          </p>
        </div>
        <BackButton label="Back to Blog Management" href="/admin/blogs" />
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <div className="text-2xl font-bold">{analytics.totalPosts}</div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <BarChart3 className="h-4 w-4 mr-1" />
              {analytics.publishedPosts} published, {analytics.draftPosts} draft
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <div className="text-2xl font-bold">
              {analytics.totalViews.toLocaleString()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <Eye className="h-4 w-4 mr-1" />
              Across all published posts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Views per Post
            </CardTitle>
            <div className="text-2xl font-bold">
              {analytics.avgViewsPerPost}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-4 w-4 mr-1" />
              Based on published posts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Authors
            </CardTitle>
            <div className="text-2xl font-bold">
              {
                new Set(
                  analytics.recentActivity.map(post => post.author?.username)
                ).size
              }
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <Users className="h-4 w-4 mr-1" />
              Unique contributors
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Top Posts by Views</CardTitle>
            <CardDescription>
              Most popular content on your platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topPosts.map((post, index) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {post.category}
                      </Badge>
                    </div>
                    <Link
                      href={`/blog/${post.category}/${post.slug}`}
                      className="font-medium line-clamp-1 hover:text-primary"
                    >
                      {post.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      by {post.author?.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Eye className="h-4 w-4" />
                    {post.view_count || 0}
                  </div>
                </div>
              ))}
              {analytics.topPosts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No published posts with views yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest blog posts created</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recentActivity.map(post => (
                <div
                  key={post.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {post.category}
                      </Badge>
                    </div>
                    <p className="font-medium line-clamp-1">{post.title}</p>
                    <p className="text-xs text-muted-foreground">
                      by {post.author?.username} •{' '}
                      {format(new Date(post.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Posts by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Posts by Category</CardTitle>
            <CardDescription>Distribution of content types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.postsByCategory.map(item => (
                <div
                  key={item.category}
                  className="flex items-center justify-between"
                >
                  <span className="font-medium capitalize">
                    {item.category}
                  </span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Posts by Source */}
        <Card>
          <CardHeader>
            <CardTitle>Posts by Source</CardTitle>
            <CardDescription>Where content is coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.postsBySource.map(item => {
                const getIcon = (source: string) => {
                  switch (source) {
                    case 'Store':
                      return <Store className="h-4 w-4" />
                    case 'Club':
                      return <Users className="h-4 w-4" />
                    case 'Range':
                      return <MapPin className="h-4 w-4" />
                    case 'Servicing':
                      return <Wrench className="h-4 w-4" />
                    default:
                      return <Calendar className="h-4 w-4" />
                  }
                }

                return (
                  <div
                    key={item.source}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {getIcon(item.source)}
                      <span className="font-medium">{item.source}</span>
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
