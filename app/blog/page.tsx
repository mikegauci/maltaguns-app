"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Pencil } from "lucide-react"
import Link from "next/link"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Database } from "@/lib/database.types"

// List of authorized user IDs
const AUTHORIZED_BLOG_AUTHORS = [
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
  author: {
    username: string
  }
}

function truncateText(text: string, words: number) {
  // Remove HTML tags
  const strippedText = text.replace(/<[^>]*>/g, '')
  const wordArray = strippedText.split(' ')
  if (wordArray.length <= words) return strippedText
  return wordArray.slice(0, words).join(' ') + '...'
}

export default function BlogPage() {
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    let mounted = true

    async function fetchData() {
      try {
        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          return
        }

        // Check if user is authorized to create blog posts
        if (session?.user) {
          setIsAuthorized(AUTHORIZED_BLOG_AUTHORS.includes(session.user.id))
        }

        // Fetch blog posts
        const { data: postsData, error: postsError } = await supabase
          .from('blog_posts')
          .select(`
            *,
            author:profiles(username)
          `)
          .eq('published', true)
          .order('created_at', { ascending: false })

        if (postsError) {
          console.error('Blog posts fetch error:', postsError)
          toast({
            variant: "destructive",
            title: "Error loading posts",
            description: "Failed to load blog posts. Please refresh the page."
          })
          return
        }

        if (mounted) {
          setPosts(postsData || [])
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Something went wrong. Please refresh the page."
        })
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      mounted = false
    }
  }, [supabase, toast])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading posts...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">MaltaGuns Blog</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stay informed with the latest news, expert reviews, and in-depth articles about firearms, 
            shooting sports, and the local firearms community in Malta.
          </p>
        </div>

        {/* Actions */}
        {isAuthorized && (
          <div className="flex justify-end">
            <Link href="/blog/create">
              <Button>
                <Pencil className="h-4 w-4 mr-2" />
                Write Post
              </Button>
            </Link>
          </div>
        )}

        {/* Blog Posts Grid - 3 posts per row on large screens */}
        {posts.length === 0 ? (
          <Card className="p-6 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No blog posts published yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
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
                      {format(new Date(post.created_at), 'MMM d, yyyy')} • By {post.author.username}
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
        )}
      </div>
    </div>
  )
}
