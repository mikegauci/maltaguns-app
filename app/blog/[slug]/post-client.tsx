"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Pencil } from "lucide-react"
import { format } from "date-fns"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"

interface BlogPost {
  id: string
  title: string
  content: string
  slug: string
  featured_image: string | null
  published: boolean
  created_at: string
  author_id: string
  retailer_id?: string
  author: {
    username: string
  }
  retailer?: {
    id: string
    business_name: string
    slug: string
    logo_url?: string | null
  }
}

export default function BlogPostClient({ post }: { post: BlogPost }) {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const [isAuthor, setIsAuthor] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [retailer, setRetailer] = useState<any>(null)

  useEffect(() => {
    let mounted = true

    async function checkAuthor() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          return
        }

        if (mounted) {
          setIsAuthor(session?.user?.id === post.author_id)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error checking author:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to verify author status."
        })
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    // Fetch retailer if post has retailer_id but no retailer object
    async function fetchRetailer() {
      if (post.retailer_id && !post.retailer) {
        try {
          const { data, error } = await supabase
            .from('retailers')
            .select('id, business_name, slug, logo_url')
            .eq('id', post.retailer_id)
            .single();
            
          if (error) {
            console.error('Error fetching retailer:', error);
          } else if (data && mounted) {
            setRetailer(data);
          }
        } catch (error) {
          console.error('Error in retailer fetch:', error);
        }
      } else if (post.retailer && mounted) {
        setRetailer(post.retailer);
      }
    }

    checkAuthor();
    fetchRetailer();

    return () => {
      mounted = false
    }
  }, [post.author_id, post.retailer_id, post.retailer, supabase, toast])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/blog")}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to blog
          </Button>

          {isAuthor && (
            <Button
              variant="outline"
              onClick={() => router.push(`/blog/${post.slug}/edit`)}
              className="flex items-center"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Post
            </Button>
          )}
        </div>

        <div className="bg-card rounded-lg overflow-hidden">
          <div className="p-6">
            {/* Featured Image */}
            {post.featured_image ? (
              <div className="aspect-video relative overflow-hidden rounded-lg bg-muted mb-6">
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : null}

            {/* Post Header */}
            <div className="space-y-2 mb-6">
              <h1 className="text-3xl font-bold">{post.title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>By {post.author.username}</span>
                <span>•</span>
                <span>{format(new Date(post.created_at), 'MMMM d, yyyy')}</span>
                
                {/* Retailer info if available */}
                {(retailer || post.retailer) && (
                  <>
                    <span>•</span>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-muted-foreground hover:text-primary"
                      onClick={() => router.push(`/retailers/${(retailer || post.retailer).slug}`)}
                    >
                      Posted by {(retailer || post.retailer).business_name}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Post Content */}
            <div 
              className="prose prose-neutral dark:prose-invert max-w-none prose-a:text-red-600 prose-a:hover:text-red-800"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}