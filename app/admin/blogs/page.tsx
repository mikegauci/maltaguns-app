"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Edit, Eye, Search, Filter, Users, Store, MapPin, Wrench, ArrowUpDown, BarChart3 } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

// List of authorized admin IDs
const AUTHORIZED_ADMINS = [
  'e22da8c7-c6af-43b7-8ba0-5bc8946edcda',
  '1a95bbf9-3bca-414d-a99f-1f9c72c15588'
]

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  featured_image: string | null
  published: boolean
  created_at: string
  updated_at: string
  category: string
  author_id: string
  store_id?: string
  club_id?: string
  range_id?: string
  servicing_id?: string
  view_count?: number
  author?: {
    username: string
  }
  store?: { business_name: string, slug: string }[]
  club?: { business_name: string, slug: string }[]
  range?: { business_name: string, slug: string }[]
  servicing?: { business_name: string, slug: string }[]
}

export default function AdminBlogsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [establishmentFilter, setEstablishmentFilter] = useState("all")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Check authorization
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          router.push('/login')
          return
        }

        if (!AUTHORIZED_ADMINS.includes(session.user.id)) {
          toast({
            variant: "destructive",
            title: "Unauthorized",
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

  // Fetch blog posts
  useEffect(() => {
    async function fetchPosts() {
      if (!isAuthorized) return

      try {
        setLoading(true)
        
        // First try basic query that should always work
        const { data: basicPosts, error: basicError } = await supabase
          .from('blog_posts')
          .select(`
            id,
            title,
            slug,
            content,
            featured_image,
            published,
            created_at,
            updated_at,
            author_id,
            author:profiles(username)
          `)
          .order('created_at', { ascending: false })

        if (basicError) {
          console.error('Database error:', basicError)
          throw new Error(`Failed to fetch blog posts: ${basicError.message}`)
        }

        if (!basicPosts) {
          throw new Error('No data returned from database')
        }

        // Try to get extended data with new columns
        let extendedData = null
        try {
          const { data: fullPosts, error: fullError } = await supabase
            .from('blog_posts')
            .select(`
              *,
              author:profiles(username),
              store:stores(business_name, slug),
              club:clubs(business_name, slug),
              range:ranges(business_name, slug),
              servicing:servicing(business_name, slug)
            `)
            .order('created_at', { ascending: false })

          if (!fullError && fullPosts) {
            extendedData = fullPosts
          }
        } catch (extendedError) {
          console.warn('Extended columns not available, using basic data:', extendedError)
        }

        // Use extended data if available, otherwise enhance basic data with defaults
        const postsToUse = extendedData || basicPosts.map(post => ({
          ...post,
          category: 'news',
          view_count: 0,
          store_id: null,
          club_id: null,
          range_id: null,
          servicing_id: null,
          store: null,
          club: null,
          range: null,
          servicing: null
        }))

        setPosts(postsToUse)

        // Show info message if using fallback data
        if (!extendedData) {
          toast({
            title: "Limited Features Available",
            description: "Some blog management features require running the database migration. View tracking and establishment filtering are not available yet.",
          })
        }

      } catch (error) {
        console.error('Error fetching posts:', error)
        toast({
          variant: "destructive",
          title: "Error Loading Posts",
          description: error instanceof Error ? error.message : "Failed to fetch blog posts. You may need to run the database migration first.",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [isAuthorized, supabase, toast])

  // Filter and sort posts
  useEffect(() => {
    let filtered = [...posts]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.author?.username?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(post => post.category === categoryFilter)
    }

    // Status filter
    if (statusFilter !== "all") {
      const isPublished = statusFilter === "published"
      filtered = filtered.filter(post => post.published === isPublished)
    }

    // Establishment filter
    if (establishmentFilter !== "all") {
      filtered = filtered.filter(post => {
        switch (establishmentFilter) {
          case "store":
            return post.store_id
          case "club":
            return post.club_id
          case "range":
            return post.range_id
          case "servicing":
            return post.servicing_id
          case "admin":
            return !post.store_id && !post.club_id && !post.range_id && !post.servicing_id
          default:
            return true
        }
      })
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case "title":
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case "author":
          aValue = a.author?.username?.toLowerCase() || ""
          bValue = b.author?.username?.toLowerCase() || ""
          break
        case "views":
          aValue = a.view_count || 0
          bValue = b.view_count || 0
          break
        case "updated_at":
          aValue = new Date(a.updated_at).getTime()
          bValue = new Date(b.updated_at).getTime()
          break
        default: // created_at
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredPosts(filtered)
  }, [posts, searchTerm, categoryFilter, statusFilter, establishmentFilter, sortBy, sortOrder])

  // Delete post
  async function deleteBlogPost(postId: string) {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      setPosts(posts.filter(post => post.id !== postId))
      toast({
        title: "Success",
        description: "Blog post deleted successfully.",
      })
    } catch (error) {
      console.error('Error deleting post:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete blog post.",
      })
    }
  }

  // Toggle published status
  async function togglePublished(postId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ published: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', postId)

      if (error) throw error

      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, published: !currentStatus, updated_at: new Date().toISOString() }
          : post
      ))

      toast({
        title: "Success",
        description: `Post ${!currentStatus ? 'published' : 'unpublished'} successfully.`,
      })
    } catch (error) {
      console.error('Error updating post status:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update post status.",
      })
    }
  }

  // Get establishment info
  function getEstablishmentInfo(post: BlogPost) {
    if (post.store_id && post.store?.[0]) {
      return { type: 'Store', name: post.store[0].business_name, icon: Store }
    }
    if (post.club_id && post.club?.[0]) {
      return { type: 'Club', name: post.club[0].business_name, icon: Users }
    }
    if (post.range_id && post.range?.[0]) {
      return { type: 'Range', name: post.range[0].business_name, icon: MapPin }
    }
    if (post.servicing_id && post.servicing?.[0]) {
      return { type: 'Servicing', name: post.servicing[0].business_name, icon: Wrench }
    }
    return { type: 'Admin', name: 'Admin Post', icon: null }
  }

  // Sort function
  function handleSort(field: string) {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("desc")
    }
  }

  if (!isAuthorized) {
    return <div>Checking authorization...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Blog Management</h1>
          <p className="text-muted-foreground">Manage all blog posts across the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/blogs/analytics">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href="/blog/create">
            <Button>Create New Post</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="guides">Guides</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            <Select value={establishmentFilter} onValueChange={setEstablishmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="admin">Admin Posts</SelectItem>
                <SelectItem value="store">Store Posts</SelectItem>
                <SelectItem value="club">Club Posts</SelectItem>
                <SelectItem value="range">Range Posts</SelectItem>
                <SelectItem value="servicing">Servicing Posts</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              {filteredPosts.length} of {posts.length} posts
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Blog Posts</CardTitle>
          <CardDescription>
            Manage and moderate all blog posts from users and establishments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading posts...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('title')}
                        className="flex items-center gap-1 p-0 h-auto font-semibold"
                      >
                        Title <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('author')}
                        className="flex items-center gap-1 p-0 h-auto font-semibold"
                      >
                        Author <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('views')}
                        className="flex items-center gap-1 p-0 h-auto font-semibold"
                      >
                        Views <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('created_at')}
                        className="flex items-center gap-1 p-0 h-auto font-semibold"
                      >
                        Created <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.map((post) => {
                    const establishment = getEstablishmentInfo(post)
                    const IconComponent = establishment.icon
                    
                    return (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {post.featured_image && (
                              <img 
                                src={post.featured_image} 
                                alt={post.title}
                                className="w-12 h-8 object-cover rounded"
                              />
                            )}
                            <div>
                              <div className="font-medium line-clamp-1">{post.title}</div>
                              <div className="text-sm text-muted-foreground">/{post.slug}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{post.author?.username || 'Unknown'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {IconComponent && <IconComponent className="h-4 w-4" />}
                            <span className="text-sm">{establishment.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {post.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePublished(post.id, post.published)}
                            className="p-0 h-auto"
                          >
                            <Badge variant={post.published ? "default" : "secondary"}>
                              {post.published ? 'Published' : 'Draft'}
                            </Badge>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span>{post.view_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(post.created_at), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/blog/${post.category}/${post.slug}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/blog/${post.category}/${post.slug}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{post.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteBlogPost(post.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              
              {filteredPosts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No blog posts found matching your filters.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 